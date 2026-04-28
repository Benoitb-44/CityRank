/**
 * compute-accessibilite.ts — Sprint 4-A
 *
 * Calcul batch du score d'accessibilité financière (0-100) pour toutes les communes.
 *
 * Algorithme en 3 passes :
 *
 *   Passe 1 — calcul propre (données DVF + Filosofi propres à la commune) :
 *     MM = commune.prix_tx_median3y / (filosofi_communes.median_uc × 1.5)
 *     imputed = false
 *
 *   Passe 2 — fallback Cerema AAV :
 *     Si commune.aav_code ∈ cerema_accessibilite →
 *       MM = cerema.mm_aav, imputed = true, method = 'cerema_aav'
 *
 *   Passe 3 — médiane régionale puis nationale :
 *     Communes encore sans MM → médiane régionale calculée depuis passe 1
 *     Fallback ultime : médiane nationale
 *     imputed = true, method = 'regional_median' | 'national_median'
 *
 * Scoring (paliers Demographia) :
 *   MM ≤ 3.0                  : score = 100
 *   MM 3.0–4.0  (modéré)      : score = 100 → 75  (interpolation linéaire)
 *   MM 4.0–5.0  (sérieux)     : score = 75  → 50
 *   MM 5.0–6.0  (sévère)      : score = 50  → 25
 *   MM 6.0–10.0 (inaccessible): score = 25  → 0
 *   MM > 10.0                 : score = 0
 *   Floor = 10 (évite annihilation géométrique)
 *
 * Flags CLI :
 *   --test            10 premières communes (dev)
 *   --witnesses       Communes témoins (Paris/Lyon/Rennes/…)
 *   --depts=33,69     Départements ciblés
 *   --dry-run         Calcule mais n'écrit pas en base
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

const TEST_MODE    = process.argv.includes('--test');
const WITNESSES_MODE = process.argv.includes('--witnesses');
const DRY_RUN      = process.argv.includes('--dry-run');
const DEPTS_ARG    = process.argv.find(a => a.startsWith('--depts='));
const FILTER_DEPTS = DEPTS_ARG ? DEPTS_ARG.replace('--depts=', '').split(',').map(d => d.trim()) : null;

// 10 communes témoins spec Sprint 4-A
const WITNESS_COMMUNES: Record<string, { name: string; expected_mm: number; expected_score_min: number; expected_score_max: number }> = {
  '19272': { name: 'Tulle',        expected_mm: 3.5, expected_score_min: 80, expected_score_max: 95 },
  '72181': { name: 'Le Mans',      expected_mm: 4.5, expected_score_min: 60, expected_score_max: 75 },
  '35238': { name: 'Rennes',       expected_mm: 6.5, expected_score_min: 38, expected_score_max: 53 },
  '24322': { name: 'Sarlat',       expected_mm: 5.0, expected_score_min: 48, expected_score_max: 58 },
  '33063': { name: 'Bordeaux',     expected_mm: 7.5, expected_score_min: 23, expected_score_max: 38 },
  '69123': { name: 'Lyon',         expected_mm: 7.5, expected_score_min: 23, expected_score_max: 38 },
  '75056': { name: 'Paris',        expected_mm: 10,  expected_score_min: 10, expected_score_max: 15 },
  '08392': { name: 'Saint-Juvin',  expected_mm: 2.5, expected_score_min: 87, expected_score_max: 97 },
  '03310': { name: 'Vichy',        expected_mm: 4.0, expected_score_min: 68, expected_score_max: 82 },
  '83069': { name: 'Hyères',       expected_mm: 7.5, expected_score_min: 23, expected_score_max: 38 },
};

// ─── Scoring Demographia (paliers linéaires) ──────────────────────────────────

const FLOOR_SCORE = 10;

/**
 * Convertit un Median Multiple en score 0-100 selon les paliers Demographia.
 * Floor à 10 pour éviter l'annihilation géométrique dans un futur score global.
 */
function mmToScore(mm: number): number {
  let raw: number;
  if      (mm <= 3.0)  raw = 100;
  else if (mm <= 4.0)  raw = 100 - ((mm - 3.0) / 1.0) * 25; // 100 → 75
  else if (mm <= 5.0)  raw = 75  - ((mm - 4.0) / 1.0) * 25; // 75  → 50
  else if (mm <= 6.0)  raw = 50  - ((mm - 5.0) / 1.0) * 25; // 50  → 25
  else if (mm <= 10.0) raw = 25  - ((mm - 6.0) / 4.0) * 25; // 25  → 0
  else                 raw = 0;

  return Math.max(FLOOR_SCORE, Math.round(raw * 10) / 10);
}

// ─── Pré-chargement données agrégées ─────────────────────────────────────────

interface CommuneData {
  code_insee:       string;
  region:           string;
  prix_tx_median3y: number | null;
  aav_code:         string | null;
  median_uc:        number | null;
}

interface CeremaData {
  mm_aav: number;
}

async function loadAllData(): Promise<{
  communes:       Map<string, CommuneData>;
  ceremaByAav:    Map<string, CeremaData>;
}> {
  console.log('[compute-accessibilite] Chargement des données...');

  // Communes avec prix_tx + aav_code
  const communeRows = await prisma.$queryRaw<Array<{
    code_insee: string;
    region: string;
    prix_tx_median3y: string | null;
    aav_code: string | null;
  }>>`
    SELECT code_insee, region,
           prix_tx_median3y::text,
           aav_code
    FROM immo_score.communes
    ORDER BY code_insee
  `;

  // Revenus médians Filosofi v4
  const filosofiRows = await prisma.$queryRaw<Array<{
    commune_id: string;
    median_uc: string;
  }>>`
    SELECT commune_id, median_uc::text
    FROM immo_score.filosofi_communes
  `;
  const filosofiMap = new Map<string, number>();
  for (const r of filosofiRows) {
    const v = parseFloat(r.median_uc);
    if (!isNaN(v) && v > 0) filosofiMap.set(r.commune_id, v);
  }

  // Cerema AAV
  const ceremaRows = await prisma.$queryRaw<Array<{
    aav_code: string;
    mm_aav: string;
  }>>`
    SELECT aav_code, mm_aav::text
    FROM immo_score.cerema_accessibilite
  `;
  const ceremaByAav = new Map<string, CeremaData>();
  for (const r of ceremaRows) {
    const mm = parseFloat(r.mm_aav);
    if (!isNaN(mm) && mm > 0) ceremaByAav.set(r.aav_code, { mm_aav: mm });
  }

  const communes = new Map<string, CommuneData>();
  for (const r of communeRows) {
    const prix = r.prix_tx_median3y ? parseFloat(r.prix_tx_median3y) : null;
    communes.set(r.code_insee, {
      code_insee:       r.code_insee,
      region:           r.region,
      prix_tx_median3y: prix && prix > 0 ? prix : null,
      aav_code:         r.aav_code,
      median_uc:        filosofiMap.get(r.code_insee) ?? null,
    });
  }

  console.log(
    `[compute-accessibilite] Communes : ${communes.size} | ` +
    `Filosofi v4 : ${filosofiMap.size} | Cerema AAV : ${ceremaByAav.size}`,
  );

  return { communes, ceremaByAav };
}

// ─── Médianes régionales (pour passe 3) ──────────────────────────────────────

interface ComputedScore {
  code_insee:   string;
  mm:           number;
  score:        number;
  imputed:      boolean;
  method:       string;
  aav_code_used?: string;
}

function computeRegionalMedians(passe1Results: ComputedScore[]): Map<string, number> {
  const byRegion = new Map<string, number[]>();

  for (const r of passe1Results) {
    if (!r.imputed) {
      // Récupérer la région n'est pas dans ComputedScore directement,
      // on la recompose depuis le code_insee (2 premiers chars = dept → région)
      // Pour l'instant on utilise le code département comme proxy région
      const dept = r.code_insee.substring(0, 2);
      const arr = byRegion.get(dept) ?? [];
      arr.push(r.mm);
      byRegion.set(dept, arr);
    }
  }

  const medians = new Map<string, number>();
  for (const [dept, mms] of byRegion) {
    mms.sort((a, b) => a - b);
    medians.set(dept, mms[Math.floor(mms.length / 2)]);
  }
  return medians;
}

// ─── Calcul principal ────────────────────────────────────────────────────────

function computeScore(
  commune: CommuneData,
  ceremaByAav: Map<string, CeremaData>,
  deptMedians: Map<string, number>,
  nationalMedian: number,
): ComputedScore {
  const { code_insee, prix_tx_median3y, median_uc, aav_code } = commune;

  // ─ Passe 1 : données propres
  if (prix_tx_median3y != null && median_uc != null && median_uc > 0) {
    const mm = Math.round((prix_tx_median3y / (median_uc * 1.5)) * 100) / 100;
    return { code_insee, mm, score: mmToScore(mm), imputed: false, method: 'own_data' };
  }

  // ─ Passe 2 : Cerema AAV
  if (aav_code) {
    const cerema = ceremaByAav.get(aav_code);
    if (cerema) {
      return {
        code_insee, mm: cerema.mm_aav, score: mmToScore(cerema.mm_aav),
        imputed: true, method: 'cerema_aav', aav_code_used: aav_code,
      };
    }
  }

  // ─ Passe 3 : médiane départementale
  const dept = code_insee.substring(0, 2);
  const deptMed = deptMedians.get(dept);
  if (deptMed != null) {
    return { code_insee, mm: deptMed, score: mmToScore(deptMed), imputed: true, method: 'regional_median' };
  }

  // ─ Passe 3 : médiane nationale (fallback ultime)
  return { code_insee, mm: nationalMedian, score: mmToScore(nationalMedian), imputed: true, method: 'national_median' };
}

// ─── Upsert batch ─────────────────────────────────────────────────────────────

async function upsertScores(scores: ComputedScore[]): Promise<{ updated: number; errors: string[] }> {
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < scores.length; i += BATCH_SIZE) {
    const batch = scores.slice(i, i + BATCH_SIZE);
    try {
      await prisma.$executeRaw`
        INSERT INTO immo_score.score_communes
          (id, commune_id, version, score_accessibilite_fin, median_multiple,
           accessibilite_imputed, imputation_methods, computed_at, updated_at)
        SELECT
          gen_random_uuid()::text,
          t.commune_id, 4::int,
          t.score, t.mm,
          t.imputed, t.methods::jsonb,
          NOW(), NOW()
        FROM UNNEST(
          ${batch.map(r => r.code_insee)}::text[],
          ${batch.map(r => r.score)}::float8[],
          ${batch.map(r => r.mm)}::float8[],
          ${batch.map(r => r.imputed)}::boolean[],
          ${batch.map(r => JSON.stringify({
            method: r.method,
            ...(r.aav_code_used ? { aav_code: r.aav_code_used } : {}),
          }))}::text[]
        ) AS t(commune_id, score, mm, imputed, methods)
        ON CONFLICT (commune_id) DO UPDATE
          SET score_accessibilite_fin = EXCLUDED.score_accessibilite_fin,
              median_multiple         = EXCLUDED.median_multiple,
              accessibilite_imputed   = EXCLUDED.accessibilite_imputed,
              imputation_methods      = EXCLUDED.imputation_methods,
              version                 = EXCLUDED.version,
              computed_at             = NOW(),
              updated_at              = NOW()
      `;
      updated += batch.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Batch ${i}–${i + batch.length} : ${msg}`);
    }
  }

  return { updated, errors };
}

// ─── Validation witnesses ─────────────────────────────────────────────────────

function validateWitnesses(scores: Map<string, ComputedScore>): void {
  console.log('\n[compute-accessibilite] ═══ Validation witnesses ═══');
  let ok = 0, fail = 0;

  for (const [code, expected] of Object.entries(WITNESS_COMMUNES)) {
    const result = scores.get(code);
    if (!result) {
      console.log(`  ✗ ${expected.name.padEnd(16)} (${code}) — ABSENT`);
      fail++;
      continue;
    }

    const inRange = result.score >= expected.expected_score_min && result.score <= expected.expected_score_max;
    const icon = inRange ? '✓' : '✗';
    const range = `[${expected.expected_score_min}–${expected.expected_score_max}]`;

    console.log(
      `  ${icon} ${expected.name.padEnd(16)} | MM=${String(result.mm.toFixed(2)).padStart(5)} ` +
      `| score=${String(result.score.toFixed(1)).padStart(5)} ${range} ` +
      `| ${result.imputed ? `IMPUTED(${result.method})` : 'propre'}`,
    );

    if (inRange) ok++; else fail++;
  }

  const total = Object.keys(WITNESS_COMMUNES).length;
  console.log(`\n  Résultat witnesses : ${ok}/${total} OK (seuil 8/${total})`);
  if (ok < 8) {
    console.warn(`  ⚠  Moins de 8/${total} witnesses dans la tolérance — vérifier l'algorithme.`);
  }
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const t0 = Date.now();
  console.log('=== compute-accessibilite.ts — Sprint 4-A ===');
  if (TEST_MODE)      console.log('MODE TEST');
  if (WITNESSES_MODE) console.log('MODE WITNESSES');
  if (DRY_RUN)        console.log('MODE DRY-RUN (pas d\'écriture en base)');
  if (FILTER_DEPTS)   console.log(`Filtrage départements : ${FILTER_DEPTS.join(', ')}`);

  // 1. Charger toutes les données en mémoire
  const { communes, ceremaByAav } = await loadAllData();

  // 2. Sélection des communes à traiter
  let communeList = [...communes.values()];

  if (TEST_MODE) {
    communeList = communeList.slice(0, 10);
  } else if (WITNESSES_MODE) {
    const witnessCodes = Object.keys(WITNESS_COMMUNES);
    communeList = communeList.filter(c => witnessCodes.includes(c.code_insee));
  } else if (FILTER_DEPTS) {
    communeList = communeList.filter(c =>
      FILTER_DEPTS.some(d => c.code_insee.startsWith(d)),
    );
  }

  console.log(`\n[compute-accessibilite] ${communeList.length} communes à traiter`);

  // 3. Passe 1 — calcul propre (pour dériver les médianes régionales)
  const passe1: ComputedScore[] = [];
  for (const c of communeList) {
    if (c.prix_tx_median3y != null && c.median_uc != null && c.median_uc > 0) {
      const mm = Math.round((c.prix_tx_median3y / (c.median_uc * 1.5)) * 100) / 100;
      passe1.push({ code_insee: c.code_insee, mm, score: mmToScore(mm), imputed: false, method: 'own_data' });
    }
  }
  console.log(`[compute-accessibilite] Passe 1 : ${passe1.length} communes avec données propres`);

  // Médianes par département (proxy région)
  const deptMedians = computeRegionalMedians(passe1);
  const allMms = passe1.map(r => r.mm).sort((a, b) => a - b);
  const nationalMedian = allMms.length > 0 ? allMms[Math.floor(allMms.length / 2)] : 5.0;
  console.log(`[compute-accessibilite] Médiane nationale MM : ${nationalMedian.toFixed(2)}`);

  // 4. Calcul complet (toutes passes)
  const allScores = new Map<string, ComputedScore>();
  let withOwnData = 0, withCerema = 0, withDept = 0, withNational = 0;

  for (const commune of communeList) {
    const result = computeScore(commune, ceremaByAav, deptMedians, nationalMedian);
    allScores.set(commune.code_insee, result);

    switch (result.method) {
      case 'own_data':         withOwnData++;   break;
      case 'cerema_aav':       withCerema++;    break;
      case 'regional_median':  withDept++;      break;
      case 'national_median':  withNational++;  break;
    }
  }

  console.log(
    `[compute-accessibilite] Répartition méthodes :\n` +
    `  own_data       : ${withOwnData}\n` +
    `  cerema_aav     : ${withCerema}\n` +
    `  regional_median: ${withDept}\n` +
    `  national_median: ${withNational}`,
  );

  // 5. Validation witnesses si mode dédié ou toutes communes
  if (WITNESSES_MODE || (!TEST_MODE && !FILTER_DEPTS)) {
    validateWitnesses(allScores);
  }

  // Mode dry-run : afficher quelques exemples et sortir
  if (DRY_RUN) {
    console.log('\n[compute-accessibilite] DRY-RUN — aucune écriture en base.');
    const sample = [...allScores.values()].slice(0, 5);
    for (const s of sample) {
      console.log(`  ${s.code_insee} | MM=${s.mm.toFixed(2)} | score=${s.score.toFixed(1)} | ${s.method}`);
    }
    process.exit(0);
  }

  // 6. Upsert
  const scoreList = [...allScores.values()];
  console.log(`\n[compute-accessibilite] Upsert de ${scoreList.length} scores...`);
  const { updated, errors } = await upsertScores(scoreList);

  // 7. Validation distribution (hors modes test/witnesses/dept)
  if (!TEST_MODE && !WITNESSES_MODE && !FILTER_DEPTS) {
    const dist = await prisma.$queryRaw<Array<{ bucket: string; cnt: string }>>`
      SELECT width_bucket(score_accessibilite_fin, 0, 100, 10)::text AS bucket,
             COUNT(*)::text AS cnt
      FROM immo_score.score_communes
      WHERE version = 4
      GROUP BY 1
      ORDER BY 1
    `;
    console.log('\n[compute-accessibilite] Distribution (buckets 0-100) :');
    for (const row of dist) {
      const lo  = (parseInt(row.bucket) - 1) * 10;
      const hi  = parseInt(row.bucket) * 10;
      const bar = '█'.repeat(Math.round(parseInt(row.cnt) / (parseInt(dist[0]?.cnt ?? '1') || 1) * 20));
      console.log(`  [${String(lo).padStart(3)}-${String(hi).padStart(3)}] ${row.cnt.padStart(6)} ${bar}`);
    }
  }

  const duration_s = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n=== Résultat ===');
  console.log(`  Scores calculés  : ${allScores.size}`);
  console.log(`  Scores upsertés  : ${updated}`);
  console.log(`  Erreurs          : ${errors.length}`);
  console.log(`  Durée            : ${duration_s}s`);

  if (errors.length > 0) {
    console.error('\n  Détail erreurs (3 premiers) :');
    errors.slice(0, 3).forEach(e => console.error(`  - ${e}`));
    if (errors.length / scoreList.length > 0.05) {
      console.error(`\n[compute-accessibilite] ALERTE : taux d'erreur > 5%`);
      process.exit(1);
    }
  }
}

main()
  .catch(err => { console.error('[compute-accessibilite] ERREUR FATALE :', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
