# CityRank

Site de SEO programmatique immobilier — [cityrank.fr](https://cityrank.fr)

## Setup MCP (accès base de données read-only)

Les agents Claude Code utilisent un serveur MCP pour interroger la BDD sans risque d'écriture.

```bash
cp .mcp.json.example .mcp.json
```

Puis éditer `.mcp.json` : remplacer `<base64(claude_agent:YOUR_PASSWORD_FROM_1PASSWORD)>` par la valeur calculée :

```bash
# Récupérer le mot de passe dans 1Password > vault CityRank > "MCP claude_agent"
echo -n "claude_agent:MOT_DE_PASSE" | base64
```

Coller le résultat dans le champ `Authorization`. Voir [ADR-006](docs/adr/ADR-006-mcp-readonly-db.md) pour plus de détails.