/**
 * Phase 2 DNC — server-side enforcement + privacy-safe public check.
 * Run with: npm run test:dnc-phase2
 * Requires API on PORT from .env (default 3003) and Postgres.
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeApi, provisionOrg, surveyId, createSurvey } from './lib/rbacFixtures.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`
const api = makeApi(BASE)

const unique = `dnc2_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const EMAIL_Q_ID = 'q_email_dnc2'
const DNC_EMAIL = `blocked_${unique}@example.com`
const CLEAN_EMAIL = `clean_${unique}@example.com`

function responseEntry(id, { status = 'partial', email = null } = {}) {
  const responses = email ? { [EMAIL_Q_ID]: email } : {}
  return {
    id,
    status,
    timestamp: new Date().toISOString(),
    pageReached: 1,
    responses,
    companions: {},
    terminatedBy: null,
    fingerprint: null,
  }
}

async function setLiveWithEmailQuestion(token, id, title, revision) {
  const res = await api(`/api/surveys/${id}`, {
    method: 'PATCH',
    token,
    body: {
      survey: { id, title, status: 'live' },
      items: [{
        id: EMAIL_Q_ID,
        itemType: 'question',
        questionType: 'text',
        text: 'Your email',
        isEmailField: true,
      }],
      revision,
    },
  })
  assert.equal(res.status, 200, `set live ${id}: ${JSON.stringify(res.data)}`)
  return res.data
}

before(async () => {
  const res = await api('/health')
  assert.ok(res.data?.ok, `API not reachable at ${BASE}`)
})

test('public DNC check returns onList without exposing full list', async () => {
  const { adminToken } = await provisionOrg(api, unique)
  const id = surveyId('dnc_pub')
  const created = await createSurvey(api, adminToken, id, 'DNC Public Check')
  await setLiveWithEmailQuestion(adminToken, id, 'DNC Public Check', created.revision)

  await api(`/api/surveys/${id}/dnc`, { method: 'DELETE', token: adminToken })
  await api(`/api/surveys/${id}/dnc`, {
    method: 'POST',
    token: adminToken,
    body: { emails: [DNC_EMAIL] },
  })

  const oldList = await api(`/api/public/surveys/${id}/dnc`, { auth: false })
  assert.equal(oldList.status, 404, 'full-list GET should be removed')

  const blocked = await api(`/api/public/surveys/${id}/dnc/check`, {
    method: 'POST',
    auth: false,
    body: { email: DNC_EMAIL },
  })
  assert.equal(blocked.status, 200)
  assert.equal(blocked.data.onList, true)
  assert.equal(blocked.data.emails, undefined)

  const allowed = await api(`/api/public/surveys/${id}/dnc/check`, {
    method: 'POST',
    auth: false,
    body: { email: CLEAN_EMAIL },
  })
  assert.equal(allowed.status, 200)
  assert.equal(allowed.data.onList, false)

  await api(`/api/surveys/${id}/dnc`, { method: 'DELETE', token: adminToken })
})

test('server overrides complete to dnc on public response submit', async () => {
  const { adminToken } = await provisionOrg(api, `${unique}_pub`)
  const id = surveyId('dnc_srv_pub')
  const created = await createSurvey(api, adminToken, id, 'DNC Server Public')
  await setLiveWithEmailQuestion(adminToken, id, 'DNC Server Public', created.revision)

  await api(`/api/surveys/${id}/dnc`, { method: 'DELETE', token: adminToken })
  await api(`/api/surveys/${id}/dnc`, {
    method: 'POST',
    token: adminToken,
    body: { emails: [DNC_EMAIL] },
  })

  const responseId = `r_dnc_pub_${unique}`
  const submit = await api(`/api/public/surveys/${id}/responses`, {
    method: 'POST',
    body: responseEntry(responseId, { status: 'complete', email: DNC_EMAIL }),
  })
  assert.equal(submit.status, 200, submit.data?.error || '')

  const listed = await api(`/api/surveys/${id}/responses`, { token: adminToken })
  assert.equal(listed.status, 200)
  const saved = listed.data.responses.find(r => r.id === responseId)
  assert.ok(saved, 'response should be saved')
  assert.equal(saved.status, 'dnc')

  await api(`/api/surveys/${id}/dnc`, { method: 'DELETE', token: adminToken })
})

test('server overrides complete to dnc on authenticated response submit', async () => {
  const { adminToken } = await provisionOrg(api, `${unique}_auth`)
  const id = surveyId('dnc_srv_auth')
  const created = await createSurvey(api, adminToken, id, 'DNC Server Auth')
  await setLiveWithEmailQuestion(adminToken, id, 'DNC Server Auth', created.revision)

  await api(`/api/surveys/${id}/dnc`, { method: 'DELETE', token: adminToken })
  await api(`/api/surveys/${id}/dnc`, {
    method: 'POST',
    token: adminToken,
    body: { emails: [DNC_EMAIL] },
  })

  const responseId = `r_dnc_auth_${unique}`
  const submit = await api(`/api/surveys/${id}/responses`, {
    method: 'POST',
    token: adminToken,
    body: responseEntry(responseId, { status: 'complete', email: DNC_EMAIL }),
  })
  assert.equal(submit.status, 200, submit.data?.error || '')

  const listed = await api(`/api/surveys/${id}/responses`, { token: adminToken })
  const saved = listed.data.responses.find(r => r.id === responseId)
  assert.equal(saved?.status, 'dnc')

  await api(`/api/surveys/${id}/dnc`, { method: 'DELETE', token: adminToken })
})

test('unverified client dnc status is corrected to complete', async () => {
  const { adminToken } = await provisionOrg(api, `${unique}_fake`)
  const id = surveyId('dnc_fake')
  const created = await createSurvey(api, adminToken, id, 'DNC Fake Status')
  await setLiveWithEmailQuestion(adminToken, id, 'DNC Fake Status', created.revision)

  await api(`/api/surveys/${id}/dnc`, { method: 'DELETE', token: adminToken })

  const responseId = `r_dnc_fake_${unique}`
  const submit = await api(`/api/public/surveys/${id}/responses`, {
    method: 'POST',
    body: responseEntry(responseId, { status: 'dnc', email: CLEAN_EMAIL }),
  })
  assert.equal(submit.status, 200)

  const listed = await api(`/api/surveys/${id}/responses`, { token: adminToken })
  const saved = listed.data.responses.find(r => r.id === responseId)
  assert.equal(saved?.status, 'complete')
})

test('partial responses are not DNC-overridden', async () => {
  const { adminToken } = await provisionOrg(api, `${unique}_partial`)
  const id = surveyId('dnc_partial')
  const created = await createSurvey(api, adminToken, id, 'DNC Partial')
  await setLiveWithEmailQuestion(adminToken, id, 'DNC Partial', created.revision)

  await api(`/api/surveys/${id}/dnc`, {
    method: 'POST',
    token: adminToken,
    body: { emails: [DNC_EMAIL] },
  })

  const responseId = `r_dnc_partial_${unique}`
  await api(`/api/public/surveys/${id}/responses`, {
    method: 'POST',
    body: responseEntry(responseId, { status: 'partial', email: DNC_EMAIL }),
  })

  const listed = await api(`/api/surveys/${id}/responses`, { token: adminToken })
  const saved = listed.data.responses.find(r => r.id === responseId)
  assert.equal(saved?.status, 'partial')

  await api(`/api/surveys/${id}/dnc`, { method: 'DELETE', token: adminToken })
})
