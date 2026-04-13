# Règle : Git Workflow — Immo Score

## Branches
- `main` : Production. Déployé automatiquement via GitHub Actions.
- `claude/[description]-[id]` : Feature branches créées par les agents.
- Pas de branche `develop` — trunk-based development.

## Processus
1. Agent crée une branche `claude/[feature]`
2. Agent développe + commit (conventional commits)
3. @code-reviewer review la PR
4. Squash merge dans `main`
5. GitHub Actions déploie automatiquement

## Conventional Commits
- `feat:` — nouvelle feature visible par l'utilisateur
- `fix:` — correction de bug
- `data:` — changement dans les scripts d'ingestion ou le schéma
- `seo:` — optimisation SEO (meta, sitemap, structured data)
- `docs:` — documentation
- `test:` — ajout/modification de tests
- `chore:` — maintenance, dépendances, CI/CD

## CI/CD
GitHub Actions workflow :
1. `npm run lint`
2. `npm run type-check`
3. `npm run test`
4. `npm run build`
5. Deploy via SSH sur VPS (docker compose pull + up)
