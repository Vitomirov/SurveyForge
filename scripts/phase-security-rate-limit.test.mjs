/**
 * Phase 5 — public endpoint hardening (rate limit + status allowlist).
 * Run with: node --test scripts/phase-security-rate-limit.test.mjs
 * Requires API on PORT from .env (default 3003) and Postgres.
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { makeApi, provisionOrg, surveyId, createSurvey } from './lib/rbacFixtures.mjs'
import { createRateLimiter, clientIp, pruneExpiredRateLimitBuckets } from '../server/src/lib/survey/rateLimit.js'
import { publicErrorResponse } from '../server/src/lib/httpErrors.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`
const api = makeApi(BASE)

const unique = `rl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

before(async () => {
  const res = await api('/health')
  assert.ok(res.data?.ok, `API not reachable at ${BASE}`)
})

test('createRateLimiter rejects bursts over max', () => {
  const limit = createRateLimiter({ windowMs: 60_000, max: 2 })
  assert.equal(limit('burst').allowed, true)
  assert.equal(limit('burst').allowed, true)
  assert.equal(limit('burst').allowed, false)
})

test('pruneExpiredRateLimitBuckets starts a new window after expiry', () => {
  const key = `prune_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const limit = createRateLimiter({ windowMs: 60_000, max: 2 })
  assert.equal(limit(key).allowed, true)
  assert.equal(limit(key).allowed, true)
  assert.equal(limit(key).allowed, false)
  pruneExpiredRateLimitBuckets(Date.now() + 61_000)
  const next = limit(key)
  assert.equal(next.allowed, true)
  assert.equal(next.remaining, 1)
})

test('clientIp uses request.ip and ignores X-Forwarded-For', () => {
  assert.equal(
    clientIp({ ip: '203.0.113.10', headers: { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' } }),
    '203.0.113.10',
  )
})

test('production 500 responses are generic; oversized bodies map to 413', () => {
  const hidden = publicErrorResponse(new Error('secret stack'), { isDev: false })
  assert.equal(hidden.status, 500)
  assert.deepEqual(hidden.body, { error: 'Internal server error' })

  const oversized = publicErrorResponse({ code: 'FST_ERR_CTP_BODY_TOO_LARGE', statusCode: 413 }, { isDev: false })
  assert.equal(oversized.status, 413)
  assert.deepEqual(oversized.body, { error: 'Payload too large' })
})

test('invalid response status returns 400; valid taker submit succeeds', async () => {
  const { adminToken } = await provisionOrg(api, unique)
  const id = surveyId('rl')
  const created = await createSurvey(api, adminToken, id, 'Rate Limit Survey')
  const live = await api(`/api/surveys/${id}`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      survey: { id, title: 'Rate Limit Survey', status: 'live' },
      items: [],
      revision: created.revision,
    },
  })
  assert.equal(live.status, 200, JSON.stringify(live.data))

  const invalid = await api(`/api/public/surveys/${id}/responses`, {
    method: 'POST',
    body: {
      id: randomUUID(),
      status: 'hacked',
      timestamp: new Date().toISOString(),
      responses: {},
    },
  })
  assert.equal(invalid.status, 400)
  assert.match(invalid.data?.error || '', /status/i)

  const ok = await api(`/api/public/surveys/${id}/responses`, {
    method: 'POST',
    body: {
      status: 'complete',
      timestamp: new Date().toISOString(),
      responses: {},
    },
  })
  assert.equal(ok.status, 200, JSON.stringify(ok.data))
  assert.equal(ok.data.ok, true)
  assert.match(ok.data.id, /^[0-9a-f-]{36}$/i)

  const unknown = await api(`/api/public/surveys/${id}/responses`, {
    method: 'POST',
    body: {
      status: 'complete',
      responses: { q_not_in_survey: 'x' },
    },
  })
  assert.equal(unknown.status, 400)
  assert.match(unknown.data?.error || '', /unknown question/i)

  const badId = await api(`/api/public/surveys/${id}/responses`, {
    method: 'POST',
    body: {
      id: `r_not_a_uuid_${unique}`,
      status: 'complete',
      responses: {},
    },
  })
  assert.equal(badId.status, 400)
  assert.match(badId.data?.error || '', /UUID/i)
})
