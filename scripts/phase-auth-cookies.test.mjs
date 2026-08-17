/**
 * Phase 11 — httpOnly cookie auth + refresh token rotation.
 * Run with: npm run test:auth-cookies
 * Requires API on PORT from .env (default 3003) and Postgres.
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCookieClient, makeApi } from './lib/apiClient.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`

const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const username = `cookie_${unique}`
const password = 'testpass123'
const signupEmail = `${username}@test.com`

function setCookieNames(headers) {
  const list = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : []
  return list.map((header) => header.split('=')[0])
}

before(async () => {
  const res = await fetch(`${BASE}/health`)
  const data = await res.json()
  assert.ok(data?.ok, `API not reachable at ${BASE} — start postgres + API first`)
})

test('login sets httpOnly cookies and JSON has session but no token', async () => {
  const api = makeApi(BASE, { injectTokenFromCookie: false })
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@rescopesurveys.local', password: 'admin123' },
  })
  assert.equal(login.status, 200)
  assert.ok(login.data.session?.userId)
  assert.equal(login.data.token, undefined)
  const names = setCookieNames(login.headers)
  assert.ok(names.includes('rs_access'), 'rs_access Set-Cookie')
  assert.ok(names.includes('rs_refresh'), 'rs_refresh Set-Cookie')
  const accessHeader = login.headers.getSetCookie().find((h) => h.startsWith('rs_access='))
  assert.match(accessHeader, /HttpOnly/i)
  assert.match(accessHeader, /SameSite=Lax/i)
})

test('/api/auth/me works with cookie jar and fails without', async () => {
  const client = createCookieClient(BASE)
  const login = await client.request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@rescopesurveys.local', password: 'admin123' },
  })
  assert.equal(login.status, 200)

  const me = await client.request('/api/auth/me')
  assert.equal(me.status, 200)
  assert.equal(me.data.session.role, 'admin')
  assert.equal(me.data.token, undefined)

  const bare = makeApi(BASE, { injectTokenFromCookie: false })
  const unauth = await bare('/api/auth/me')
  assert.equal(unauth.status, 401)
})

test('refresh rotates cookies and returns a session', async () => {
  const client = createCookieClient(BASE)
  await client.request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@rescopesurveys.local', password: 'admin123' },
  })
  const before = client.getCookies()
  assert.ok(before.rs_access)
  assert.ok(before.rs_refresh)

  const refresh = await client.request('/api/auth/refresh', { method: 'POST' })
  assert.equal(refresh.status, 200)
  assert.ok(refresh.data.session?.userId)
  assert.equal(refresh.data.token, undefined)

  const after = client.getCookies()
  assert.ok(after.rs_access)
  assert.ok(after.rs_refresh)
  assert.notEqual(after.rs_refresh, before.rs_refresh)
})

test('logout clears auth cookies', async () => {
  const client = createCookieClient(BASE)
  await client.request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@rescopesurveys.local', password: 'admin123' },
  })
  const logout = await client.request('/api/auth/logout', { method: 'POST' })
  assert.equal(logout.status, 200)

  const me = await client.request('/api/auth/me')
  assert.equal(me.status, 401)
})

test('refresh reuse returns 401 and revokes the family', async () => {
  const signupApi = makeApi(BASE, { injectTokenFromCookie: false })
  const signup = await signupApi('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Cookie Org ${unique}`,
      name: 'Cookie Admin',
      email: signupEmail,
      password,
    },
  })
  assert.equal(signup.status, 201)
  const firstRefresh = signup.cookies.rs_refresh
  assert.ok(firstRefresh)

  const rotator = createCookieClient(BASE)
  rotator.clear()
  const rotated = await rotator.request('/api/auth/refresh', {
    method: 'POST',
    cookies: { rs_refresh: firstRefresh },
  })
  assert.equal(rotated.status, 200)
  const secondRefresh = rotator.getCookies().rs_refresh
  assert.ok(secondRefresh)
  assert.notEqual(secondRefresh, firstRefresh)

  const reuse = await signupApi('/api/auth/refresh', {
    method: 'POST',
    cookies: { rs_refresh: firstRefresh },
  })
  assert.equal(reuse.status, 401)
  assert.equal(reuse.data.code, 'REUSE_DETECTED')

  const later = await rotator.request('/api/auth/refresh', { method: 'POST' })
  assert.equal(later.status, 401, 'rotated token in the same family must also be revoked')
})
