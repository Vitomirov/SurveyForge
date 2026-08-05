/**
 * Phase R3 — server-side RBAC enforcement.
 * Run with: node --test scripts/phase-r3-rbac.test.mjs
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeApi, provisionOrg, createSurvey, surveyId } from './lib/rbacFixtures.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`
const api = makeApi(BASE)

const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

let fixtures = null

before(async () => {
  const health = await api('/health')
  assert.ok(health.data?.ok, `API not reachable at ${BASE}`)
  fixtures = await provisionOrg(api, unique)

  const editorSurvey = surveyId('ed')
  const adminSurvey = surveyId('adm')
  await createSurvey(api, fixtures.editorToken, editorSurvey, 'Editor Survey')
  await createSurvey(api, fixtures.adminToken, adminSurvey, 'Admin Survey')
  fixtures.editorSurvey = editorSurvey
  fixtures.adminSurvey = adminSurvey
})

// ─── Survey access ───────────────────────────────────────────────────────────

test('editor dashboard shows only their surveys', async () => {
  const dash = await api('/api/dashboard', { token: fixtures.editorToken })
  const ids = dash.data.surveys.map(s => s.id)
  assert.ok(ids.includes(fixtures.editorSurvey))
  assert.equal(ids.includes(fixtures.adminSurvey), false)
})

test('admin dashboard shows all org surveys', async () => {
  const dash = await api('/api/dashboard', { token: fixtures.adminToken })
  const ids = dash.data.surveys.map(s => s.id)
  assert.ok(ids.includes(fixtures.editorSurvey))
  assert.ok(ids.includes(fixtures.adminSurvey))
})

test('editor cannot GET another user\'s survey (404, not 403)', async () => {
  const res = await api(`/api/surveys/${fixtures.adminSurvey}`, { token: fixtures.editorToken })
  assert.equal(res.status, 404)
})

test('editor cannot PATCH another user\'s survey', async () => {
  const res = await api(`/api/surveys/${fixtures.adminSurvey}`, {
    method: 'PATCH',
    token: fixtures.editorToken,
    body: {
      survey: { id: fixtures.adminSurvey, title: 'Hijacked', status: 'draft' },
      items: [],
      revision: 1,
    },
  })
  assert.equal(res.status, 404)
})

test('editor cannot DELETE another user\'s survey', async () => {
  const res = await api(`/api/surveys/${fixtures.adminSurvey}`, {
    method: 'DELETE',
    token: fixtures.editorToken,
  })
  assert.equal(res.status, 404)
})

test('editor cannot read responses on another user\'s survey', async () => {
  const res = await api(`/api/surveys/${fixtures.adminSurvey}/responses`, {
    token: fixtures.editorToken,
  })
  assert.equal(res.status, 404)
})

test('editor cannot manage DNC on another user\'s survey', async () => {
  const res = await api(`/api/surveys/${fixtures.adminSurvey}/dnc`, {
    method: 'POST',
    token: fixtures.editorToken,
    body: { emails: ['blocked@example.com'] },
  })
  assert.equal(res.status, 404)
})

// ─── Platform access ─────────────────────────────────────────────────────────

test('editor can read clients and topics', async () => {
  const clients = await api('/api/platform/clients', { token: fixtures.editorToken })
  const topics = await api('/api/platform/topics', { token: fixtures.editorToken })
  assert.equal(clients.status, 200)
  assert.equal(topics.status, 200)
})

test('editor cannot write clients or topics', async () => {
  const client = await api('/api/platform/clients', {
    method: 'POST',
    token: fixtures.editorToken,
    body: { name: 'Forbidden Client' },
  })
  assert.equal(client.status, 403)
  assert.equal(client.data.code, 'FORBIDDEN')

  const topic = await api('/api/platform/topics', {
    method: 'POST',
    token: fixtures.editorToken,
    body: { name: 'Forbidden Topic' },
  })
  assert.equal(topic.status, 403)
})

test('editor cannot access user management', async () => {
  const list = await api('/api/platform/users', { token: fixtures.editorToken })
  assert.equal(list.status, 403)

  const create = await api('/api/platform/users', {
    method: 'POST',
    token: fixtures.editorToken,
    body: {
      username: `hack_${unique}`,
      password: 'testpass123',
      name: 'Hacker',
      role: 'admin',
    },
  })
  assert.equal(create.status, 403)
})

test('editor cannot promote themselves via user PATCH', async () => {
  const res = await api(`/api/platform/users/${fixtures.editorSession.userId}`, {
    method: 'PATCH',
    token: fixtures.editorToken,
    body: { role: 'admin' },
  })
  assert.equal(res.status, 403)
})

test('admin retains full platform and user management access', async () => {
  const users = await api('/api/platform/users', { token: fixtures.adminToken })
  assert.equal(users.status, 200)
  assert.ok(users.data.users.length >= 2)

  const client = await api('/api/platform/clients', {
    method: 'POST',
    token: fixtures.adminToken,
    body: { name: `R3 Client ${unique}` },
  })
  assert.equal(client.status, 200)
})

// ─── User management guardrails ──────────────────────────────────────────────

test('cannot delete user who owns surveys', async () => {
  const res = await api(`/api/platform/users/${fixtures.editorUserId}`, {
    method: 'DELETE',
    token: fixtures.adminToken,
  })
  assert.equal(res.status, 400)
  assert.equal(res.data.code, 'USER_OWNS_SURVEYS')
})

test('cannot demote the last admin', async () => {
  const res = await api(`/api/platform/users/${fixtures.adminSession.userId}`, {
    method: 'PATCH',
    token: fixtures.adminToken,
    body: { role: 'editor' },
  })
  assert.equal(res.status, 400)
  assert.equal(res.data.code, 'LAST_ADMIN')
})
