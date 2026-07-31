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

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { status: res.status, data }
}

const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const username = `owner_${unique}`

test('signup creates org + admin and returns a token', async () => {
  const res = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Test Org ${unique}`,
      name: 'Test Owner',
      username,
      password: 'supersecret',
    },
  })
  assert.equal(res.status, 201)
  assert.ok(res.data.token, 'token returned')
  assert.equal(res.data.session.role, 'admin')
  assert.ok(res.data.session.organizationId)
  assert.equal(res.data.session.organizationName, `Test Org ${unique}`)
})

test('login returns organization name in session', async () => {
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { username, password: 'supersecret' },
  })
  assert.equal(login.status, 200)
  assert.equal(login.data.session.organizationName, `Test Org ${unique}`)
})

test('new org starts empty and isolated', async () => {
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { username, password: 'supersecret' },
  })
  assert.equal(login.status, 200)
  const token = login.data.token

  const dash = await api('/api/dashboard', { token })
  assert.equal(dash.status, 200)
  assert.equal(dash.data.surveys.length, 0, 'fresh org has no surveys')

  // Platform lists were seeded for the new org
  const clients = await api('/api/platform/clients', { token })
  assert.equal(clients.status, 200)
  assert.ok(clients.data.clients.length >= 1)
})

test('duplicate username is rejected', async () => {
  const res = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: 'Another Org',
      name: 'Dup User',
      username,
      password: 'supersecret',
    },
  })
  assert.equal(res.status, 409)
})

test('signup validates required fields and password length', async () => {
  const missing = await api('/api/auth/signup', {
    method: 'POST',
    body: { organizationName: '', name: '', username: '', password: '' },
  })
  assert.equal(missing.status, 400)

  const shortPw = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Short PW ${unique}`,
      name: 'Test',
      username: `shortpw_${unique}`,
      password: 'abc',
    },
  })
  assert.equal(shortPw.status, 400)
})
