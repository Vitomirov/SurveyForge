/**
 * Phase 3 — Enterprise domain verification and host matching
 * Run: node --test scripts/phase-brand-phase3.test.mjs
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeApi, provisionOrg, surveyId } from './lib/rbacFixtures.mjs'
import {
  readEffectiveSurveyDomain,
  patchOrgSettings,
  readDomainVerification,
} from '../server/src/lib/platform/orgSettings.js'
import { surveyMatchesRequestHost } from '../server/src/lib/survey/surveyPublicPath.js'
import { resolveVerifiedSurveyDomain, isDomainVerified } from '../shared/domainVerification.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = readFileSync(resolve(__dirname, '../.env'), 'utf8').match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`
const api = makeApi(BASE)

const unique = `brand3_${Date.now()}`
let fixtures = null
let vendorToken = null

before(async () => {
  const health = await api('/health')
  assert.ok(health.data?.ok, `API not reachable at ${BASE}`)
  fixtures = await provisionOrg(api, unique)
  const vendorLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'vendor@rescopesurveys.local', password: 'vendor123' },
  })
  vendorToken = vendorLogin.data.token
})

test('readEffectiveSurveyDomain returns empty until verified', () => {
  const settings = patchOrgSettings({}, {
    surveyDomain: 'enterprise-client.com',
    domainVerification: { domain: 'enterprise-client.com', status: 'pending', txtValue: 'tok' },
  })
  assert.equal(readEffectiveSurveyDomain(settings, 'enterprise'), '')
})

test('readEffectiveSurveyDomain returns domain when verified', () => {
  const settings = patchOrgSettings({}, {
    surveyDomain: 'enterprise-client.com',
    domainVerification: {
      domain: 'enterprise-client.com',
      status: 'verified',
      verifiedAt: new Date().toISOString(),
    },
  })
  assert.equal(readEffectiveSurveyDomain(settings, 'enterprise'), 'enterprise-client.com')
})

test('surveyMatchesRequestHost uses verified domain only', () => {
  const org = {
    subscription: { planId: 'enterprise' },
    settings: patchOrgSettings({}, {
      surveyDomain: 'acme.com',
      domainVerification: { domain: 'acme.com', status: 'pending' },
    }),
  }
  assert.equal(surveyMatchesRequestHost({}, 'acme.com', org), false)

  org.settings = patchOrgSettings(org.settings, {
    domainVerification: { domain: 'acme.com', status: 'verified', verifiedAt: new Date().toISOString() },
  })
  assert.equal(surveyMatchesRequestHost({}, 'acme.com', org), true)
})

test('enterprise domain verification API lifecycle', async () => {
  const orgId = fixtures.adminSession.organizationId
  await api(`/api/vendor/organizations/${orgId}/subscription`, {
    method: 'PATCH',
    token: vendorToken,
    body: { planId: 'enterprise', status: 'active', surveyDomain: 'verify-test.com' },
  })

  const init = await api('/api/billing/domain-verification/init', {
    method: 'POST',
    token: fixtures.adminToken,
  })
  assert.equal(init.status, 200)
  assert.equal(init.data.domainVerification.status, 'pending')
  assert.ok(init.data.domainVerification.txtValue)

  const checkPending = await api('/api/billing/domain-verification/check', {
    method: 'POST',
    token: fixtures.adminToken,
    body: { forceVerified: false },
  })
  assert.equal(checkPending.status, 200)
  assert.notEqual(checkPending.data.domainVerification.status, 'verified')

  const orgRow = await api('/api/billing/domain-verification', { token: fixtures.adminToken })
  assert.equal(orgRow.data.surveyDomain, 'verify-test.com')
})

test('professional plan cannot init domain verification', async () => {
  const proOrg = await provisionOrg(api, `${unique}_pro_dom`)
  await api(`/api/vendor/organizations/${proOrg.adminSession.organizationId}/subscription`, {
    method: 'PATCH',
    token: vendorToken,
    body: { planId: 'professional', status: 'active' },
  })
  const init = await api('/api/billing/domain-verification/init', {
    method: 'POST',
    token: proOrg.adminToken,
  })
  assert.equal(init.status, 403)
})

test('resolveVerifiedSurveyDomain blocks unverified enterprise domain', () => {
  const result = resolveVerifiedSurveyDomain({
    surveyDomain: 'client.com',
    domainVerification: readDomainVerification({ domainVerification: { status: 'failed', domain: 'client.com' } }),
    planAllowsCustomDomain: true,
  })
  assert.equal(result, '')
  assert.equal(isDomainVerified({ status: 'failed', domain: 'client.com' }), false)
})
