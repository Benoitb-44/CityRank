-- =============================================================
-- INFRA-08 : Utilisateur read-only cityrank_ro pour agents MCP
-- =============================================================
-- Exécuter en tant que superuser (postgres ou immo_score_admin)
-- Usage : psql $DATABASE_URL -f scripts/pg-grants-readonly.sql
--
-- Ce script est IDEMPOTENT — sûr à ré-exécuter.
-- =============================================================

-- Étape 1 : Créer l'utilisateur si absent
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cityrank_ro') THEN
    CREATE USER cityrank_ro
      WITH PASSWORD 'CHANGE_ME_RO_PASSWORD'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      LOGIN;
    RAISE NOTICE 'Utilisateur cityrank_ro créé.';
  ELSE
    RAISE NOTICE 'Utilisateur cityrank_ro déjà existant — skip CREATE.';
  END IF;
END
$$;

-- Étape 2 : Autoriser la connexion à la base immo_score
GRANT CONNECT ON DATABASE immo_score TO cityrank_ro;

-- Étape 3 : Usage du schéma immo_score uniquement
GRANT USAGE ON SCHEMA immo_score TO cityrank_ro;

-- Étape 4 : SELECT sur toutes les tables existantes
GRANT SELECT ON ALL TABLES IN SCHEMA immo_score TO cityrank_ro;

-- Étape 5 : SELECT automatique sur les futures tables (ALTER DEFAULT PRIVILEGES)
ALTER DEFAULT PRIVILEGES IN SCHEMA immo_score
  GRANT SELECT ON TABLES TO cityrank_ro;

-- Étape 6 : Révoquer tout accès au schéma public (isolation Homilink)
-- PostgreSQL accorde par défaut USAGE sur public — on l'enlève explicitement.
REVOKE ALL ON SCHEMA public FROM cityrank_ro;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM cityrank_ro;

-- =============================================================
-- Vérification post-exécution (à lancer manuellement)
-- =============================================================
-- SELECT has_schema_privilege('cityrank_ro', 'immo_score', 'USAGE');
--   → doit retourner : t  (true)
--
-- SELECT has_schema_privilege('cityrank_ro', 'public', 'USAGE');
--   → doit retourner : f  (false)
--
-- Tester les garde-fous applicatifs :
--   npx tsx scripts/test-readonly-guardrails.ts
-- =============================================================
