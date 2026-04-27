# ADR-006 — Accès base de données read-only via MCP

**Date** : 2026-04-24  
**Statut** : Accepté  
**Décideurs** : Benoît (fondateur)

---

## Contexte

Les agents Claude Code (et les audits automatisés) ont besoin d'accéder à la base PostgreSQL CityRank pour vérifier les données sans risque d'écriture accidentelle. Accorder un accès direct `DATABASE_URL` expose à des risques de mutation. Un endpoint MCP read-only isolé est la solution retenue (INFRA-08).

## Décision

Exposer un serveur MCP PostgreSQL read-only via un endpoint HTTPS dédié :
- **Endpoint** : `https://mcp-db.cityrank.fr/sse`
- **Transport** : SSE (Server-Sent Events)
- **Auth** : Basic Auth — utilisateur `claude_agent`, mot de passe dans 1Password (vault CityRank)
- **Droits BDD** : `SELECT` uniquement sur le schéma `immo_score`, aucun droit d'écriture

## Conséquences positives

- Les agents peuvent interroger la BDD directement (`SELECT COUNT(*) FROM immo_score.communes`)
- Aucun risque de mutation accidentelle par un agent
- Credentials hors du repo (`.mcp.json` dans `.gitignore`)
- Réplicable : `.mcp.json.example` versionné comme template

## Conséquences négatives / risques

- Endpoint public (HTTPS) — la rotation du mot de passe doit être synchronisée dans 1Password
- Si le serveur MCP est indisponible, fallback nécessaire (SSH + psql direct)

## Configuration locale

Copier `.mcp.json.example` → `.mcp.json` et remplacer le placeholder par la valeur 1Password :

```bash
cp .mcp.json.example .mcp.json
# Récupérer le mot de passe dans 1Password > vault CityRank > "MCP claude_agent"
# Calculer le base64 : echo -n "claude_agent:MOT_DE_PASSE" | base64
# Remplacer <base64(claude_agent:YOUR_PASSWORD_FROM_1PASSWORD)> dans .mcp.json
```

## Vérification

Dans Claude Code, lancer `/mcp` — `cityrank-db` doit apparaître.  
Requête de validation : `SELECT COUNT(*) FROM immo_score.communes` → attendu **34875**.

---

## Historique des modifications

| Date       | Auteur   | Note |
|------------|----------|------|
| 2026-04-24 | Benoît   | Livraison initiale (INFRA-08) |
| 2026-04-27 | @backend | Restauration `.mcp.json` suite à audit Orchestrateur — fichier absent du repo, `.gitignore` mis à jour, `.mcp.json.example` créé comme template versionné |
