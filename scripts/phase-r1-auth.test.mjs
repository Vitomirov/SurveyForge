/**
 * Phase R1 — auth foundation (JWT expiry, DB-backed sessions, role helpers).
 * Run with: node --test scripts/phase-r1-auth.test.mjs
 * Requires API on PORT from .env (default 3003) and Postgres.
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isAdmin, requireRole, surveyScope } from '../server/src/lib/authz.js'
import { ROLES, isAdminRole } from '../server/src/lib/roles.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const JWT_SECRET = rootEnv.match(/^JWT_SECRET=(.+)$/m)?.[1]?.trim() || 'change-me-in-production'
const BASE = `http://127.0.0.1:${PORT}`

const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { status: res.status, data }
}

function decodeJwt(token) {
  const payload = token.split('.')[1]
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
}

/** Build an HS256 JWT with a custom exp (for expiry tests). */
function signTestToken(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const data = `${header}.${body}`
  const sig = createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${sig}`
}

before(async () => {
  const res = await api('/health')
  assert.ok(res.data?.ok, `API not reachable at ${BASE} — start postgres + API first`)
})

// ─── Unit tests (no HTTP) ───────────────────────────────────────────────────

test('roles: admin vs editor constants', () => {
  assert.equal(isAdminRole('admin'), true)
  assert.equal(isAdminRole('editor'), false)
  assert.equal(ROLES.ADMIN, 'admin')
  assert.equal(ROLES.EDITOR, 'editor')
})

test('authz: isAdmin reads request.auth.role', () => {
  assert.equal(isAdmin({ auth: { role: 'admin' } }), true)
  assert.equal(isAdmin({ auth: { role: 'editor' } }), false)
  assert.equal(isAdmin({}), false)
})

test('authz: surveyScope scopes editors to their userId', () => {
  const adminScope = surveyScope({
    auth: { organizationId: 'org1', userId: 'u1', role: 'admin' },
  })
  assert.deepEqual(adminScope, { organizationId: 'org1' })

  const editorScope = surveyScope({
    auth: { organizationId: 'org1', userId: 'u2', role: 'editor' },
  })
  assert.deepEqual(editorScope, { organizationId: 'org1', createdById: 'u2' })
})

test('authz: requireRole rejects wrong role with 403', async () => {
  const handler = requireRole('admin')
  const reply = {
    code(n) { this.status = n; return this },
    send(body) { this.body = body; return this },
  }
  await handler({ auth: { role: 'editor' } }, reply)
  assert.equal(reply.status, 403)
  assert.equal(reply.body.code, 'FORBIDDEN')
})

// ─── Integration tests ────────────────────────────────────────────────────────

test('login issues a JWT with a future exp claim', async () => {
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' },
  })
  assert.equal(login.status, 200)
  const payload = decodeJwt(login.data.token)
  assert.ok(payload.exp, 'token should include exp')
  assert.ok(payload.exp > Math.floor(Date.now() / 1000), 'exp should be in the future')
})

test('GET /api/auth/me returns the live DB role', async () => {
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' },
  })
  const me = await api('/api/auth/me', { token: login.data.token })
  assert.equal(me.status, 200)
  assert.equal(me.data.session.role, 'admin')
  assert.ok(me.data.session.userId)
})

test('expired JWT returns 401 TOKEN_EXPIRED', async () => {
  const expired = signTestToken({
    userId: '00000000-0000-0000-0000-000000000001',
    organizationId: '00000000-0000-0000-0000-000000000002',
    exp: Math.floor(Date.now() / 1000) - 60,
  }, JWT_SECRET)
  const res = await api('/api/auth/me', { token: expired })
  assert.equal(res.status, 401)
  assert.equal(res.data.code, 'TOKEN_EXPIRED')
})

test('garbled JWT returns 401 UNAUTHORIZED', async () => {
  const res = await api('/api/auth/me', { token: 'not.a.valid.jwt' })
  assert.equal(res.status, 401)
  assert.equal(res.data.code, 'UNAUTHORIZED')
})

test('deleted user token returns 401 SESSION_INVALID', async () => {
  const orgName = `R1 Org ${unique}`
  const adminUser = `r1admin_${unique}`
  const editorUser = `r1editor_${unique}`

  const signup = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: orgName,
      name: 'R1 Admin',
      username: adminUser,
      password: 'testpass123',
    },
  })
  assert.equal(signup.status, 201)
  const adminToken = signup.data.token

  const created = await api('/api/platform/users', {
    method: 'POST',
    token: adminToken,
    body: {
      username: editorUser,
      password: 'testpass123',
      name: 'R1 Editor',
      role: 'editor',
    },
  })
  assert.equal(created.status, 200)
  const editorId = created.data.user.id

  const editorLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { username: editorUser, password: 'testpass123' },
  })
  assert.equal(editorLogin.status, 200)
  const editorToken = editorLogin.data.token

  const deleted = await api(`/api/platform/users/${editorId}`, {
    method: 'DELETE',
    token: adminToken,
  })
  assert.equal(deleted.status, 200)

  const me = await api('/api/auth/me', { token: editorToken })
  assert.equal(me.status, 401)
  assert.equal(me.data.code, 'SESSION_INVALID')
})

test('role change in DB is reflected on next request without re-login', async () => {
  const orgName = `R1 Role Org ${unique}`
  const adminUser = `r1roleadmin_${unique}`
  const editorUser = `r1roleeditor_${unique}`

  const signup = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: orgName,
      name: 'Role Admin',
      username: adminUser,
      password: 'testpass123',
    },
  })
  const adminToken = signup.data.token

  const created = await api('/api/platform/users', {
    method: 'POST',
    token: adminToken,
    body: {
      username: editorUser,
      password: 'testpass123',
      name: 'Role Editor',
      role: 'editor',
    },
  })
  const editorId = created.data.user.id

  const editorLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { username: editorUser, password: 'testpass123' },
  })
  const editorToken = editorLogin.data.token

  const before = await api('/api/auth/me', { token: editorToken })
  assert.equal(before.data.session.role, 'editor')

  const promoted = await api(`/api/platform/users/${editorId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { role: 'admin' },
  })
  assert.equal(promoted.status, 200)

  const after = await api('/api/auth/me', { token: editorToken })
  assert.equal(after.status, 200)
  assert.equal(after.data.session.role, 'admin', 'same token should read fresh role from DB')
})
