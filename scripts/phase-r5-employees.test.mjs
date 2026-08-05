/**
 * Phase R5 — admin employee performance API.
 * Run with: node --test scripts/phase-r5-employees.test.mjs
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

  await createSurvey(api, fixtures.editorToken, surveyId('r5ed1'), 'Editor Survey A')
  await createSurvey(api, fixtures.editorToken, surveyId('r5ed2'), 'Editor Survey B')
  await createSurvey(api, fixtures.adminToken, surveyId('r5adm'), 'Admin Survey')
})

test('POST /api/platform/users returns temporaryPassword once', async () => {
  const username = `r5new_${unique}`
  const res = await api('/api/platform/users', {
    method: 'POST',
    token: fixtures.adminToken,
    body: {
      username,
      password: 'temppass123',
      name: 'Temp User',
      role: 'editor',
    },
  })
  assert.equal(res.status, 200)
  assert.ok(res.data.user?.id)
  assert.equal(res.data.temporaryPassword, 'temppass123')
})

test('admin GET /api/admin/employees lists org members with stats', async () => {
  const res = await api('/api/admin/employees', { token: fixtures.adminToken })
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.data.employees))
  assert.ok(res.data.employees.length >= 3)

  const editor = res.data.employees.find(e => e.id === fixtures.editorUserId)
  assert.ok(editor, 'editor should appear')
  assert.equal(editor.surveys.total, 2)
  assert.ok(editor.username)
  assert.ok('completionRate' in editor)
})

test('admin GET /api/admin/employees/:id returns survey drill-down', async () => {
  const res = await api(`/api/admin/employees/${fixtures.editorUserId}`, {
    token: fixtures.adminToken,
  })
  assert.equal(res.status, 200)
  assert.equal(res.data.employee.id, fixtures.editorUserId)
  assert.equal(res.data.surveys.length, 2)
  assert.ok(res.data.surveys[0].title)
  assert.ok(res.data.surveys[0].stats)
})

test('editor cannot access admin employee endpoints', async () => {
  const list = await api('/api/admin/employees', { token: fixtures.editorToken })
  assert.equal(list.status, 403)

  const detail = await api(`/api/admin/employees/${fixtures.adminSession.userId}`, {
    token: fixtures.editorToken,
  })
  assert.equal(detail.status, 403)
})

test('admin cannot read employee from another org', async () => {
  const other = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Other Org ${unique}`,
      name: 'Other Admin',
      username: `other_${unique}`,
      password: 'testpass123',
    },
  })
  assert.equal(other.status, 201)

  const res = await api(`/api/admin/employees/${fixtures.editorUserId}`, {
    token: other.data.token,
  })
  assert.equal(res.status, 404)
})
