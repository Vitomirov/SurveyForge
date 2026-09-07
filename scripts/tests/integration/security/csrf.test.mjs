/**
 * Phase 3 — CSRF and browser-origin enforcement for cookie-authenticated mutations.
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCookieClient, makeApi } from '../../lib/apiClient.mjs'
import {
  enforceCsrf,
  validateBrowserOrigin,
  validateCsrfToken,
} from '../../../../server/src/lib/security/csrf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../../../../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`
const ORIGIN = rootEnv.match(/^CORS_ORIGIN=(.+)/m)?.[1]?.trim() || 'http://localhost:5173'

before(async () => {
  const res = await fetch(`${BASE}/health`)
  const data = await res.json()
  assert.ok(data?.ok, `API not reachable at ${BASE}`)
})

test('validateBrowserOrigin accepts allowlisted Origin and same-site fetches', () => {
  const allowed = ['http://localhost:5173']
  assert.equal(
    validateBrowserOrigin({ headers: { origin: 'http://localhost:5173' } }, allowed),
    true,
  )
  assert.equal(
    validateBrowserOrigin({ headers: { 'sec-fetch-site': 'same-origin' } }, allowed),
    true,
  )
  assert.equal(
    validateBrowserOrigin({ headers: { origin: 'https://evil.example.com' } }, allowed),
    false,
  )
})

test('validateCsrfToken requires matching double-submit values', () => {
  assert.equal(
    validateCsrfToken({
      cookies: { rs_csrf: 'abc' },
      headers: { 'x-csrf-token': 'abc' },
    }),
    true,
  )
  assert.equal(
    validateCsrfToken({
      cookies: { rs_csrf: 'abc' },
      headers: { 'x-csrf-token': 'def' },
    }),
    false,
  )
})

test('enforceCsrf skips public survey writes', () => {
  const result = enforceCsrf({
    url: '/api/public/surveys/survey-id/responses',
    method: 'POST',
    headers: {},
    cookies: {},
  }, {
    corsOrigin: ORIGIN,
    authAllowBearer: false,
  })
  assert.equal(result.ok, true)
})

test('login issues CSRF cookie and authenticated PATCH requires token + origin', async () => {
  const client = createCookieClient(BASE)
  const login = await client.request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@rescopesurveys.local', password: 'admin123' },
  })
  assert.equal(login.status, 200)
  assert.ok(client.getCookies().rs_csrf, 'rs_csrf cookie should be issued')

  const blocked = await makeApi(BASE, { injectTokenFromCookie: false })('/api/auth/me', {
    method: 'PATCH',
    cookies: client.getCookies(),
    origin: 'https://evil.example.com',
    body: { name: 'Blocked' },
  })
  assert.equal(blocked.status, 403)
  assert.equal(blocked.data?.code, 'CSRF_BLOCKED')

  const noToken = await makeApi(BASE, { injectTokenFromCookie: false })('/api/auth/me', {
    method: 'PATCH',
    cookies: { ...client.getCookies(), rs_csrf: undefined },
    origin: ORIGIN,
    body: { name: 'Blocked' },
  })
  assert.equal(noToken.status, 403)

  const ok = await client.request('/api/auth/me', {
    method: 'PATCH',
    origin: ORIGIN,
    body: { name: login.data.session.name },
  })
  assert.equal(ok.status, 200)
})
