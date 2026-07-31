/**
 * Phase B4 smoke tests — platform CRUD + DNC per survey.
 * Run with: node --test scripts/phase-b4.test.mjs
 * Requires API on PORT from .env (default 3003) and Postgres.
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`

let token = ''
let surveyId = ''
let clientId = ''
let topicId = ''
let testUserId = ''

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (auth && token) headers.Authorization = `Bearer ${token}`

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

before(async () => {
  const login = await api('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { username: 'admin', password: 'admin123' },
  })
  assert.equal(login.status, 200, 'login should succeed')
  token = login.data.token
  assert.ok(token, 'token required')

  const dash = await api('/api/dashboard')
  assert.equal(dash.status, 200)
  surveyId = dash.data.surveys?.[0]?.id
  assert.ok(surveyId, 'need at least one survey for DNC tests')
})

test('GET /api/platform/clients returns seeded clients', async () => {
  const { status, data } = await api('/api/platform/clients')
  assert.equal(status, 200)
  assert.ok(Array.isArray(data.clients))
  assert.ok(data.clients.length >= 1)
})

test('client CRUD lifecycle', async () => {
  const created = await api('/api/platform/clients', {
    method: 'POST',
    body: { name: 'B4 Test Client' },
  })
  assert.equal(created.status, 200)
  clientId = created.data.client.id
  assert.ok(clientId)

  const updated = await api(`/api/platform/clients/${clientId}`, {
    method: 'PATCH',
    body: { name: 'B4 Updated Client' },
  })
  assert.equal(updated.status, 200)
  assert.equal(updated.data.client.name, 'B4 Updated Client')

  const del = await api(`/api/platform/clients/${clientId}`, { method: 'DELETE' })
  assert.equal(del.status, 200)
  clientId = ''
})

test('topic CRUD lifecycle', async () => {
  const created = await api('/api/platform/topics', {
    method: 'POST',
    body: { name: 'B4 Test Topic' },
  })
  assert.equal(created.status, 200)
  topicId = created.data.topic.id

  const updated = await api(`/api/platform/topics/${topicId}`, {
    method: 'PATCH',
    body: { name: 'B4 Updated Topic' },
  })
  assert.equal(updated.status, 200)
  assert.equal(updated.data.topic.name, 'B4 Updated Topic')

  const del = await api(`/api/platform/topics/${topicId}`, { method: 'DELETE' })
  assert.equal(del.status, 200)
  topicId = ''
})

test('user CRUD lifecycle', async () => {
  const created = await api('/api/platform/users', {
    method: 'POST',
    body: {
      username: `b4user_${Date.now()}`,
      password: 'testpass123',
      name: 'B4 Test User',
      role: 'editor',
    },
  })
  assert.equal(created.status, 200)
  testUserId = created.data.user.id

  const updated = await api(`/api/platform/users/${testUserId}`, {
    method: 'PATCH',
    body: { name: 'B4 Renamed User' },
  })
  assert.equal(updated.status, 200)
  assert.equal(updated.data.user.name, 'B4 Renamed User')

  const del = await api(`/api/platform/users/${testUserId}`, { method: 'DELETE' })
  assert.equal(del.status, 200)
  testUserId = ''
})

test('DNC import, list, remove, clear', async () => {
  const email = 'dnc-test@example.com'

  await api(`/api/surveys/${surveyId}/dnc`, { method: 'DELETE' })

  const imported = await api(`/api/surveys/${surveyId}/dnc`, {
    method: 'POST',
    body: { emails: [email, 'bad-not-email', email.toUpperCase()] },
  })
  assert.equal(imported.status, 200)
  assert.equal(imported.data.count, 1)

  const list = await api(`/api/surveys/${surveyId}/dnc`)
  assert.equal(list.status, 200)
  assert.deepEqual(list.data.emails, [email])

  const removed = await api(`/api/surveys/${surveyId}/dnc/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  })
  assert.equal(removed.status, 200)

  const afterRemove = await api(`/api/surveys/${surveyId}/dnc`)
  assert.equal(afterRemove.data.emails.length, 0)

  await api(`/api/surveys/${surveyId}/dnc`, {
    method: 'POST',
    body: { emails: [email] },
  })
  const cleared = await api(`/api/surveys/${surveyId}/dnc`, { method: 'DELETE' })
  assert.equal(cleared.status, 200)
})

test('public DNC list for live survey (no auth)', async () => {
  const email = 'public-dnc@example.com'

  await api(`/api/surveys/${surveyId}/dnc`, { method: 'DELETE' })
  await api(`/api/surveys/${surveyId}/dnc`, {
    method: 'POST',
    body: { emails: [email] },
  })

  const noAuth = await api(`/api/surveys/${surveyId}/dnc`, { auth: false })
  assert.equal(noAuth.status, 401)

  const pub = await api(`/api/public/surveys/${surveyId}/dnc`, { auth: false })
  // 404 when survey is not live; 200 with emails when live
  if (pub.status === 200) {
    assert.ok(pub.data.emails.includes(email))
  } else {
    assert.equal(pub.status, 404)
  }

  await api(`/api/surveys/${surveyId}/dnc`, { method: 'DELETE' })
})

test('platform routes require auth', async () => {
  const { status } = await api('/api/platform/clients', { auth: false })
  assert.equal(status, 401)
})
