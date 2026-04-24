#!/bin/sh
# Entrypoint du service mcp-db (Docker)
# Lance supergateway qui wrappe @modelcontextprotocol/server-postgres en HTTP/SSE
# DATABASE_URL_RO est injecté par docker-compose depuis .env

set -e

if [ -z "$DATABASE_URL_RO" ]; then
  echo "[mcp-db] ERREUR : DATABASE_URL_RO non défini" >&2
  exit 1
fi

echo "[mcp-db] Démarrage du serveur MCP PostgreSQL (lecture seule)..."
echo "[mcp-db] Écoute sur port 3002"

exec npx --yes supergateway \
  --stdio "npx --yes @modelcontextprotocol/server-postgres $DATABASE_URL_RO" \
  --port 3002 \
  --host 0.0.0.0
