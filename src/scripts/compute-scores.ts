/**
 * compute-scores.ts
 * Calcule et stocke le score composite de toutes les communes françaises.
 *
 * - Itère sur toutes les communes par batch de 100
 * - Appelle calculateScore(communeId, prisma) pour chaque commune
 * - Upsert dans la table `scores` (score_global, score_dvf, score_dpe, score_risques)
 * - Progression loguée à chaque batch
 * - Exit 1 si taux d'erreur > 10%
 *
 * Usage :
 *   npm run compute:scores
 *   npm run compute:scores -- --test   (10 premières communes uniquement)
 */

import { PrismaClient } from '@prisma/client';
import { calculateScore } from '../lib/scoring';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;
const TEST_MODE = process.argv.includes('--test');
const TEST_LIMIT = 10;

interface ComputeResult {
  communes_processed: number;
  communes_updated: number;
  communes_skipped: number;
  communes_errored: number;
  duration_ms: number;
  errors: string[];
}

async function main(): Promise<ComputeResult> {
  const startedAt = Date.now();

  const total = TEST_MODE
    ? TEST_LIMIT
    : await prisma.commune.count();

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errored = 0;
  const errors: string[] = [];

  if (TEST_MODE) {
    console.log(`\n[compute-scores] MODE TEST — ${total} communes\n`);
  } else {
    console.log(`\n[compute-scores] ${total} communes à traiter (batch=${BATCH_SIZE})\n`);
  }

  let offset = 0;

  while (offset < total) {
    const batchSize = Math.min(BATCH_SIZE, total - offset);

    const communes = await prisma.commune.findMany({
      select: { code_insee: true, nom: true },
      orderBy: { code_insee: 'asc' },
      skip: offset,
      take: batchSize,
    });

    if (communes.length === 0) break;

    for (const commune of communes) {
      try {
        const result = await calculateScore(commune.code_insee, prisma);

        if (!result) {
          // Commune introuvable dans scoring (ne devrait pas arriver)
          skipped++;
          processed++;
          continue;
        }

        await prisma.score.upsert({
          where: { code_commune: commune.code_insee },
          create: {
            code_commune: commune.code_insee,
            score_global: result.score,
            score_dvf: result.details.dvf.score,
            score_dpe: result.details.dpe.score,
            score_risques: result.details.risques.score,
            computed_at: new Date(),
          },
          update: {
            score_global: result.score,
            score_dvf: result.details.dvf.score,
            score_dpe: result.details.dpe.score,
            score_risques: result.details.risques.score,
            computed_at: new Date(),
            version: { increment: 1 },
          },
        });

        updated++;
        processed++;
      } catch (err) {
        errored++;
        processed++;
        const msg = `${commune.code_insee} (${commune.nom}): ${
          err instanceof Error ? err.message : String(err)
        }`;
        if (errors.length < 20) errors.push(msg);
      }
    }

    const pct = Math.round((processed / total) * 100);
    const batchNum = Math.ceil(offset / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(total / BATCH_SIZE);
    process.stdout.write(
      `\r[compute-scores] batch ${batchNum}/${totalBatches} — ${processed}/${total} (${pct}%) ` +
        `— ✓ ${updated} mis à jour, ↷ ${skipped} sans données, ✗ ${errored} erreurs`,
    );

    offset += BATCH_SIZE;
  }

  process.stdout.write('\n');
  const duration_ms = Date.now() - startedAt;

  return {
    communes_processed: processed,
    communes_updated: updated,
    communes_skipped: skipped,
    communes_errored: errored,
    duration_ms,
    errors,
  };
}

main()
  .then((result) => {
    console.log('\n[compute-scores] Terminé :');
    console.log(`  Traitées         : ${result.communes_processed}`);
    console.log(`  Mises à jour     : ${result.communes_updated}`);
    console.log(`  Sans données     : ${result.communes_skipped}`);
    console.log(`  Erreurs          : ${result.communes_errored}`);
    console.log(`  Durée            : ${(result.duration_ms / 1000).toFixed(1)}s`);

    if (result.errors.length > 0) {
      console.log('\nPremières erreurs :');
      result.errors.forEach((e) => console.log(`  — ${e}`));
    }

    const errorRate =
      result.communes_processed > 0
        ? result.communes_errored / result.communes_processed
        : 0;

    if (errorRate > 0.1) {
      console.error(
        `\n[compute-scores] ALERTE: taux d'erreur ${(errorRate * 100).toFixed(1)}% > 10%`,
      );
      process.exit(1);
    }

    process.exit(0);
  })
  .catch((err) => {
    console.error('[compute-scores] Erreur fatale:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
