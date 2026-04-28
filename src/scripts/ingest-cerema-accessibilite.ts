/**
 * ingest-cerema-accessibilite.ts
 * Ingestion de l'accessibilité financière au niveau AAV — Cerema DV3F.
 *
 * Source : https://www.data.cerema.fr/
 * Fichier : dv3f_accessibilite_aav_2020_2022.xlsx
 * Contenu : Median Multiple moyen par AAV (Aire d'Attraction des Villes 2020)
 *
 * Colonnes attendues dans le fichier Excel (ajuster si nécessaire) :
 *   CODGEO_AAV  ou  code_aav    → code AAV INSEE (ex: "001" → Paris = "001")
 *   LIBAAV2020  ou  lib_aav     → libellé de l'AAV
 *   MM_MOY      ou  mm_aav      → Median Multiple moyen (prix_médian / revenu_médian)
 *   PRIX_M2_MED ou  prix_m2_med → Prix m² médian des transactions de l'AAV (optionnel)
 *
 * Variables d'environnement :
 *   LOCAL_CEREMA_PATH=/tmp/cerema-aav.xlsx   → fichier local (prioritaire)
 *   CEREMA_XLSX_URL=https://...              → URL de téléchargement (optionnel)
 *
 * Usage :
 *   npm run ingest:cerema
 *   LOCAL_CEREMA_PATH=/tmp/cerema-aav.xlsx npm run ingest:cerema
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';

const prisma = new PrismaClient();

// ─── Nom de colonnes à tenter (fallbacks par ordre) ──────────────────────────

const CODE_COLS  = ['CODGEO_AAV', 'code_aav', 'AAV2020', 'aav_code', 'COD_AAV'];
const LIB_COLS   = ['LIBAAV2020', 'lib_aav', 'LIB_AAV', 'LIBAAV', 'libelle_aav'];
const MM_COLS    = ['MM_MOY', 'mm_aav', 'MEDIAN_MULTIPLE', 'median_multiple', 'MM'];
const PRIX_COLS  = ['PRIX_M2_MED', 'prix_m2_median', 'PRIX_MED_M2', 'prix_m2_med'];

// URL par défaut (à confirmer avec Benoît une fois le fichier localisé sur data.cerema.fr)
const DEFAULT_URL = process.env['CEREMA_XLSX_URL']
  ?? 'https://www.data.cerema.fr/geonetwork/srv/api/records/dv3f-accessibilite/attachments/dv3f_accessibilite_aav_2020_2022.xlsx';

const LOCAL_PATH = process.env['LOCAL_CEREMA_PATH'] ?? null;
const BATCH_SIZE = 200;
const ANNEE_CIBLE = 2022;

// ─── Types ───────────────────────────────────────────────────────────────────

interface CeremaRow {
  aav_code: string;
  lib_aav:  string | null;
  mm_aav:   number;
  prix_m2:  number | null;
}

// ─── Acquisition ─────────────────────────────────────────────────────────────

async function acquireFile(): Promise<Buffer> {
  if (LOCAL_PATH) {
    if (!existsSync(LOCAL_PATH)) {
      throw new Error(
        `LOCAL_CEREMA_PATH="${LOCAL_PATH}" introuvable.\n` +
        `Télécharger le fichier et le placer à cet emplacement.`,
      );
    }
    const buf = readFileSync(LOCAL_PATH);
    console.log(`  → Fichier local : ${LOCAL_PATH} (${(buf.length / 1024).toFixed(0)} KB)`);
    return buf;
  }

  console.log(`  → Téléchargement depuis : ${DEFAULT_URL}`);
  const res = await fetch(DEFAULT_URL, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText}\n\n` +
      `Si le fichier n'est pas accessible publiquement, le télécharger manuellement\n` +
      `et lancer : LOCAL_CEREMA_PATH=/tmp/cerema-aav.xlsx npm run ingest:cerema`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) {
    throw new Error(`Réponse trop courte (${buf.length} octets) — vérifier l'URL.`);
  }
  console.log(`  → Téléchargé : ${(buf.length / 1024).toFixed(0)} KB`);
  return buf;
}

// ─── Parsing XLSX (sans dépendance externe — Office Open XML = ZIP+XML) ──────

interface SheetRow { [key: string]: string | number | null }

/**
 * Parser XLSX minimal : extrait la première feuille en tableau de lignes.
 * Utilise uniquement Node.js natif (pas de dépendance xlsx/exceljs).
 * Fonctionne pour les fichiers XLSX standards (format OpenXML).
 */
async function parseXlsx(buf: Buffer): Promise<SheetRow[]> {
  // Vérifier magic bytes ZIP
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
    throw new Error('Le fichier ne semble pas être un XLSX valide (magic bytes ZIP attendus).');
  }

  // Extraire les fichiers XML du ZIP en mémoire
  const files = await extractZipFiles(buf);

  // Charger shared strings
  const sharedStrings = parseSharedStrings(files['xl/sharedStrings.xml'] ?? '');

  // Trouver la première feuille
  const workbookXml = files['xl/workbook.xml'] ?? '';
  const sheetMatch = workbookXml.match(/<sheet[^>]+r:id="(rId\d+)"[^>]*\/>/);
  const rId = sheetMatch?.[1] ?? 'rId1';

  // Résoudre le nom de fichier via les relations
  const relsXml = files['xl/_rels/workbook.xml.rels'] ?? '';
  const relMatch = new RegExp(`Id="${rId}"[^>]+Target="([^"]+)"`).exec(relsXml);
  const sheetPath = 'xl/' + (relMatch?.[1]?.replace(/^\/xl\//, '') ?? 'worksheets/sheet1.xml');

  const sheetXml = files[sheetPath] ?? files['xl/worksheets/sheet1.xml'] ?? '';
  if (!sheetXml) {
    throw new Error(`Feuille introuvable dans le XLSX (cherché : ${sheetPath})`);
  }

  return parseSheetXml(sheetXml, sharedStrings);
}

/** Extrait tous les fichiers d'un ZIP en mémoire (Map nom → contenu string). */
async function extractZipFiles(buf: Buffer): Promise<Record<string, string>> {
  const { createInflateRaw } = await import('zlib');

  const files: Record<string, string> = {};

  // Parcourir le Central Directory
  let eocdPos = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdPos = i; break; }
  }
  if (eocdPos === -1) throw new Error('EOCD ZIP introuvable');

  const cdOffset = buf.readUInt32LE(eocdPos + 16);
  const cdSize   = buf.readUInt32LE(eocdPos + 12);
  let   pos      = cdOffset;

  while (pos + 46 <= cdOffset + cdSize) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break;
    const method       = buf.readUInt16LE(pos + 10);
    const compressedSz = buf.readUInt32LE(pos + 20);
    const filenameLen  = buf.readUInt16LE(pos + 28);
    const extraLen     = buf.readUInt16LE(pos + 30);
    const commentLen   = buf.readUInt16LE(pos + 32);
    const localOffset  = buf.readUInt32LE(pos + 42);
    const filename     = buf.toString('utf8', pos + 46, pos + 46 + filenameLen);

    pos += 46 + filenameLen + extraLen + commentLen;

    // N'extraire que les XML utiles
    if (!filename.match(/\.(xml|rels)$/i) || filename.includes('__MACOSX')) continue;

    const lfnLen    = buf.readUInt16LE(localOffset + 26);
    const lexLen    = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lfnLen + lexLen;
    const compressed = buf.subarray(dataStart, dataStart + compressedSz);

    if (method === 0) {
      files[filename] = compressed.toString('utf8');
    } else if (method === 8) {
      // Deflate
      files[filename] = await new Promise((resolve, reject) => {
        const inflate = createInflateRaw();
        const chunks: Buffer[] = [];
        inflate.on('data', (c: Buffer) => chunks.push(c));
        inflate.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        inflate.on('error', reject);
        inflate.write(compressed);
        inflate.end();
      });
    }
  }

  return files;
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const pattern = /<si>[\s\S]*?<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(xml)) !== null) {
    const text = m[0].replace(/<[^>]+>/g, '').trim();
    strings.push(text);
  }
  return strings;
}

function parseSheetXml(xml: string, sharedStrings: string[]): SheetRow[] {
  const rows: SheetRow[] = [];
  let headers: string[] = [];

  const rowPattern = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(xml)) !== null) {
    const rowXml = rowMatch[1];
    const cells: Array<{ col: number; value: string | number | null }> = [];

    const cellPattern = /<c\s[^>]*r="([A-Z]+)(\d+)"[^>]*(?:\s+t="([^"]*)")?[^>]*>([\s\S]*?)<\/c>/g;
    let cMatch: RegExpExecArray | null;

    while ((cMatch = cellPattern.exec(rowXml)) !== null) {
      const colLetters = cMatch[1];
      const cellType   = cMatch[3] ?? '';
      const cellInner  = cMatch[4];
      const colNum     = colLettersToNum(colLetters);

      const vMatch = cellInner.match(/<v>([^<]*)<\/v>/);
      const rawVal = vMatch?.[1] ?? null;

      let value: string | number | null = null;
      if (rawVal !== null) {
        if (cellType === 's') {
          value = sharedStrings[parseInt(rawVal)] ?? '';
        } else if (cellType === 'str') {
          value = rawVal;
        } else {
          const n = parseFloat(rawVal);
          value = isNaN(n) ? rawVal : n;
        }
      }
      cells.push({ col: colNum, value });
    }

    if (cells.length === 0) continue;

    if (headers.length === 0) {
      // Première ligne = en-têtes
      const maxCol = Math.max(...cells.map(c => c.col));
      headers = new Array(maxCol + 1).fill('');
      for (const c of cells) headers[c.col] = String(c.value ?? '').trim();
    } else {
      const row: SheetRow = {};
      for (const c of cells) {
        if (headers[c.col]) row[headers[c.col]] = c.value;
      }
      if (Object.keys(row).length > 0) rows.push(row);
    }
  }

  return rows;
}

function colLettersToNum(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1; // 0-indexed
}

// ─── Transformation ───────────────────────────────────────────────────────────

function findCol(row: SheetRow, candidates: string[]): string | null {
  for (const c of candidates) {
    if (row[c] !== undefined) return c;
  }
  return null;
}

function transformRows(rawRows: SheetRow[]): CeremaRow[] {
  if (rawRows.length === 0) throw new Error('Aucune ligne dans le fichier Excel.');

  // Déterminer les colonnes depuis la première ligne de données
  const sample = rawRows[0];
  const codeCol  = findCol(sample, CODE_COLS);
  const libCol   = findCol(sample, LIB_COLS);
  const mmCol    = findCol(sample, MM_COLS);
  const prixCol  = findCol(sample, PRIX_COLS);

  if (!codeCol) throw new Error(`Colonne code AAV non trouvée. Colonnes disponibles : ${Object.keys(sample).join(', ')}`);
  if (!mmCol)   throw new Error(`Colonne Median Multiple non trouvée. Colonnes disponibles : ${Object.keys(sample).join(', ')}`);

  console.log(`  → Colonnes détectées : code=${codeCol}, lib=${libCol ?? 'n/a'}, mm=${mmCol}, prix=${prixCol ?? 'n/a'}`);

  const result: CeremaRow[] = [];
  let skipped = 0;

  for (const row of rawRows) {
    const codeRaw = String(row[codeCol] ?? '').trim();
    if (!codeRaw || codeRaw === codeCol) { skipped++; continue; }

    // Le code AAV est parfois numérique (ex: 1 → "001")
    const aavCode = codeRaw.padStart(3, '0');

    const mmRaw = row[mmCol];
    const mm = typeof mmRaw === 'number' ? mmRaw : parseFloat(String(mmRaw ?? '').replace(',', '.'));
    if (isNaN(mm) || mm <= 0 || mm > 50) { skipped++; continue; }

    const libRaw  = libCol ? String(row[libCol] ?? '').trim() || null : null;
    const prixRaw = prixCol ? row[prixCol] : null;
    const prix    = prixRaw != null
      ? (typeof prixRaw === 'number' ? prixRaw : parseFloat(String(prixRaw).replace(',', '.')))
      : null;

    result.push({
      aav_code: aavCode,
      lib_aav:  libRaw,
      mm_aav:   Math.round(mm * 100) / 100,
      prix_m2:  prix != null && !isNaN(prix) && prix > 0 ? Math.round(prix) : null,
    });
  }

  console.log(`  → ${result.length} AAV valides, ${skipped} lignes ignorées`);
  return result;
}

// ─── Upsert ───────────────────────────────────────────────────────────────────

async function upsertBatch(rows: CeremaRow[]): Promise<{ updated: number; errors: string[] }> {
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    try {
      await prisma.$executeRaw`
        INSERT INTO immo_score.cerema_accessibilite
          (id, aav_code, lib_aav, mm_aav, prix_m2_median, annee, updated_at)
        SELECT
          gen_random_uuid()::text,
          t.aav_code, t.lib_aav, t.mm_aav, t.prix_m2_median,
          ${ANNEE_CIBLE}::int,
          NOW()
        FROM UNNEST(
          ${batch.map(r => r.aav_code)}::text[],
          ${batch.map(r => r.lib_aav)}::text[],
          ${batch.map(r => r.mm_aav)}::float8[],
          ${batch.map(r => r.prix_m2)}::float8[]
        ) AS t(aav_code, lib_aav, mm_aav, prix_m2_median)
        ON CONFLICT (aav_code) DO UPDATE
          SET lib_aav        = EXCLUDED.lib_aav,
              mm_aav         = EXCLUDED.mm_aav,
              prix_m2_median = EXCLUDED.prix_m2_median,
              annee          = EXCLUDED.annee,
              updated_at     = NOW()
      `;
      updated += batch.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Batch ${i}–${i + batch.length} : ${msg}`);
    }
  }

  return { updated, errors };
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const t0 = Date.now();
  console.log('=== Cerema DV3F Accessibilité AAV — ingestion ===');

  // 1. Acquisition
  console.log('\n[1/3] Acquisition du fichier XLSX...');
  const buf = await acquireFile();

  // 2. Parsing
  console.log('\n[2/3] Parsing XLSX...');
  const rawRows = await parseXlsx(buf);
  console.log(`  → ${rawRows.length} lignes brutes lues`);

  const rows = transformRows(rawRows);
  if (rows.length === 0) {
    console.error('  ✗ Aucune ligne valide. Vérifier le format du fichier.');
    process.exit(1);
  }

  // 3. Upsert
  console.log(`\n[3/3] Upsert de ${rows.length} AAV...`);
  const { updated, errors } = await upsertBatch(rows);

  const total = await prisma.$queryRaw<[{ cnt: string }]>`
    SELECT COUNT(*)::text AS cnt FROM immo_score.cerema_accessibilite
  `;

  console.log('\n=== Résultat ===');
  console.log(`  AAV upsertées  : ${updated}`);
  console.log(`  Total en base  : ${total[0].cnt}`);
  console.log(`  Erreurs        : ${errors.length}`);
  console.log(`  Durée          : ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  if (errors.length > 0) {
    console.error('\n  Détail erreurs :');
    errors.slice(0, 3).forEach(e => console.error(`  - ${e}`));
  }
}

main()
  .catch(err => { console.error('ERREUR FATALE :', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
