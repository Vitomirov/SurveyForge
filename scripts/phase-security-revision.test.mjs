/**
 * Phase 3 — atomic optimistic concurrency on survey PATCH.
 * Run with: node --test scripts/phase-security-revision.test.mjs
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

const unique = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

before(async () => {
  const res = await api('/health')
  assert.ok(res.data?.ok, `API not reachable at ${BASE}`)
})

test('existing survey PATCH requires revision', async () => {
  const { adminToken } = await provisionOrg(api, `${unique}_req`)
  const id = surveyId('rev_req')
  await createSurvey(api, adminToken, id, 'Needs Revision')

  const missing = await api(`/api/surveys/${id}`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      survey: { id, title: 'No Revision', status: 'draft' },
    },
  })
  assert.equal(missing.status, 400)
  assert.match(missing.data?.error || '', /revision/i)
})

test('parallel PATCH with the same revision: one wins, one 409', async () => {
  const { adminToken } = await provisionOrg(api, `${unique}_race`)
  const id = surveyId('rev_race')
  const created = await createSurvey(api, adminToken, id, 'Race Survey')
  const revision = created.revision

  const [first, second] = await Promise.all([
    api(`/api/surveys/${id}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        survey: { id, title: 'Winner A', status: 'draft' },
        revision,
      },
    }),
    api(`/api/surveys/${id}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        survey: { id, title: 'Winner B', status: 'draft' },
        revision,
      },
    }),
  ])

  const statuses = [first.status, second.status].sort()
  assert.deepEqual(statuses, [200, 409], `expected one 200 and one 409, got ${first.status}/${second.status}`)

  const conflict = first.status === 409 ? first : second
  assert.equal(conflict.data.error, 'Revision conflict')
  assert.equal(conflict.data.revision, revision + 1)

  const row = await api(`/api/surveys/${id}`, { token: adminToken })
  assert.equal(row.data.revision, revision + 1)
  assert.ok(['Winner A', 'Winner B'].includes(row.data.survey.title))
})
