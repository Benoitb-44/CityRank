# Règle : Standards de Code — Immo Score

## TypeScript
- `strict: true` dans tsconfig
- Pas de `any` — utiliser `unknown` + type guards si nécessaire
- Interfaces pour les données API, types pour les unions
- Nommer les types avec le préfixe du domaine : `CommuneData`, `ScoreResult`, `DvfTransaction`

## Next.js
- Server Components par défaut
- `'use client'` uniquement pour : SearchBar, CompareSelector, composants avec state/effects
- `generateMetadata` obligatoire sur chaque page publique
- `generateStaticParams` pour les top 1000 communes

## Prisma
- Un seul `PrismaClient` partagé (`src/lib/prisma.ts`)
- Pas d'import direct de `@prisma/client` dans les composants — passer par des fonctions dans `src/lib/`

## Git
- Conventional commits : `feat:`, `fix:`, `data:`, `seo:`, `docs:`, `test:`, `chore:`
- PR obligatoire pour merge dans main
- Squash merge
