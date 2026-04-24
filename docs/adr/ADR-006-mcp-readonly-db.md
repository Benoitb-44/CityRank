# ADR-006 : Accès Lecture Seule PostgreSQL via MCP pour Agents Claude Code

**Date** : 2026-04-24  
**Statut** : Accepté  
**Ticket** : INFRA-08  
**Auteur** : @backend

---

## Contexte

Les agents Claude Code (data-engineer, backend, cto) ont besoin d'interroger la base de production pour diagnostiquer les données, vérifier les scores calculés, et répondre à des questions analytiques.

Aujourd'hui, les agents n'ont aucun accès direct à PostgreSQL : ils s'appuient sur des exports manuels ou des `console.log` dans les scripts d'ingestion. Cela ralentit les diagnostics et contraint Benoît à exécuter des requêtes à la main.

**Risque sans ADR** : donner aux agents l'URL `DATABASE_URL` (R/W) serait dangereux — un agent pourrait accidentellement tronquer une table ou corrompre des données.

---

## Décision

Créer un utilisateur PostgreSQL **`cityrank_ro`** (read-only, principe du moindre privilège) et l'exposer via un serveur MCP PostgreSQL (`@modelcontextprotocol/server-postgres`) protégé derrière nginx avec authentification.

Les agents Claude Code utilisent ce serveur MCP pour lancer des `SELECT` en production sans risque d'écriture.

---

## Plan d'implémentation — 10 étapes

### Étape 1 — Créer l'utilisateur PostgreSQL `cityrank_ro`

```sql
CREATE USER cityrank_ro
  WITH PASSWORD 'CHANGE_ME_RO_PASSWORD'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN;
```

Principe : l'utilisateur n'a aucun droit par défaut, on ajoute ensuite le strict minimum.

---

### Étape 2 — Écrire et exécuter `scripts/pg-grants-readonly.sql`

Script idempotent (DO $$...$$) qui accorde :
- `CONNECT` sur la base `immo_score`
- `USAGE` sur le schéma `immo_score` uniquement
- `SELECT` sur toutes les tables existantes
- `DEFAULT PRIVILEGES` pour les futures tables

Et révoque explicitement :
- Tout accès au schéma `public` (isolation Homilink)

Exécution : `psql $DATABASE_URL -f scripts/pg-grants-readonly.sql`

---

### Étape 3 — Vérifier l'isolation schéma `public` / Homilink

Après exécution du script, vérifier manuellement :

```sql
SELECT has_schema_privilege('cityrank_ro', 'immo_score', 'USAGE'); -- doit être TRUE
SELECT has_schema_privilege('cityrank_ro', 'public', 'USAGE');      -- doit être FALSE
```

---

### Étape 4 — Ajouter `DATABASE_URL_RO` dans `.env.vps`

```
DATABASE_URL_RO="postgresql://cityrank_ro:CHANGE_ME_RO_PASSWORD@db:5432/immo_score?schema=immo_score"
```

Ne jamais committer ce fichier avec des credentials réels.

---

### Étape 5 — Ajouter le service `mcp-db` dans `docker-compose.yml`

Service Node.js qui exécute `@modelcontextprotocol/server-postgres` via `supergateway` (wrapper stdio → HTTP/SSE) :

```yaml
mcp-db:
  image: node:22-alpine
  ports: ["127.0.0.1:3002:3002"]
  environment: [DATABASE_URL_RO]
  entrypoint: ["sh", "/start.sh"]
  volumes: ["./scripts/mcp-db-start.sh:/start.sh:ro"]
```

Le service écoute uniquement sur `127.0.0.1:3002` (pas exposé publiquement).

---

### Étape 6 — Créer `nginx/mcp-db.cityrank.fr.conf`

Reverse proxy HTTPS → `127.0.0.1:3002` avec :
- Redirection HTTP → HTTPS
- HTTP Basic Auth (fichier `/etc/nginx/.htpasswd-mcp-db`)
- Headers SSE pour le transport MCP (`proxy_buffering off`, `chunked_transfer_encoding on`)

Générer le `.htpasswd` :
```bash
htpasswd -c /etc/nginx/.htpasswd-mcp-db claude_agent
```

Activer le server block + certbot :
```bash
ln -s /etc/nginx/sites-available/mcp-db.cityrank.fr.conf /etc/nginx/sites-enabled/
certbot --nginx -d mcp-db.cityrank.fr
```

---

### Étape 7 — Configurer `.mcp.json` pour les agents Claude Code

Fichier `.mcp.json` à la racine du projet (commité sans credentials) :

```json
{
  "mcpServers": {
    "cityrank-db": {
      "type": "sse",
      "url": "https://mcp-db.cityrank.fr/sse"
    }
  }
}
```

Les credentials basic auth sont passés via l'env ou la config locale (`~/.claude/mcp.json`).

---

### Étape 8 — Test garde-fou #1 : INSERT doit échouer

```bash
npx tsx scripts/test-readonly-guardrails.ts
```

Le script tente un INSERT sur `immo_score.communes` avec `cityrank_ro`.  
**Résultat attendu** : `ERROR: permission denied for table communes`  
**Si INSERT réussit** : arrêt immédiat, incident sécurité.

---

### Étape 9 — Test garde-fou #2 : accès schéma `public` doit échouer

Même script, deuxième assertion : `has_schema_privilege('cityrank_ro', 'public', 'USAGE')` doit retourner `false`.  
**Si `true`** : cityrank_ro peut potentiellement accéder aux tables Homilink → arrêt immédiat.

---

### Étape 10 — Runbook Notion INFRA-08

Documenter dans Notion (page "État du Site") :
- Identifiant utilisateur RO : `cityrank_ro`
- Endpoint MCP : `https://mcp-db.cityrank.fr/sse`
- Procédure de rotation des credentials
- Procédure de révocation d'urgence
- Commandes de vérification des grants

---

## Conséquences

**Positif** :
- Les agents peuvent diagnostiquer la production sans risque d'écriture
- Isolation totale Homilink garantie par REVOKE sur `public`
- Auditable : toutes les connexions `cityrank_ro` sont loguées par PostgreSQL
- Réversible : `DROP USER cityrank_ro` suffit pour couper l'accès

**Négatif** :
- Un service Docker supplémentaire (`mcp-db`) consomme ~50 Mo RAM
- Le sous-domaine `mcp-db.cityrank.fr` nécessite un enregistrement DNS + certificat Let's Encrypt
- Les credentials basic auth doivent être rotés manuellement

**Alternatives écartées** :
- Tunnel SSH + stdio local : non compatible avec Claude Code remote
- Donner `DATABASE_URL` (R/W) aux agents : risque d'écriture inacceptable
- Vue PostgreSQL en lecture seule sans user dédié : même risque de mauvaise configuration future
