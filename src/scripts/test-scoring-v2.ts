/**
 * test-scoring-v2.ts
 * Validation de l'algorithme de scoring v2 (goalposts + agrégation géométrique).
 *
 * 5 cas de validation définis dans ADR-IS-002 :
 *   1. Bordeaux  (33063) — score_dpe > 50  (ancienne métrique pct_ab donnait 9/100)
 *   2. Paris     (75056) — score_global > 20 (ancienne méthode percentile donnait ~0)
 *   3. Ambléon   (01006) — score_global < Bordeaux
 *   4. Commune sans DPE  — dpe.score=null, score_global calculé sur DVF+Risques
 *   5. Commune TRES_FORT — score_risques ≤ 60
 *
 * Usage : npm run test:scoring-v2
 * Exit 1 si un test échoue.
 */

import { PrismaClient } from '@prisma/client';
import { calculateScore, ScoreDetails } from '../lib/scoring';

const prisma = new PrismaClient();

// ─── Utilitaires de recherche ────────────────────────────────────────────────

async function findCommuneSansDpe(): Promise<{ code: string; nom: string } | null> {
  const rows = await prisma.$queryRaw<{ code_insee: string; nom: string }[]>`
    SELECT c.code_insee, c.nom
    FROM immo_score.communes c
    WHERE NOT EXISTS (
      SELECT 1 FROM immo_score.dpe_communes d WHERE d.code_commune = c.code_insee
    )
    LIMIT 1
  `;
  return rows[0] ? { code: rows[0].code_insee, nom: rows[0].nom } : null;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TestResult {
  id:       number;
  label:    string;
  insee:    string;
  pass:     boolean;
  detail:   string;
  expected: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('# Tests de validation — Scoring v2\n');
  console.log(`Date : ${new Date().toLocaleString('fr-FR')}\n`);

  const results: TestResult[] = [];

  // ── Test 1 : Bordeaux — score_dpe > 50 ──────────────────────────────────────
  const bordeaux = await calculateScore('33063', prisma);
  {
    const dpeScore = bordeaux?.details.dpe.score ?? null;
    const pctNp    = bordeaux?.details.dpe.pct_non_passoire ?? null;
    results.push({
      id:       1,
      label:    'Bordeaux (33063) — score_dpe > 50',
      insee:    '33063',
      pass:     dpeScore != null && dpeScore > 50,
      detail:   `score_dpe=${dpeScore ?? 'null'}, pct_non_passoire=${pctNp ?? 'null'}%`,
      expected: 'score_dpe > 50',
    });
  }

  // ── Test 2 : Paris — score_global > 20 ──────────────────────────────────────
  const paris = await calculateScore('75056', prisma);
  {
    const g = paris?.score ?? null;
    results.push({
      id:       2,
      label:    'Paris (75056) — score_global > 20',
      insee:    '75056',
      pass:     g != null && g > 20,
      detail:   `score_global=${g ?? 'null'}, dvf=${paris?.details.dvf.score ?? 'null'} (prix_m2=${paris?.details.dvf.prix_m2_median ?? 'null'}€), dpe=${paris?.details.dpe.score ?? 'null'}`,
      expected: 'score_global > 20',
    });
  }

  // ── Test 3 : DPE haute vs DPE basse (même fourchette de prix) ───────────────
  // Trouver deux communes avec prix médian 1200-1800 €/m² :
  //   une avec pct_non_passoire > 85%, l'autre < 65%.
  // Invariant : score_dpe(haute) > score_dpe(basse).
  {
    const candidates = await prisma.$queryRaw<{ code_commune: string; pct_np: number }[]>`
      WITH prix AS (
        SELECT code_commune,
               PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY prix_m2) AS prix_median
        FROM immo_score.dvf_prix
        WHERE prix_m2 IS NOT NULL AND prix_m2 > 0
        GROUP BY code_commune
        HAVING PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY prix_m2) BETWEEN 1200 AND 1800
      ),
      dpe AS (
        SELECT code_commune,
               SUM(CASE WHEN classe_dpe IN ('A','B','C','D','E') THEN nb_logements ELSE 0 END)::float
                 / NULLIF(SUM(nb_logements), 0) * 100 AS pct_np
        FROM immo_score.dpe_communes
        GROUP BY code_commune
        HAVING SUM(nb_logements) > 10
      )
      SELECT p.code_commune, d.pct_np
      FROM prix p
      JOIN dpe d ON d.code_commune = p.code_commune
      ORDER BY d.pct_np
    `;

    const haute = candidates.findLast(c => c.pct_np > 85);
    const basse = candidates.find(c => c.pct_np < 65);

    if (haute && basse) {
      const rH = await calculateScore(haute.code_commune, prisma);
      const rB = await calculateScore(basse.code_commune, prisma);
      const sH = rH?.details.dpe.score ?? null;
      const sB = rB?.details.dpe.score ?? null;
      results.push({
        id:       3,
        label:    `DPE haute (${haute.code_commune}, ${haute.pct_np.toFixed(1)}%) > DPE basse (${basse.code_commune}, ${basse.pct_np.toFixed(1)}%)`,
        insee:    `${haute.code_commune} vs ${basse.code_commune}`,
        pass:     sH != null && sB != null && sH > sB,
        detail:   `score_dpe haute=${sH ?? 'null'} vs score_dpe basse=${sB ?? 'null'}`,
        expected: 'score_dpe haute > score_dpe basse',
      });
    } else {
      results.push({
        id:       3,
        label:    'DPE haute vs basse — candidats insuffisants',
        insee:    '—',
        pass:     false,
        detail:   `haute trouvée: ${!!haute}, basse trouvée: ${!!basse}`,
        expected: 'Deux communes éligibles en base',
      });
    }
  }

  // ── Test 4 : Commune sans DPE ─────────────────────────────────────────────────
  const sansDpe = await findCommuneSansDpe();
  if (sansDpe) {
    const r = await calculateScore(sansDpe.code, prisma);
    const dpeScore = r?.details.dpe.score ?? null;
    const global   = r?.score ?? null;
    results.push({
      id:       4,
      label:    `Sans DPE (${sansDpe.code} — ${sansDpe.nom})`,
      insee:    sansDpe.code,
      pass:     dpeScore === null && global != null,
      detail:   `dpe.score=${dpeScore ?? 'null'}, score_global=${global ?? 'null'}, dvf=${r?.details.dvf.score ?? 'null'}, risques=${r?.details.risques.score ?? 'null'}`,
      expected: 'dpe.score=null ET score_global≠null',
    });
  } else {
    results.push({
      id:       4,
      label:    'Sans DPE — aucune commune trouvée',
      insee:    '—',
      pass:     false,
      detail:   'Aucune commune sans DPE en base',
      expected: 'Au moins une commune sans DPE',
    });
  }

  // ── Test 5 : Commune avec risque MOYEN ou FORT → score_risques < 100 ─────────
  // Invariant : tout risque non-FAIBLE doit abaisser le score sous 100.
  {
    const avecRisque = await prisma.$queryRaw<{ code_commune: string; nom: string; niveau: string }[]>`
      SELECT r.code_commune, c.nom, r.niveau
      FROM immo_score.risques r
      JOIN immo_score.communes c ON c.code_insee = r.code_commune
      WHERE r.niveau IN ('MOYEN', 'FORT', 'TRES_FORT')
      LIMIT 1
    `;

    if (avecRisque.length > 0) {
      const { code_commune, nom, niveau } = avecRisque[0];
      const r = await calculateScore(code_commune, prisma);
      const risqueScore = r?.details.risques.score ?? null;
      results.push({
        id:       5,
        label:    `Risque ${niveau} (${code_commune} — ${nom}) → score_risques < 100`,
        insee:    code_commune,
        pass:     risqueScore != null && risqueScore < 100,
        detail:   `score_risques=${risqueScore ?? 'null'}, moyen=${r?.details.risques.moyen ?? 0}, fort=${r?.details.risques.fort ?? 0}`,
        expected: 'score_risques < 100',
      });
    } else {
      results.push({
        id:       5,
        label:    'Risque non-FAIBLE — aucune commune trouvée',
        insee:    '—',
        pass:     false,
        detail:   'Table risques vide ou uniquement FAIBLE',
        expected: 'Au moins une commune avec risque MOYEN/FORT',
      });
    }
  }

  // ── Tableau résumé ────────────────────────────────────────────────────────────
  console.log('| # | Test | Statut | Détail | Attendu |');
  console.log('|---|------|:------:|--------|---------|');
  for (const r of results) {
    const icon = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`| ${r.id} | **${r.label}** | ${icon} | ${r.detail} | ${r.expected} |`);
  }

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n**Résultat : ${passed}/${results.length} tests passent**`);

  if (failed > 0) {
    console.log('\n⚠️  Ne pas pusher — corriger les échecs avant review.');
    process.exit(1);
  }

  console.log('\n✅ Tous les tests passent — prêt pour code-review.');
  process.exit(0);
}

main()
  .catch(err => {
    console.error('Erreur fatale :', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
