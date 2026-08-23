/**
 * Phase R6 — billing and vendor console.
 * Run with: node --test scripts/phase-r6-billing.test.mjs
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeApi, provisionOrg } from '../../lib/rbacFixtures.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../../../../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`
const api = makeApi(BASE)

const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
let fixtures = null
let vendorToken = null
let customerOrgId = null

before(async () => {
  const health = await api('/health')
  assert.ok(health.data?.ok, `API not reachable at ${BASE}`)

  fixtures = await provisionOrg(api, unique)
  customerOrgId = fixtures.adminSession.organizationId

  const vendorLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'vendor@rescopesurveys.local', password: 'vendor123' },
  })
  assert.equal(vendorLogin.status, 200, 'vendor login should succeed (run seed)')
  vendorToken = vendorLogin.data.token
})

test('org admin GET /api/billing/overview returns subscription', async () => {
  const res = await api('/api/billing/overview', { token: fixtures.adminToken })
  assert.equal(res.status, 200)
  assert.ok(res.data.subscription?.planId)
  assert.ok(res.data.usage)
  assert.ok(Array.isArray(res.data.invoices))
})

test('new org signup provisions free trial subscription', async () => {
  const signup = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Trial Org ${unique}`,
      name: 'Trial Admin',
      email: `trial_${unique}@test.com`,
      password: 'testpass123',
    },
  })
  assert.equal(signup.status, 201)

  const overview = await api('/api/billing/overview', { token: signup.data.token })
  assert.equal(overview.status, 200)
  assert.equal(overview.data.subscription.planId, 'free_trial')
  assert.equal(overview.data.subscription.status, 'trialing')
})

test('free trial enforces survey limit', async () => {
  const signup = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Limit Org ${unique}`,
      name: 'Limit Admin',
      email: `limit_${unique}@test.com`,
      password: 'testpass123',
    },
  })
  assert.equal(signup.status, 201)
  const token = signup.data.token

  for (let i = 0; i < 5; i++) {
    const id = `survey_limit_${unique}_${i}`
    const res = await api(`/api/surveys/${id}`, {
      method: 'PATCH',
      token,
      body: {
        survey: { id, title: `Survey ${i}` },
        items: [],
      },
    })
    assert.equal(res.status, 201, `survey ${i} should be created`)
  }

  const blocked = await api(`/api/surveys/survey_limit_${unique}_extra`, {
    method: 'PATCH',
    token,
    body: {
      survey: { id: `survey_limit_${unique}_extra`, title: 'Too many' },
      items: [],
    },
  })
  assert.equal(blocked.status, 403)
  assert.equal(blocked.data.code, 'SURVEY_LIMIT')
})

test('free trial enforces seat limit', async () => {
  const signup = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Seat Org ${unique}`,
      name: 'Seat Admin',
      email: `seat_${unique}@test.com`,
      password: 'testpass123',
    },
  })
  assert.equal(signup.status, 201)

  const blocked = await api('/api/platform/users', {
    method: 'POST',
    token: signup.data.token,
    body: {
      email: `seat2_${unique}@test.com`,
      name: 'Second User',
      password: 'testpass123',
      role: 'editor',
    },
  })
  assert.equal(blocked.status, 403)
  assert.equal(blocked.data.code, 'SEAT_LIMIT')
})

test('editor cannot access org billing endpoints', async () => {
  const res = await api('/api/billing/overview', { token: fixtures.editorToken })
  assert.equal(res.status, 403)
})

test('platform owner lists all organizations', async () => {
  const res = await api('/api/vendor/organizations', { token: vendorToken })
  assert.equal(res.status, 200)
  assert.ok(res.data.organizations.length >= 2)
  const customer = res.data.organizations.find(o => o.id === customerOrgId)
  assert.ok(customer, 'provisioned org should appear')
  assert.ok(customer.subscription)
})

test('platform owner updates subscription and creates invoice', async () => {
  const sub = await api(`/api/vendor/organizations/${customerOrgId}/subscription`, {
    method: 'PATCH',
    token: vendorToken,
    body: { planId: 'professional', status: 'active' },
  })
  assert.equal(sub.status, 200)
  assert.equal(sub.data.subscription.planId, 'professional')
  assert.equal(sub.data.subscription.status, 'active')

  const inv = await api(`/api/vendor/organizations/${customerOrgId}/invoices`, {
    method: 'POST',
    token: vendorToken,
    body: {
      amountCents: 14900,
      status: 'open',
      description: `R6 invoice ${unique}`,
    },
  })
  assert.equal(inv.status, 200)
  assert.equal(inv.data.invoice.amountCents, 14900)

  const overview = await api('/api/billing/overview', { token: fixtures.adminToken })
  assert.equal(overview.status, 200)
  assert.ok(overview.data.invoices.some(i => i.description?.includes(unique)))
})

test('org admin cannot access vendor routes', async () => {
  const list = await api('/api/vendor/organizations', { token: fixtures.adminToken })
  assert.equal(list.status, 403)

  const patch = await api(`/api/vendor/organizations/${customerOrgId}/subscription`, {
    method: 'PATCH',
    token: fixtures.adminToken,
    body: { status: 'canceled' },
  })
  assert.equal(patch.status, 403)
})

test('vendor org is isolated — admin cannot read another org billing via vendor API', async () => {
  const other = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Billing Other ${unique}`,
      name: 'Other Admin',
      email: `billoth_${unique}@test.com`,
      password: 'testpass123',
    },
  })
  assert.equal(other.status, 201)

  const detail = await api(`/api/vendor/organizations/${customerOrgId}`, {
    token: other.data.token,
  })
  assert.equal(detail.status, 403)
})

test('org admin lists current plan only until checkout exists', async () => {
  const res = await api('/api/billing/plans', { token: fixtures.adminToken })
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.data.plans))
  assert.equal(res.data.plans.length, 1)
  assert.equal(res.data.plans[0].direction, 'current')
})

test('org admin cannot self-upgrade subscription', async () => {
  const trial = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `Upgrade Org ${unique}`,
      name: 'Upgrade Admin',
      email: `upgr_${unique}@test.com`,
      password: 'testpass123',
    },
  })
  assert.equal(trial.status, 201)

  const upgrade = await api('/api/billing/subscription', {
    method: 'PATCH',
    token: trial.data.token,
    body: { planId: 'starter' },
  })
  assert.equal(upgrade.status, 400)
  assert.equal(upgrade.data.code, 'PLAN_NOT_AVAILABLE')
})

test('downgrade blocked when team exceeds target seat limit', async () => {
  const downgrade = await api('/api/billing/subscription', {
    method: 'PATCH',
    token: fixtures.adminToken,
    body: { planId: 'free_trial' },
  })
  assert.equal(downgrade.status, 400)
  assert.equal(downgrade.data.code, 'PLAN_NOT_AVAILABLE')
})

test('editor cannot change subscription plan', async () => {
  const res = await api('/api/billing/subscription', {
    method: 'PATCH',
    token: fixtures.editorToken,
    body: { planId: 'professional' },
  })
  assert.equal(res.status, 403)
})

test('expired trial cannot create surveys', async () => {
  const { adminToken, adminSession } = await provisionOrg(api, `${unique}_exp`, { planId: 'free_trial' })
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const patched = await api(`/api/vendor/organizations/${adminSession.organizationId}/subscription`, {
    method: 'PATCH',
    token: vendorToken,
    body: { currentPeriodEnd: past },
  })
  assert.equal(patched.status, 200)

  const blocked = await api(`/api/surveys/survey_exp_${unique}`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      survey: { id: `survey_exp_${unique}`, title: 'Expired' },
      items: [],
    },
  })
  assert.equal(blocked.status, 403)
  assert.equal(blocked.data.code, 'TRIAL_EXPIRED')
})

test('canceled subscription cannot create surveys and public live fetch 404s', async () => {
  const { adminToken, adminSession } = await provisionOrg(api, `${unique}_cancel`, { planId: 'starter' })
  const id = `survey_cancel_${unique}`
  const created = await api(`/api/surveys/${id}`, {
    method: 'PATCH',
    token: adminToken,
    body: { survey: { id, title: 'Will go dark', status: 'live' }, items: [] },
  })
  assert.equal(created.status, 201)

  const live = await api(`/api/public/surveys/${id}`)
  assert.equal(live.status, 200)

  const canceled = await api(`/api/vendor/organizations/${adminSession.organizationId}/subscription`, {
    method: 'PATCH',
    token: vendorToken,
    body: { status: 'canceled' },
  })
  assert.equal(canceled.status, 200)

  const blocked = await api(`/api/surveys/${id}_2`, {
    method: 'PATCH',
    token: adminToken,
    body: { survey: { id: `${id}_2`, title: 'Nope' }, items: [] },
  })
  assert.equal(blocked.status, 403)
  assert.equal(blocked.data.code, 'SUBSCRIPTION_INACTIVE')

  const dark = await api(`/api/public/surveys/${id}`)
  assert.equal(dark.status, 404)
})
