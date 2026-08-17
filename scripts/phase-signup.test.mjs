/**
 * Signup smoke tests — organization self-service provisioning.
 * Run with: node --test scripts/phase-signup.test.mjs
 * Requires API on PORT from .env (default 3003) and Postgres.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeApi } from './lib/apiClient.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`

const api = makeApi(BASE)

const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const email = `owner_${unique}@test.com`

test('signup creates org + admin and returns a token', async () => {
  const res = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Test Org ${unique}`,
      name: 'Test Owner',
      email,
      password: 'supersecret',
    },
  })
  assert.equal(res.status, 201)
  assert.ok(res.cookies.rs_access || res.data.token, 'access cookie set')
  assert.equal(res.data.session.role, 'admin')
  assert.ok(res.data.session.organizationId)
  assert.equal(res.data.session.organizationName, `Test Org ${unique}`)
})

test('login returns organization name in session', async () => {
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'supersecret' },
  })
  assert.equal(login.status, 200)
  assert.equal(login.data.session.organizationName, `Test Org ${unique}`)
})

test('new org starts empty and isolated', async () => {
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'supersecret' },
  })
  assert.equal(login.status, 200)
  const token = login.data.token

  const dash = await api('/api/dashboard', { token })
  assert.equal(dash.status, 200)
  assert.equal(dash.data.surveys.length, 0, 'fresh org has no surveys')

  const clients = await api('/api/platform/clients', { token })
  assert.equal(clients.status, 200)
  assert.ok(Array.isArray(clients.data.clients))
})

test('duplicate email is rejected', async () => {
  const res = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: 'Another Org',
      name: 'Dup User',
      email,
      password: 'supersecret',
    },
  })
  assert.equal(res.status, 409)
})

test('same local-part in different orgs both succeed', async () => {
  const localPart = `john_${unique}`
  const first = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Org A ${unique}`,
      name: 'John A',
      email: `${localPart}@a.com`,
      password: 'supersecret',
    },
  })
  assert.equal(first.status, 201)

  const second = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Org B ${unique}`,
      name: 'John B',
      email: `${localPart}@b.com`,
      password: 'supersecret',
    },
  })
  assert.equal(second.status, 201)
})

test('admin derives disambiguated usernames for same local-part in one org', async () => {
  const signup = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Username Org ${unique}`,
      name: 'Admin',
      email: `admin_${unique}@test.com`,
      password: 'supersecret',
    },
  })
  assert.equal(signup.status, 201)
  const token = signup.data.token
  const orgId = signup.data.session.organizationId

  const vendorLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'vendor@rescopesurveys.local', password: 'vendor123' },
  })
  assert.equal(vendorLogin.status, 200)
  const upgrade = await api(`/api/vendor/organizations/${orgId}/subscription`, {
    method: 'PATCH',
    token: vendorLogin.data.token,
    body: { planId: 'starter', status: 'active' },
  })
  assert.equal(upgrade.status, 200)

  const first = await api('/api/platform/users', {
    method: 'POST',
    token,
    body: {
      email: `john.${unique}@company.com`,
      password: 'supersecret',
      name: 'John A',
      role: 'editor',
    },
  })
  assert.equal(first.status, 200)
  assert.equal(first.data.user.username, `john.${unique}`)

  const second = await api('/api/platform/users', {
    method: 'POST',
    token,
    body: {
      email: `john.${unique}@other.com`,
      password: 'supersecret',
      name: 'John B',
      role: 'editor',
    },
  })
  assert.equal(second.status, 200)
  assert.equal(second.data.user.username, `john.${unique}-2`)
})

test('login rejects wrong password with generic message', async () => {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'wrongpassword' },
  })
  assert.equal(res.status, 401)
  assert.equal(res.data.error, 'Invalid email or password.')
})

test('login rejects unknown email with same generic message', async () => {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { email: `nobody_${unique}@test.com`, password: 'supersecret' },
  })
  assert.equal(res.status, 401)
  assert.equal(res.data.error, 'Invalid email or password.')
})

test('signup validates required fields and password length', async () => {
  const missing = await api('/api/auth/signup', {
    method: 'POST',
    body: { organizationName: '', name: '', email: '', password: '' },
  })
  assert.equal(missing.status, 400)

  const shortPw = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Short PW ${unique}`,
      name: 'Test',
      email: `shortpw_${unique}@test.com`,
      password: 'abc',
    },
  })
  assert.equal(shortPw.status, 400)
})
