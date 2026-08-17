/**
 * Phase R2 — survey ownership (createdById, no access filtering yet).
 * Run with: node --test scripts/phase-r2-ownership.test.mjs
 * Requires API on PORT from .env (default 3003) and Postgres with R2 migration applied.
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeApi } from './lib/apiClient.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`

const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const surveyId = () => `s_r2_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const api = makeApi(BASE)

async function upgradeOrg(orgId) {
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
}

async function signupOrg(adminEmail) {
  const res = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `R2 Org ${unique}`,
      name: 'R2 Admin',
      email: adminEmail,
      password: 'testpass123',
    },
  })
  assert.equal(res.status, 201)
  await upgradeOrg(res.data.session.organizationId)
  return res.data
}

async function addEditor(adminToken, editorEmail) {
  const res = await api('/api/platform/users', {
    method: 'POST',
    token: adminToken,
    body: { email: editorEmail, password: 'testpass123', name: 'R2 Editor', role: 'editor' },
  })
  assert.equal(res.status, 200)
  return res.data.user
}

async function loginUser(email) {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'testpass123' },
  })
  assert.equal(res.status, 200)
  return res.data
}

async function createSurvey(token, id, title) {
  const res = await api(`/api/surveys/${id}`, {
    method: 'PATCH',
    token,
    body: {
      survey: { id, title, status: 'draft' },
      items: [],
    },
  })
  assert.equal(res.status, 201, `create survey ${id}: ${JSON.stringify(res.data)}`)
  return res.data
}

before(async () => {
  const res = await api('/health')
  assert.ok(res.data?.ok, `API not reachable at ${BASE}`)
})

test('editor-created survey records the editor as owner', async () => {
  const adminEmail = `r2adm_${unique}@test.com`
  const editorEmail = `r2ed_${unique}@test.com`
  const { token: adminToken } = await signupOrg(adminEmail)
  await addEditor(adminToken, editorEmail)

  const { token: editorToken, session: editorSession } = await loginUser(editorEmail)
  const id = surveyId()
  await createSurvey(editorToken, id, 'Editor Survey')

  const row = await api(`/api/surveys/${id}`, { token: editorToken })
  assert.equal(row.status, 200)
  assert.equal(row.data.ownerId, editorSession.userId)
  assert.equal(row.data.ownerName, 'R2 Editor')

  const dash = await api('/api/dashboard', { token: editorToken })
  const entry = dash.data.surveys.find(s => s.id === id)
  assert.ok(entry, 'survey appears on dashboard')
  assert.equal(entry.ownerId, editorSession.userId)
  assert.equal(entry.ownerName, 'R2 Editor')
})

test('admin-created survey records the admin as owner', async () => {
  const adminEmail = `r2adm2_${unique}@test.com`
  const { token: adminToken, session: adminSession } = await signupOrg(adminEmail)
  const id = surveyId()
  await createSurvey(adminToken, id, 'Admin Survey')

  const row = await api(`/api/surveys/${id}`, { token: adminToken })
  assert.equal(row.data.ownerId, adminSession.userId)
  assert.equal(row.data.ownerName, 'R2 Admin')
})

test('admin editing an editor survey does not steal ownership', async () => {
  const adminEmail = `r2adm3_${unique}@test.com`
  const editorEmail = `r2ed3_${unique}@test.com`
  const { token: adminToken } = await signupOrg(adminEmail)
  await addEditor(adminToken, editorEmail)

  const { token: editorToken, session: editorSession } = await loginUser(editorEmail)
  const id = surveyId()
  await createSurvey(editorToken, id, 'Original Title')

  const edited = await api(`/api/surveys/${id}`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      survey: { id, title: 'Admin Retitled', status: 'draft' },
      items: [],
      revision: 1,
    },
  })
  assert.equal(edited.status, 200)

  const row = await api(`/api/surveys/${id}`, { token: adminToken })
  assert.equal(row.data.survey.title, 'Admin Retitled')
  assert.equal(row.data.ownerId, editorSession.userId, 'owner must stay the original creator')
  assert.equal(row.data.ownerName, 'R2 Editor')
})

test('editor dashboard lists only surveys they created', async () => {
  const adminEmail = `r2adm4_${unique}@test.com`
  const editorEmail = `r2ed4_${unique}@test.com`
  const { token: adminToken } = await signupOrg(adminEmail)
  await addEditor(adminToken, editorEmail)

  const { token: editorToken } = await loginUser(editorEmail)
  const editorSurveyId = surveyId()
  const adminSurveyId = surveyId()
  await createSurvey(editorToken, editorSurveyId, 'Editor Only')
  await createSurvey(adminToken, adminSurveyId, 'Admin Only')

  const editorDash = await api('/api/dashboard', { token: editorToken })
  const adminDash = await api('/api/dashboard', { token: adminToken })

  assert.ok(editorDash.data.surveys.some(s => s.id === editorSurveyId))
  assert.equal(
    editorDash.data.surveys.some(s => s.id === adminSurveyId),
    false,
    'editor dashboard must not include another user\'s survey (Phase 3+)'
  )
  assert.ok(adminDash.data.surveys.some(s => s.id === editorSurveyId))
  assert.ok(adminDash.data.surveys.some(s => s.id === adminSurveyId))
})
