#!/usr/bin/env npx tsx
/**
 * INFRA-08 : Tests garde-fous pour cityrank_ro
 *
 * Vérifie que l'utilisateur read-only respecte deux invariants :
 *   1. INSERT sur immo_score DOIT échouer (permission denied)
 *   2. SELECT sur schéma public (Homilink) DOIT être refusé
 *   3. SELECT sur immo_score DOIT réussir (sanity check)
 *
 * Usage :
 *   DATABASE_URL_RO="postgresql://cityrank_ro:pass@host/db?schema=immo_score" \
 *   npx tsx scripts/test-readonly-guardrails.ts
 *
 * En Docker :
 *   docker compose exec mcp-db sh -c "DATABASE_URL_RO=$DATABASE_URL_RO npx tsx /app/scripts/test-readonly-guardrails.ts"
 */

import { PrismaClient } from '@prisma/client'

const DATABASE_URL_RO = process.env.DATABASE_URL_RO

if (!DATABASE_URL_RO) {
  console.error('ERREUR : DATABASE_URL_RO non défini')
  console.error('Usage : DATABASE_URL_RO="postgresql://cityrank_ro:..." npx tsx scripts/test-readonly-guardrails.ts')
  process.exit(1)
}

const prismaRO = new PrismaClient({
  datasources: { db: { url: DATABASE_URL_RO } },
  log: [],
})

type TestResult = { name: string; passed: boolean; detail: string }

async function run(): Promise<void> {
  const results: TestResult[] = []

  console.log('=== INFRA-08 : Tests garde-fous cityrank_ro ===\n')

  // ──────────────────────────────────────────────────────────
  // Test 1 : SELECT sur immo_score.communes — doit RÉUSSIR
  // ──────────────────────────────────────────────────────────
  try {
    const count = await prismaRO.commune.count()
    results.push({
      name: 'SELECT immo_score.communes',
      passed: true,
      detail: `${count} communes accessibles`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    results.push({
      name: 'SELECT immo_score.communes',
      passed: false,
      detail: `Attendu : succès — Reçu : ${msg}`,
    })
  }

  // ──────────────────────────────────────────────────────────
  // Test 2 : INSERT sur immo_score — doit ÉCHOUER
  // ──────────────────────────────────────────────────────────
  try {
    await prismaRO.$executeRawUnsafe(
      `INSERT INTO communes (code_insee, nom, departement, region, slug, created_at, updated_at)
       VALUES ('99999', 'Test Guardrail', '99', 'Test Region', 'test-ro-guardrail-do-not-use', NOW(), NOW())`
    )
    // Si on arrive ici, le test a ÉCHOUÉ — l'INSERT a réussi alors qu'il ne devrait pas
    results.push({
      name: 'INSERT immo_score.communes (doit échouer)',
      passed: false,
      detail: 'INCIDENT : INSERT a réussi — cityrank_ro a des droits en écriture !',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const isPermissionDenied =
      msg.toLowerCase().includes('permission denied') ||
      msg.toLowerCase().includes('read-only') ||
      msg.includes('P2010') || // Prisma raw query error
      msg.includes('42501')    // PostgreSQL error code: insufficient_privilege
    results.push({
      name: 'INSERT immo_score.communes (doit échouer)',
      passed: isPermissionDenied,
      detail: isPermissionDenied
        ? 'permission denied confirmé'
        : `Erreur inattendue (ni permission denied, ni succès) : ${msg}`,
    })
  }

  // ──────────────────────────────────────────────────────────
  // Test 3 : Vérifier isolation schéma public (Homilink)
  // has_schema_privilege doit retourner false
  // ──────────────────────────────────────────────────────────
  try {
    const rows = await prismaRO.$queryRawUnsafe<Array<{ has_schema_privilege: boolean }>>(
      `SELECT has_schema_privilege('cityrank_ro', 'public', 'USAGE') AS has_schema_privilege`
    )
    const hasAccess = rows[0]?.has_schema_privilege
    results.push({
      name: "has_schema_privilege('cityrank_ro', 'public', 'USAGE') = false",
      passed: hasAccess === false,
      detail: hasAccess === false
        ? 'Isolation Homilink confirmée (USAGE refusé sur public)'
        : `INCIDENT : cityrank_ro a USAGE sur public — isolation Homilink compromise !`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    results.push({
      name: "has_schema_privilege('cityrank_ro', 'public', 'USAGE') = false",
      passed: false,
      detail: `Erreur lors de la vérification : ${msg}`,
    })
  }

  // ──────────────────────────────────────────────────────────
  // Test 4 : UPDATE sur immo_score — doit ÉCHOUER
  // ──────────────────────────────────────────────────────────
  try {
    await prismaRO.$executeRawUnsafe(
      `UPDATE communes SET nom = 'Hacked' WHERE code_insee = '75056'`
    )
    results.push({
      name: 'UPDATE immo_score.communes (doit échouer)',
      passed: false,
      detail: 'INCIDENT : UPDATE a réussi — cityrank_ro a des droits en écriture !',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const isPermissionDenied =
      msg.toLowerCase().includes('permission denied') ||
      msg.includes('P2010') ||
      msg.includes('42501')
    results.push({
      name: 'UPDATE immo_score.communes (doit échouer)',
      passed: isPermissionDenied,
      detail: isPermissionDenied
        ? 'permission denied confirmé'
        : `Erreur inattendue : ${msg}`,
    })
  }

  // ──────────────────────────────────────────────────────────
  // Affichage des résultats
  // ──────────────────────────────────────────────────────────
  console.log('Résultats :')
  let allPassed = true
  for (const result of results) {
    const icon = result.passed ? '✓' : '✗'
    const label = result.passed ? 'OK  ' : 'FAIL'
    console.log(`  [${icon}] ${label} — ${result.name}`)
    console.log(`         ${result.detail}`)
    if (!result.passed) allPassed = false
  }

  console.log('')
  if (allPassed) {
    console.log('=== Tous les garde-fous sont en place ✓ ===')
  } else {
    console.error('=== ÉCHEC : un ou plusieurs garde-fous ne tiennent pas ===')
    console.error('    Vérifier pg-grants-readonly.sql et re-exécuter sur la BDD.')
    process.exit(1)
  }
}

run()
  .catch((e) => {
    console.error('Erreur fatale :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prismaRO.$disconnect()
  })
