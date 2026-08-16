/**
 * Phase 1 — dev/prod config flags and JWT validation.
 * Run with: node --test scripts/phase-config.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig, validateJwtSecret } from '../server/src/config.js'

const STRONG_SECRET = 'a'.repeat(32)

test('development defaults enable seed and platform migration', () => {
  const config = loadConfig({
    NODE_ENV: 'development',
  })
  assert.equal(config.isDev, true)
  assert.equal(config.seedDefaultAccounts, true)
  assert.equal(config.runPlatformListMigration, true)
  assert.equal(config.requireStrongJwt, false)
  assert.equal(config.jwtSecret, 'dev-secret-change-me')
})

test('production defaults disable seed and platform migration', () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    JWT_SECRET: STRONG_SECRET,
  })
  assert.equal(config.isDev, false)
  assert.equal(config.seedDefaultAccounts, false)
  assert.equal(config.runPlatformListMigration, false)
  assert.equal(config.requireStrongJwt, true)
})

test('explicit env flags override defaults', () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    JWT_SECRET: STRONG_SECRET,
    SEED_DEFAULT_ACCOUNTS: 'true',
    RUN_PLATFORM_LIST_MIGRATION: 'true',
    REQUIRE_STRONG_JWT: 'false',
  })
  assert.equal(config.seedDefaultAccounts, true)
  assert.equal(config.runPlatformListMigration, true)
  assert.equal(config.requireStrongJwt, false)
})

test('production rejects missing JWT_SECRET', () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: 'production' }),
    /JWT_SECRET is required/,
  )
})

test('production rejects weak JWT_SECRET', () => {
  assert.throws(
    () => loadConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'change-me-in-production',
    }),
    /must not use a default or placeholder value/,
  )
})

test('production rejects short JWT_SECRET', () => {
  assert.throws(
    () => loadConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'too-short',
    }),
    /must be at least 32 characters/,
  )
})

test('validateJwtSecret accepts strong secrets', () => {
  assert.doesNotThrow(() => validateJwtSecret(STRONG_SECRET))
})
