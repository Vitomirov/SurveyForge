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

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`

const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const surveyId = () => `s_r2_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

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

async function signupOrg(adminUsername) {
  const res = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `R2 Org ${unique}`,
      name: 'R2 Admin',
      username: adminUsername,
      password: 'testpass123',
    },
  })
  assert.equal(res.status, 201)
  return res.data
}

async function addEditor(adminToken, username) {
  const res = await api('/api/platform/users', {
    method: 'POST',
    token: adminToken,
    body: { username, password: 'testpass123', name: 'R2 Editor', role: 'editor' },
  })
  assert.equal(res.status, 200)
  return res.data.user
}

async function login(username) {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { username, password: 'testpass123' },
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
  const adminUser = `r2adm_${unique}`
  const editorUser = `r2ed_${unique}`
  const { token: adminToken } = await signupOrg(adminUser)
  await addEditor(adminToken, editorUser)

  const { token: editorToken, session: editorSession } = await login(editorUser)
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
  const adminUser = `r2adm2_${unique}`
  const { token: adminToken, session: adminSession } = await signupOrg(adminUser)
  const id = surveyId()
  await createSurvey(adminToken, id, 'Admin Survey')

  const row = await api(`/api/surveys/${id}`, { token: adminToken })
  assert.equal(row.data.ownerId, adminSession.userId)
  assert.equal(row.data.ownerName, 'R2 Admin')
})

test('admin editing an editor survey does not steal ownership', async () => {
  const adminUser = `r2adm3_${unique}`
  const editorUser = `r2ed3_${unique}`
  const { token: adminToken } = await signupOrg(adminUser)
  await addEditor(adminToken, editorUser)

  const { token: editorToken, session: editorSession } = await login(editorUser)
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
  const adminUser = `r2adm4_${unique}`
  const editorUser = `r2ed4_${unique}`
  const { token: adminToken } = await signupOrg(adminUser)
  await addEditor(adminToken, editorUser)

  const { token: editorToken } = await login(editorUser)
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
