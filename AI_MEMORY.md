# AI_MEMORY.md — CityRank
> Règle d'or : < 150 lignes. Compresser avant d'ajouter. Lire en début de session.

---

## [RULES] — Architecture & Style

- **Schéma PG isolé** : `immo_score` (DATABASE_URL doit contenir `?schema=immo_score`)
- **Prisma binaryTargets** : toujours `["native", "linux-musl-openssl-3.0.x"]` (Docker Alpine)
- **Build order** : `prisma generate && next build` — ne jamais inverser
- **VPS path** : `~/cityrank` (anciennement `~/immo-score`, migré)
- **Port** : 3001 — `docker stop $(docker ps -q --filter "publish=3001")` avant redeploy
- **`'use client'`** : interdit sauf SearchBar/Comparateur
- **ISR** : `revalidate: 86400` sur toutes les pages commune
- **`force-dynamic`** : obligatoire sur `/sitemap.xml` et `/departements` (prerender sans DB = crash)
- **Tailwind uniquement** — pas de CSS modules
- **Commits** : `feat:`, `fix:`, `data:`, `seo:`, `docs:` + tag `[memory]` pour mises à jour mémoire
- **Ingestion** : tous les scripts sont idempotents (upsert, jamais insert seul)
- **Notion** : mettre à jour la page "État du Site" (`345407e4-9119-8177-803b-ddf2ec2f389b`) en fin de session

---

## [PITFALLS] — Pièges actifs

### Score & Données
- **BPE absent** : floor à `10` (pas 0) → un 0 tue la moyenne géométrique pour toute la commune
- **DVF absent** (Alsace-Moselle, Mayotte) : imputation régionale obligatoire — flag `dvf_imputed=true`
- **DVF seuil** : si `nbTx < seuil`, ignorer le prix local et imputer régional (pas assez de données)
- **DVF normalisation** : gaussienne (pas linéaire) — coeff `DVF_GAUSSIAN_COEF` dans `src/lib/scoring`
- **tx_per_hab null** : si données DVF insuffisantes, renormaliser sur prix seul
- **Géorisques couverture** : toutes les communes ne sont pas couvertes → logguer les manquantes

### API & Ingestion
- **DPE ADEME** : rate limit 429 fréquent → backoff exponentiel obligatoire
- **BPE URL** : format CSV européen harmonisé depuis 2024 (séparateur `;`, encodage UTF-8 BOM)
- **Arrondissements** (Paris/Lyon/Marseille) : mapping code INSEE → code arrondissement dans `ingest-dvf.ts`

### Docker & CI/CD
- **Prisma client** : le dossier `src/lib` doit être copié dans le runner stage du Dockerfile
- **Port conflict** : arrêter le conteneur sur 3001 AVANT `docker compose up -d`
- **Prisma runner** : `binaryTargets` non configuré = Prisma client invalide sous Alpine

### compute-scores ⚠️ CRITIQUE
- **STOP = bloquant** : tout flag `STOP` ou "attendre validation humaine" interdit l'exécution auto
- **Typo de flag** : un flag inconnu (ex: `--witnesse` vs `--witnesses`) → ABORT + ping humain, pas batch complet
- **Flags valides** : `--test` (10 communes) | `--witnesses` (25 témoins) | `--depts=XX,YY` | `--audit-gaussian` | `--audit-anomalies`

---

## [SOLUTIONS] — Patterns validés

### Score composite v3.1
```
score = géométrique(dvf, dpe, bpe, risques, fiscalite, démographie)
pondérations : DVF 45% | BPE 20% | DPE 10% | Risques 25%
chaque composante : floor=10, cap=100, normalisation percentile rank
```

### Upsert idempotent (pattern universel)
```typescript
await prisma.model.upsert({
  where: { code_commune_annee: { code_commune, annee } },
  update: { ...data, updated_at: new Date() },
  create: { code_commune, annee, ...data },
});
```

### Sitemap dynamique
```typescript
export const dynamic = 'force-dynamic'; // ligne 1 obligatoire
export const revalidate = 0;
```

### DPE backoff 429
```typescript
if (res.status === 429) {
  await new Promise(r => setTimeout(r, 2000 * attempt));
  continue;
}
```

### Imputation DVF régionale
1. Calculer médianes régionales via SQL sur `dvf_prix` agrégé
2. Si commune sans DVF ou `nbTx < seuil` → utiliser médiane région
3. Setter `dvf_imputed=true`, `dvf_imputed_method='regional_median'`

---

## [CHANGELOG MEMORY]
- `2026-04-22` — Initialisation depuis analyse commits + architecture projet
