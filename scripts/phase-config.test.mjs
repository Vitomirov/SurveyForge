/**
 * Phase 1 — dev/prod config flags and JWT validation.
 * Run with: node --test scripts/phase-config.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig, validateJwtSecret, durationToMs, parseCorsOrigin } from '../server/src/config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STRONG_SECRET = 'a'.repeat(32)

test('development defaults enable seed, cookies, and bearer fallback', () => {
  const config = loadConfig({
    NODE_ENV: 'development',
  })
  assert.equal(config.isDev, true)
  assert.equal(config.seedDefaultAccounts, true)
  assert.equal(config.runPlatformListMigration, true)
  assert.equal(config.requireStrongJwt, false)
  assert.equal(config.jwtSecret, 'dev-secret-change-me')
  assert.equal(config.accessTokenExpiresIn, '15m')
  assert.equal(config.jwtExpiresIn, '15m')
  assert.equal(config.refreshTokenExpiresIn, '30d')
  assert.equal(config.cookieSecure, false)
  assert.equal(config.authAllowBearer, true)
  assert.equal(config.corsOrigin, 'http://localhost:5173')
})

test('production defaults disable seed and platform migration', () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    JWT_SECRET: STRONG_SECRET,
    CORS_ORIGIN: 'https://rescopesurveys.com,https://www.rescopesurveys.com',
  })
  assert.equal(config.isDev, false)
  assert.equal(config.seedDefaultAccounts, false)
  assert.equal(config.runPlatformListMigration, false)
  assert.equal(config.requireStrongJwt, true)
  assert.equal(config.cookieSecure, true)
  assert.equal(config.authAllowBearer, false)
  assert.deepEqual(config.corsOrigin, [
    'https://rescopesurveys.com',
    'https://www.rescopesurveys.com',
  ])
})

test('explicit env flags override defaults', () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    JWT_SECRET: STRONG_SECRET,
    CORS_ORIGIN: 'https://app.example.com',
    SEED_DEFAULT_ACCOUNTS: 'true',
    RUN_PLATFORM_LIST_MIGRATION: 'true',
    REQUIRE_STRONG_JWT: 'false',
  })
  assert.equal(config.seedDefaultAccounts, true)
  assert.equal(config.runPlatformListMigration, true)
  assert.equal(config.requireStrongJwt, false)
  assert.equal(config.corsOrigin, 'https://app.example.com')
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

test('durationToMs parses token lifetimes', () => {
  assert.equal(durationToMs('15m', 0), 15 * 60 * 1000)
  assert.equal(durationToMs('30d', 0), 30 * 24 * 60 * 60 * 1000)
  assert.equal(durationToMs('bogus', 9), 9)
})

test('production requires CORS_ORIGIN allowlist', () => {
  assert.throws(
    () => loadConfig({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG_SECRET,
    }),
    /CORS_ORIGIN is required/,
  )
})

test('production rejects wildcard CORS_ORIGIN', () => {
  assert.throws(
    () => loadConfig({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG_SECRET,
      CORS_ORIGIN: 'true',
    }),
    /explicit origin allowlist/,
  )
  assert.throws(
    () => parseCorsOrigin('*', { isDev: false }),
    /explicit origin allowlist/,
  )
})

test('nginx and Caddy ship browser security headers', () => {
  const nginx = readFileSync(resolve(__dirname, '../docker/nginx.conf'), 'utf8')
  assert.match(nginx, /X-Content-Type-Options "nosniff"/)
  assert.match(nginx, /Referrer-Policy "strict-origin-when-cross-origin"/)
  assert.match(nginx, /Permissions-Policy "camera=\(\), microphone=\(\), geolocation=\(\)"/)
  assert.match(nginx, /Content-Security-Policy/)
  assert.match(nginx, /default-src 'self'/)
  assert.doesNotMatch(nginx, /X-Frame-Options/)

  const caddy = readFileSync(resolve(__dirname, '../docker/caddy/Caddyfile'), 'utf8')
  assert.match(caddy, /X-Frame-Options SAMEORIGIN/)
  assert.match(caddy, /rescopesurveys\.com, www\.rescopesurveys\.com/)
  assert.match(caddy, /surveys\.rescopesurveys\.com/)
})
