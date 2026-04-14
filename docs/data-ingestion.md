# Skill : Data Ingestion — Immo Score

## Pattern Standard d'un Script d'Ingestion

```typescript
// src/scripts/ingest-[source].ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IngestResult {
  source: string;
  communes_processed: number;
  communes_updated: number;
  communes_errored: number;
  duration_ms: number;
  errors: string[];
}

async function ingest(): Promise<IngestResult> {
  const start = Date.now();
  const errors: string[] = [];
  let processed = 0;
  let updated = 0;

  // 1. Fetch la liste des départements (traitement par batch)
  const departements = await prisma.communes.findMany({
    select: { departement: true },
    distinct: ['departement'],
  });

  for (const { departement } of departements) {
    try {
      // 2. Fetch les données pour ce département
      const data = await fetchFromApi(departement);

      // 3. Transform + Upsert
      for (const item of data) {
        try {
          await prisma.tableCible.upsert({
            where: { code_insee: item.code_insee },
            create: { /* ... */ },
            update: { /* ... */, updated_at: new Date() },
          });
          updated++;
        } catch (e) {
          errors.push(`${item.code_insee}: ${e.message}`);
        }
        processed++;
      }
    } catch (e) {
      errors.push(`Département ${departement}: ${e.message}`);
    }
  }

  return {
    source: 'nom_source',
    communes_processed: processed,
    communes_updated: updated,
    communes_errored: errors.length,
    duration_ms: Date.now() - start,
    errors: errors.slice(0, 20), // Top 20 erreurs
  };
}

ingest()
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.communes_errored > result.communes_processed * 0.1 ? 1 : 0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

## Rate Limiting
```typescript
// Utilitaire de rate limiting pour les APIs
async function rateLimitedFetch(url: string, rps: number = 10): Promise<Response> {
  await new Promise(resolve => setTimeout(resolve, 1000 / rps));
  const response = await fetch(url);
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return rateLimitedFetch(url, rps / 2); // Backoff
  }
  return response;
}
```

## Exécution
```bash
# Manuel
npx tsx src/scripts/ingest-dvf.ts

# Via n8n (workflow planifié)
# HTTP Request node → POST http://localhost:3001/api/ingest/dvf
# Cron : 1er du mois à 3h du matin
```
