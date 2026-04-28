/**
 * ingest-aav-mapping.ts
 * Mise à jour du champ aav_code sur la table communes depuis la correspondance
 * commune × AAV 2020 publiée par l'INSEE.
 *
 * Source : https://www.insee.fr/fr/information/4803954
 * Fichier : AAV2020_au_01-01-2023.zip → AAV2020_au_01-01-2023.csv
 * Format CSV (séparateur ,) :
 *   CODGEO  : code INSEE commune (5 car.)
 *   AAV2020 : code AAV 2020 (3 car., ex "001" = Paris, "n/a" = hors AAV)
 *   CATEAAV2020 : catégorie (11=pôle, 12=couronne, 21=autre, n/a=hors AAV)
 *
 * Usage :
 *   npm run ingest:aav
 *   LOCAL_AAV_PATH=/tmp/aav2020.zip npm run ingest:aav
 *   LOCAL_AAV_PATH=/tmp/aav2020.csv npm run ingest:aav
 */

import { PrismaClient } from '@prisma/client';
import { createInterface } from 'readline';
import { createInflateRaw } from 'zlib';
import { Readable } from 'stream';
import { readFileSync, existsSync } from 'fs';

const prisma = new PrismaClient();

// URL officielle INSEE — COG 2023, composition AAV 2020
const INSEE_AAV_URL =
  'https://www.insee.fr/fr/statistiques/fichier/4803954/AAV2020_au_01-01-2023.zip';

const LOCAL_PATH = process.env['LOCAL_AAV_PATH'] ?? null;
const BATCH_SIZE = 1_000;

// ─── Acquisition ─────────────────────────────────────────────────────────────

async function acquireFile(): Promise<{ buf: Buffer; isZip: boolean; source: string }> {
  if (LOCAL_PATH) {
    if (!existsSync(LOCAL_PATH)) throw new Error(`LOCAL_AAV_PATH="${LOCAL_PATH}" introuvable.`);
    const buf = readFileSync(LOCAL_PATH);
    const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
    console.log(`  → Fichier local : ${LOCAL_PATH} (${(buf.length / 1024).toFixed(0)} KB)`);
    return { buf, isZip, source: LOCAL_PATH };
  }

  console.log(`  → Téléchargement INSEE : ${INSEE_AAV_URL}`);
  const res = await fetch(INSEE_AAV_URL, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`  → OK (${(buf.length / 1024).toFixed(0)} KB)`);
  return { buf, isZip: true, source: INSEE_AAV_URL };
}

// ─── Extraction ZIP ───────────────────────────────────────────────────────────

async function extractCsvFromZip(buf: Buffer): Promise<Readable> {
  let eocdPos = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdPos = i; break; }
  }
  if (eocdPos === -1) throw new Error('EOCD ZIP introuvable');

  const cdOffset = buf.readUInt32LE(eocdPos + 16);
  const cdSize   = buf.readUInt32LE(eocdPos + 12);
  let pos = cdOffset;

  let bestEntry: { method: number; start: number; size: number; name: string } | null = null;

  while (pos + 46 <= cdOffset + cdSize) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break;
    const method      = buf.readUInt16LE(pos + 10);
    const compSz      = buf.readUInt32LE(pos + 20);
    const fnLen       = buf.readUInt16LE(pos + 28);
    const exLen       = buf.readUInt16LE(pos + 30);
    const comLen      = buf.readUInt16LE(pos + 32);
    const localOff    = buf.readUInt32LE(pos + 42);
    const name        = buf.toString('utf8', pos + 46, pos + 46 + fnLen);
    pos += 46 + fnLen + exLen + comLen;

    if (!name.toLowerCase().endsWith('.csv') || name.includes('__MACOSX')) continue;

    const lfn = buf.readUInt16LE(localOff + 26);
    const lex = buf.readUInt16LE(localOff + 28);
    bestEntry = { method, start: localOff + 30 + lfn + lex, size: compSz, name };
  }

  if (!bestEntry) throw new Error('Aucun CSV dans le ZIP');
  console.log(`  → Fichier extrait : ${bestEntry.name}`);

  const compressed = buf.subarray(bestEntry.start, bestEntry.start + bestEntry.size);

  if (bestEntry.method === 0) return Readable.from(compressed);

  return new Promise((resolve, reject) => {
    const inflate = createInflateRaw();
    const chunks: Buffer[] = [];
    inflate.on('data', (c: Buffer) => chunks.push(c));
    inflate.on('end',  () => resolve(Readable.from(Buffer.concat(chunks))));
    inflate.on('error', reject);
    inflate.write(compressed);
    inflate.end();
  });
}

// ─── Parsing CSV ──────────────────────────────────────────────────────────────

interface AavRow {
  code_commune: string;
  aav_code:     string;  // null (hors AAV) → on ne met rien
}

async function parseCsv(stream: Readable): Promise<AavRow[]> {
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  const rows: AavRow[] = [];
  let headers: string[] = [];
  let lineCount = 0;
  let codgeoIdx = -1, aavIdx = -1;

  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) {
      // Auto-detect separator
      const sep = line.includes(';') ? ';' : ',';
      headers = line.split(sep).map(h => h.trim().replace(/^"|"$/g, '').toUpperCase());
      codgeoIdx = headers.findIndex(h => ['CODGEO', 'COM', 'CODE_COM', 'CODE'].includes(h));
      aavIdx    = headers.findIndex(h => ['AAV2020', 'AAV', 'CODE_AAV'].includes(h));
      if (codgeoIdx === -1 || aavIdx === -1) {
        throw new Error(`Colonnes CODGEO/AAV2020 non trouvées. Disponibles : ${headers.join(', ')}`);
      }
      console.log(`  → Colonnes : CODGEO=${headers[codgeoIdx]}, AAV=${headers[aavIdx]}`);
      continue;
    }

    const sep = line.includes(';') ? ';' : ',';
    const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length <= Math.max(codgeoIdx, aavIdx)) continue;

    const codgeo = cols[codgeoIdx];
    const aav    = cols[aavIdx];

    if (codgeo.length !== 5) continue;
    if (!aav || aav === 'n/a' || aav === 'NA' || aav === '') continue; // hors AAV

    // Code AAV : peut arriver comme "1" → "001"
    const aavCode = aav.length < 3 ? aav.padStart(3, '0') : aav;
    rows.push({ code_commune: codgeo, aav_code: aavCode });
  }

  console.log(`  → ${lineCount} lignes lues, ${rows.length} communes avec AAV`);
  return rows;
}

// ─── Mise à jour en base ──────────────────────────────────────────────────────

async function updateBatch(rows: AavRow[]): Promise<{ updated: number; errors: string[] }> {
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    try {
      const result = await prisma.$executeRaw`
        UPDATE immo_score.communes AS c
        SET aav_code   = t.aav_code,
            updated_at = NOW()
        FROM UNNEST(
          ${batch.map(r => r.code_commune)}::text[],
          ${batch.map(r => r.aav_code)}::text[]
        ) AS t(code_commune, aav_code)
        WHERE c.code_insee = t.code_commune
      `;
      updated += Number(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Batch ${i}–${i + batch.length} : ${msg}`);
    }

    if ((i / BATCH_SIZE) % 20 === 0 && i > 0) {
      process.stdout.write(`  → ${updated} communes mises à jour...\r`);
    }
  }

  return { updated, errors };
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const t0 = Date.now();
  console.log('=== INSEE AAV 2020 — mapping communes → AAV ===');

  // 1. Acquisition
  console.log('\n[1/3] Acquisition...');
  const { buf, isZip } = await acquireFile();

  // 2. Parsing
  console.log(`\n[2/3] ${isZip ? 'Extraction ZIP + parsing...' : 'Parsing CSV...'}`);
  const stream = isZip ? await extractCsvFromZip(buf) : Readable.from(buf);
  const rows   = await parseCsv(stream);

  if (rows.length === 0) {
    console.error('  ✗ Aucune ligne valide.');
    process.exit(1);
  }

  // 3. Update
  console.log(`\n[3/3] Mise à jour de ${rows.length} communes...`);
  const { updated, errors } = await updateBatch(rows);

  // Couverture finale
  const stats = await prisma.$queryRaw<[{ total: string; with_aav: string }]>`
    SELECT COUNT(*)::text AS total,
           COUNT(aav_code)::text AS with_aav
    FROM immo_score.communes
  `;
  const { total, with_aav } = stats[0];
  const pct = parseInt(total) > 0 ? ((parseInt(with_aav) / parseInt(total)) * 100).toFixed(1) : '0';

  console.log('\n=== Résultat ===');
  console.log(`  Communes mises à jour : ${updated}`);
  console.log(`  Couverture AAV        : ${with_aav} / ${total} communes (${pct}%)`);
  console.log(`  Erreurs               : ${errors.length}`);
  console.log(`  Durée                 : ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  if (errors.length > 0) {
    errors.slice(0, 3).forEach(e => console.error(`  - ${e}`));
  }
}

main()
  .catch(err => { console.error('ERREUR FATALE :', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
