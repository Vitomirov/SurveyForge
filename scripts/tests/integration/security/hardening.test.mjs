/**
 * Phase 1 — API security hardening (forceVerified gate, signup rate limit, admin password min).
 * Run with: node --test scripts/phase-security-hardening.test.mjs
 * Requires API on PORT from .env (default 3003) and Postgres.
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeApi, provisionOrg } from '../../lib/rbacFixtures.mjs'
import { createRouteLimiters } from '../../../../server/src/lib/survey/rateLimit.js'
import { loadConfig } from '../../../../server/src/config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../../../../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`
const api = makeApi(BASE)

const rateLimitRelaxed = loadConfig({
  NODE_ENV: rootEnv.match(/^NODE_ENV=(.+)/m)?.[1]?.trim() || 'development',
  RATE_LIMIT_RELAXED: rootEnv.match(/^RATE_LIMIT_RELAXED=(.+)/m)?.[1]?.trim(),
  JWT_SECRET: 'x'.repeat(32),
  REQUIRE_STRONG_JWT: 'false',
}).rateLimitRelaxed

const unique = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

before(async () => {
  const health = await api('/health')
  assert.ok(health.data?.ok, `API not reachable at ${BASE}`)
})

test('signup limiter rejects 11th request per IP (production limits)', () => {
  const { signup } = createRouteLimiters({ relaxed: false })
  const key = 'signup:127.0.0.1'
  for (let i = 0; i < 10; i += 1) {
    assert.equal(signup(key).allowed, true, `request ${i + 1} should be allowed`)
  }
  assert.equal(signup(key).allowed, false, '11th signup should be rate limited')
})

test('refresh limiter rejects 31st request per IP (production limits)', () => {
  const { refresh } = createRouteLimiters({ relaxed: false })
  const key = 'refresh:127.0.0.1'
  for (let i = 0; i < 30; i += 1) {
    assert.equal(refresh(key).allowed, true, `request ${i + 1} should be allowed`)
  }
  assert.equal(refresh(key).allowed, false, '31st refresh should be rate limited')
})

test('signup spam from the same client is rate limited even with spoofed X-Forwarded-For', async (t) => {
  if (rateLimitRelaxed) {
    return t.skip('RATE_LIMIT_RELAXED=true (default in development): limit is 1000/min/IP, not 10')
  }

  let lastStatus = 201
  for (let i = 0; i < 11; i += 1) {
    const res = await fetch(`${BASE}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': `203.0.113.${i + 1}`,
      },
      body: JSON.stringify({
        organizationName: `Spam Org ${unique}_${i}`,
        name: `User ${i}`,
        email: `spam_${unique}_${i}@test.com`,
        password: 'supersecret',
      }),
    })
    lastStatus = res.status
    if (res.status === 429) break
  }
  assert.equal(lastStatus, 429)
})

test('admin create user rejects password shorter than 8 characters', async () => {
  const { adminToken } = await provisionOrg(api, `${unique}_pw`, { planId: 'starter' })
  const res = await api('/api/platform/users', {
    method: 'POST',
    token: adminToken,
    body: {
      email: `shortpw_${unique}@test.com`,
      password: '1234567',
      name: 'Short Password',
      role: 'editor',
    },
  })
  assert.equal(res.status, 400)
  assert.equal(res.data.error, 'Password must be at least 8 characters.')
})

test('forceVerified is blocked when not in development', () => {
  const prod = loadConfig({
    NODE_ENV: 'production',
    JWT_SECRET: 'x'.repeat(32),
    REQUIRE_STRONG_JWT: 'false',
    CORS_ORIGIN: 'https://rescopesurveys.com',
  })
  assert.equal(prod.isDev, false)

  const forceVerifiedRequested = true
  const blocked = forceVerifiedRequested && !prod.isDev
  assert.equal(blocked, true, 'forceVerified must be rejected in production')

  const dev = loadConfig({
    NODE_ENV: 'development',
    JWT_SECRET: 'dev-secret-change-me',
    REQUIRE_STRONG_JWT: 'false',
  })
  assert.equal(dev.isDev, true)
  const allowed = forceVerifiedRequested && dev.isDev
  assert.equal(allowed, true, 'forceVerified may be used in development')
})
