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

test('self-service password change revokes other sessions but keeps current device logged in', async () => {
  const signupApi = makeApi(BASE, { injectTokenFromCookie: false })
  const pwEmail = `pwself_${unique}@test.com`
  const oldPassword = 'testpass123'
  const newPassword = 'newpass456'

  const signup = await signupApi('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `PW Self Org ${unique}`,
      name: 'PW Self User',
      email: pwEmail,
      password: oldPassword,
    },
  })
  assert.equal(signup.status, 201)

  const sessionA = createCookieClient(BASE)
  const loginA = await sessionA.request('/api/auth/login', {
    method: 'POST',
    body: { email: pwEmail, password: oldPassword },
  })
  assert.equal(loginA.status, 200)
  const refreshCookieA = sessionA.getCookies().rs_refresh
  assert.ok(refreshCookieA)

  const sessionB = createCookieClient(BASE)
  const loginB = await sessionB.request('/api/auth/login', {
    method: 'POST',
    body: { email: pwEmail, password: oldPassword },
  })
  assert.equal(loginB.status, 200)
  const refreshCookieB = sessionB.getCookies().rs_refresh
  const accessCookieB = sessionB.getCookies().rs_access
  assert.ok(refreshCookieB)
  assert.ok(accessCookieB)
  assert.notEqual(refreshCookieB, refreshCookieA)

  const patch = await sessionA.request('/api/auth/me', {
    method: 'PATCH',
    body: { currentPassword: oldPassword, newPassword },
  })
  assert.equal(patch.status, 200)
  const names = setCookieNames(patch.headers)
  assert.ok(names.includes('rs_access'), 'password change should re-issue access cookie')
  assert.ok(names.includes('rs_refresh'), 'password change should re-issue refresh cookie')

  const staleMe = await signupApi('/api/auth/me', {
    cookies: { rs_access: accessCookieB },
  })
  assert.equal(staleMe.status, 401, 'other session access token must be invalid after password change')
  assert.equal(staleMe.data.code, 'SESSION_INVALID')

  const staleB = await signupApi('/api/auth/refresh', {
    method: 'POST',
    cookies: { rs_refresh: refreshCookieB },
  })
  assert.equal(staleB.status, 401, 'other session refresh token must be revoked')

  const currentMe = await sessionA.request('/api/auth/me')
  assert.equal(currentMe.status, 200, 'current device must stay authenticated')

  const current = await sessionA.request('/api/auth/refresh', { method: 'POST' })
  assert.equal(current.status, 200, 'current session should still refresh after password change')
})

test('admin password reset revokes victim sessions', async () => {
  const api = makeApi(BASE, { injectTokenFromCookie: false })
  const adminEmail = `pwadm_${unique}@test.com`
  const editorEmail = `pwedit_${unique}@test.com`
  const oldPassword = 'testpass123'
  const newPassword = 'adminreset789'

  const signup = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `PW Admin Org ${unique}`,
      name: 'PW Admin',
      email: adminEmail,
      password: oldPassword,
    },
  })
  assert.equal(signup.status, 201)
  const orgId = signup.data.session.organizationId
  const adminToken = signup.cookies.rs_access

  const vendorLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'vendor@rescopesurveys.local', password: 'vendor123' },
  })
  assert.equal(vendorLogin.status, 200)
  const vendorToken = vendorLogin.cookies.rs_access
  const upgrade = await api(`/api/vendor/organizations/${orgId}/subscription`, {
    method: 'PATCH',
    token: vendorToken,
    body: { planId: 'starter', status: 'active' },
  })
  assert.equal(upgrade.status, 200)

  const created = await api('/api/platform/users', {
    method: 'POST',
    token: adminToken,
    body: {
      email: editorEmail,
      password: oldPassword,
      name: 'PW Editor',
      role: 'editor',
    },
  })
  assert.equal(created.status, 200)
  const editorId = created.data.user.id

  const editorClient = createCookieClient(BASE)
  const editorLogin = await editorClient.request('/api/auth/login', {
    method: 'POST',
    body: { email: editorEmail, password: oldPassword },
  })
  assert.equal(editorLogin.status, 200)
  const editorRefresh = editorClient.getCookies().rs_refresh
  const editorAccess = editorClient.getCookies().rs_access
  assert.ok(editorRefresh)

  const reset = await api(`/api/platform/users/${editorId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { password: newPassword },
  })
  assert.equal(reset.status, 200)

  const staleMe = await api('/api/auth/me', {
    cookies: { rs_access: editorAccess },
  })
  assert.equal(staleMe.status, 401, 'victim access token must be invalid after admin reset')
  assert.equal(staleMe.data.code, 'SESSION_INVALID')

  const stale = await api('/api/auth/refresh', {
    method: 'POST',
    cookies: { rs_refresh: editorRefresh },
  })
  assert.equal(stale.status, 401, 'victim refresh token must be revoked after admin reset')

  const relogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: editorEmail, password: newPassword },
  })
  assert.equal(relogin.status, 200)
})

test('profile update without password does not revoke sessions', async () => {
  const client = createCookieClient(BASE)
  const login = await client.request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@rescopesurveys.local', password: 'admin123' },
  })
  assert.equal(login.status, 200)
  const refreshBefore = client.getCookies().rs_refresh
  assert.ok(refreshBefore)

  const patch = await client.request('/api/auth/me', {
    method: 'PATCH',
    body: { name: `Admin ${unique}` },
  })
  assert.equal(patch.status, 200)

  const refresh = await client.request('/api/auth/refresh', {
    method: 'POST',
    cookies: { rs_refresh: refreshBefore },
  })
  assert.equal(refresh.status, 200, 'refresh token should remain valid after non-password profile update')
})
