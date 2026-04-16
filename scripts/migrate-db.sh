#!/usr/bin/env bash
# migrate-db.sh — Migration des données immo_score depuis homilink-db-1 vers immo-score-db
#
# Usage (depuis le VPS OVH) :
#   bash scripts/migrate-db.sh
#
# Prérequis :
#   - Les deux containers homilink-db-1 et immo-score-db doivent être en cours d'exécution
#   - Les variables POSTGRES_USER et POSTGRES_PASSWORD doivent être dans l'environnement
#     ou renseignées dans .env (chargé automatiquement ci-dessous)
#
# Ce script effectue :
#   1. pg_dump du schéma immo_score depuis homilink-db-1
#   2. Restore dans immo-score-db

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Charger le .env si présent
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

# Vérification des variables obligatoires
: "${POSTGRES_USER:?Variable POSTGRES_USER non définie}"
: "${POSTGRES_PASSWORD:?Variable POSTGRES_PASSWORD non définie}"
: "${POSTGRES_DB:=immo_score}"

SOURCE_CONTAINER="homilink-db-1"
TARGET_CONTAINER="immo-score-db"
DUMP_FILE="/tmp/immo_score_dump_$(date +%Y%m%d_%H%M%S).sql"

echo "=== Migration immo_score : $SOURCE_CONTAINER → $TARGET_CONTAINER ==="
echo "Dump file : $DUMP_FILE"
echo ""

# 1. Vérifier que les deux containers sont en cours d'exécution
echo "[1/4] Vérification des containers..."
if ! docker ps --format '{{.Names}}' | grep -q "^${SOURCE_CONTAINER}$"; then
  echo "ERREUR : container source '$SOURCE_CONTAINER' introuvable ou arrêté."
  exit 1
fi
if ! docker ps --format '{{.Names}}' | grep -q "^${TARGET_CONTAINER}$"; then
  echo "ERREUR : container cible '$TARGET_CONTAINER' introuvable ou arrêté."
  echo "Lancez d'abord : docker compose -f docker-compose.immo.yml up -d db"
  exit 1
fi
echo "  OK — les deux containers sont actifs."

# 2. pg_dump depuis homilink-db-1 (schéma immo_score)
echo "[2/4] Dump du schéma immo_score depuis $SOURCE_CONTAINER..."
docker exec "$SOURCE_CONTAINER" \
  pg_dump \
    --no-owner \
    --no-acl \
    --schema=immo_score \
    -U postgres \
    postgres \
  > "$DUMP_FILE"
echo "  OK — dump écrit dans $DUMP_FILE ($(du -sh "$DUMP_FILE" | cut -f1))"

# 3. Copier le dump dans le container cible
echo "[3/4] Copie du dump dans $TARGET_CONTAINER..."
docker cp "$DUMP_FILE" "${TARGET_CONTAINER}:/tmp/restore.sql"
echo "  OK"

# 4. Restore dans immo-score-db
echo "[4/4] Restore dans $TARGET_CONTAINER (base : $POSTGRES_DB)..."
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$TARGET_CONTAINER" \
  psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -f /tmp/restore.sql
echo "  OK"

# Nettoyage
docker exec "$TARGET_CONTAINER" rm /tmp/restore.sql
rm -f "$DUMP_FILE"

echo ""
echo "=== Migration terminée avec succès ==="
echo "Vérification rapide du nombre de communes :"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$TARGET_CONTAINER" \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT COUNT(*) AS nb_communes FROM immo_score.communes;" 2>/dev/null \
  || docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$TARGET_CONTAINER" \
     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
     "SELECT COUNT(*) AS nb_communes FROM communes;"
