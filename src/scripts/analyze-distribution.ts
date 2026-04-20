/**
 * analyze-distribution.ts
 * Analyse la distribution des valeurs brutes pour chaque dimension de scoring.
 * Sortie : tableau markdown avec percentiles 5/10/25/50/75/90/95, min, max, couverture.
 *
 * Usage : npx tsx src/scripts/analyze-distribution.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PercRow {
  p5: string | null;
  p10: string | null;
  p25: string | null;
  p50: string | null;
  p75: string | null;
  p90: string | null;
  p95: string | null;
  min_val: string | null;
  max_val: string | null;
  count_with: string;
  count_without: string;
}

function f(v: string | null, d = 1): string {
  if (v == null) return 'N/A';
  const n = parseFloat(v);
  return isNaN(n) ? 'N/A' : n.toFixed(d);
}

function printDimension(title: string, r: PercRow, unit = '', d = 1) {
  const u = unit ? ` ${unit}` : '';
  console.log(`\n### ${title}`);
  console.log(`Communes avec données : **${r.count_with}** | sans données : **${r.count_without}**\n`);
  console.log(`| P5 | P10 | P25 | P50 (médiane) | P75 | P90 | P95 | Min | Max |`);
  console.log(`|---:|---:|---:|---:|---:|---:|---:|---:|---:|`);
  console.log(
    `| ${f(r.p5, d)}${u} | ${f(r.p10, d)}${u} | ${f(r.p25, d)}${u}` +
    ` | ${f(r.p50, d)}${u} | ${f(r.p75, d)}${u} | ${f(r.p90, d)}${u}` +
    ` | ${f(r.p95, d)}${u} | ${f(r.min_val, d)}${u} | ${f(r.max_val, d)}${u} |`,
  );
}

async function main() {
  console.log('# Distribution des données brutes — CityRank');
  console.log(`\n_Généré le ${new Date().toLocaleString('fr-FR')}_`);

  // ── 1. DVF — Prix m² médian par commune ────────────────────────────────────
  const [dvfPrix] = await prisma.$queryRaw<PercRow[]>`
    WITH medians AS (
      SELECT
        code_commune,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY prix_m2) AS v
      FROM immo_score.dvf_prix
      WHERE prix_m2 IS NOT NULL
        AND prix_m2 > 0
      GROUP BY code_commune
    ),
    total AS (SELECT COUNT(*)::bigint AS n FROM immo_score.communes)
    SELECT
      PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY v)::text AS p5,
      PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY v)::text AS p10,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY v)::text AS p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY v)::text AS p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY v)::text AS p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY v)::text AS p90,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY v)::text AS p95,
      MIN(v)::text AS min_val,
      MAX(v)::text AS max_val,
      COUNT(*)::text                                          AS count_with,
      ((SELECT n FROM total) - COUNT(*))::text               AS count_without
    FROM medians
  `;
  printDimension('DVF — Prix m² médian par commune', dvfPrix, '€/m²', 0);

  // ── 2. DVF — Transactions normalisées (nb tx / habitant) ───────────────────
  const [dvfLiq] = await prisma.$queryRaw<PercRow[]>`
    WITH liq AS (
      SELECT
        d.code_commune,
        COUNT(*)::float / NULLIF(c.population, 0) AS v
      FROM immo_score.dvf_prix d
      JOIN immo_score.communes c ON c.code_insee = d.code_commune
      WHERE c.population > 0
      GROUP BY d.code_commune, c.population
    ),
    total AS (SELECT COUNT(*)::bigint AS n FROM immo_score.communes)
    SELECT
      PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY v)::text AS p5,
      PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY v)::text AS p10,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY v)::text AS p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY v)::text AS p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY v)::text AS p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY v)::text AS p90,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY v)::text AS p95,
      MIN(v)::text AS min_val,
      MAX(v)::text AS max_val,
      COUNT(*)::text                                         AS count_with,
      ((SELECT n FROM total) - COUNT(*))::text              AS count_without
    FROM liq
  `;
  printDimension('DVF — Liquidité (transactions / habitant)', dvfLiq, 'tx/hab', 4);

  // ── 3a. DPE — pct_ab (% logements A+B) ────────────────────────────────────
  const [dpeAb] = await prisma.$queryRaw<PercRow[]>`
    WITH ab AS (
      SELECT
        code_commune,
        SUM(CASE WHEN classe_dpe IN ('A','B') THEN nb_logements ELSE 0 END)::float
          / NULLIF(SUM(nb_logements), 0) * 100 AS v
      FROM immo_score.dpe_communes
      GROUP BY code_commune
      HAVING SUM(nb_logements) > 0
    ),
    total AS (SELECT COUNT(*)::bigint AS n FROM immo_score.communes)
    SELECT
      PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY v)::text AS p5,
      PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY v)::text AS p10,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY v)::text AS p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY v)::text AS p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY v)::text AS p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY v)::text AS p90,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY v)::text AS p95,
      MIN(v)::text AS min_val,
      MAX(v)::text AS max_val,
      COUNT(*)::text                                         AS count_with,
      ((SELECT n FROM total) - COUNT(*))::text              AS count_without
    FROM ab
  `;
  printDimension('DPE — % logements A+B (pct_ab — score actuel)', dpeAb, '%', 1);

  // ── 3b. DPE — pct_non_passoire (% logements A+B+C+D+E) ────────────────────
  const [dpeNp] = await prisma.$queryRaw<PercRow[]>`
    WITH np AS (
      SELECT
        code_commune,
        SUM(CASE WHEN classe_dpe IN ('A','B','C','D','E') THEN nb_logements ELSE 0 END)::float
          / NULLIF(SUM(nb_logements), 0) * 100 AS v
      FROM immo_score.dpe_communes
      GROUP BY code_commune
      HAVING SUM(nb_logements) > 0
    ),
    total AS (SELECT COUNT(*)::bigint AS n FROM immo_score.communes)
    SELECT
      PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY v)::text AS p5,
      PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY v)::text AS p10,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY v)::text AS p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY v)::text AS p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY v)::text AS p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY v)::text AS p90,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY v)::text AS p95,
      MIN(v)::text AS min_val,
      MAX(v)::text AS max_val,
      COUNT(*)::text                                         AS count_with,
      ((SELECT n FROM total) - COUNT(*))::text              AS count_without
    FROM np
  `;
  printDimension('DPE — % logements non-passoire A+B+C+D+E (pct_non_passoire)', dpeNp, '%', 1);

  // ── 4. Risques — score_risques (table scores, colonne score_risques) ────────
  const [risques] = await prisma.$queryRaw<PercRow[]>`
    WITH total AS (SELECT COUNT(*)::bigint AS n FROM immo_score.communes)
    SELECT
      PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY score_risques)::text AS p5,
      PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY score_risques)::text AS p10,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY score_risques)::text AS p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY score_risques)::text AS p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY score_risques)::text AS p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY score_risques)::text AS p90,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY score_risques)::text AS p95,
      MIN(score_risques)::text AS min_val,
      MAX(score_risques)::text AS max_val,
      COUNT(score_risques)::text                              AS count_with,
      ((SELECT n FROM total) - COUNT(score_risques))::text   AS count_without
    FROM immo_score.scores
  `;
  printDimension('Risques — score_risques (table scores)', risques, '/100', 1);

  console.log('\n---');
  console.log('_Script : src/scripts/analyze-distribution.ts_');
}

main()
  .catch((err) => {
    console.error('Erreur fatale :', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
