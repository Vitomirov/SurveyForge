/**
 * Phase 1 — Brand Kit foundations (server enforcement + public branding)
 * Run: node --test scripts/phase-brand-phase1.test.mjs
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeApi, provisionOrg, surveyId } from './lib/rbacFixtures.mjs'
import { enforceSurveyBranding, sanitizeOrgBrandKit, sanitizeEmbedOrigins } from '../server/src/lib/branding/brandEnforcement.js'
import { buildPublicBrandingPayload } from '../server/src/lib/branding/publicBranding.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`
const api = makeApi(BASE)

const unique = `brand1_${Date.now()}`
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
  assert.equal(vendorLogin.status, 200)
  vendorToken = vendorLogin.data.token
})

test('enforceSurveyBranding strips logo for starter plan', () => {
  const survey = { id: 's1', title: 'T', companyLogo: 'data:image/png;base64,abc' }
  const stripped = enforceSurveyBranding(survey, 'starter')
  assert.equal(stripped.companyLogo, undefined)
})

test('enforceSurveyBranding keeps logo for professional plan', () => {
  const survey = { id: 's1', title: 'T', companyLogo: 'data:image/png;base64,abc' }
  const kept = enforceSurveyBranding(survey, 'professional')
  assert.equal(kept.companyLogo, 'data:image/png;base64,abc')
})

test('sanitizeOrgBrandKit rejects starter plan', () => {
  const result = sanitizeOrgBrandKit({ primaryColor: '#2563eb' }, 'starter')
  assert.ok(result.errors.length)
  assert.equal(result.brandKit, null)
})

test('sanitizeOrgBrandKit accepts professional palette', () => {
  const result = sanitizeOrgBrandKit({
    primaryColor: '#1d4ed8',
    textColor: '#0f172a',
    backgroundColor: '#f8fafc',
    buttonTextColor: '#ffffff',
  }, 'professional')
  assert.equal(result.errors.length, 0)
  assert.equal(result.brandKit.primaryColor, '#1d4ed8')
})

test('buildPublicBrandingPayload merges org theme for professional', () => {
  const payload = buildPublicBrandingPayload(
    { brandKit: { primaryColor: '#111111', textColor: '#0f172a', backgroundColor: '#ffffff', buttonTextColor: '#ffffff' } },
    { themeOverrides: { primaryColor: '#222222' } },
    'professional',
  )
  assert.equal(payload.theme.primaryColor, '#222222')
  assert.equal(payload.hidePlatformBranding, true)
  assert.equal(payload.mustShowPlatformBranding, false)
})

test('buildPublicBrandingPayload requires powered-by footer for starter', () => {
  const payload = buildPublicBrandingPayload({}, {}, 'starter')
  assert.equal(payload.mustShowPlatformBranding, true)
  assert.equal(payload.canHidePlatformBranding, false)
  assert.equal(payload.hidePlatformBranding, false)
})

test('buildPublicBrandingPayload requires powered-by footer for free trial', () => {
  const payload = buildPublicBrandingPayload({}, {}, 'free_trial')
  assert.equal(payload.mustShowPlatformBranding, true)
})

test('starter PATCH survey strips companyLogo via API', async () => {
  const id = surveyId('brand_starter')
  await api(`/api/surveys/${id}`, {
    method: 'PATCH',
    token: fixtures.adminToken,
    body: {
      survey: { id, title: 'Brand test', companyLogo: 'data:image/png;base64,abc', status: 'draft' },
      items: [],
    },
  })
  const row = await api(`/api/surveys/${id}`, { token: fixtures.adminToken })
  assert.equal(row.status, 200)
  assert.equal(row.data.survey.companyLogo, undefined)
})

test('professional PATCH brand kit and survey logo persist', async () => {
  await api(`/api/vendor/organizations/${fixtures.adminSession.organizationId}/subscription`, {
    method: 'PATCH',
    token: vendorToken,
    body: { planId: 'professional', status: 'active' },
  })

  const brand = await api('/api/billing/brand', {
    method: 'PATCH',
    token: fixtures.adminToken,
    body: {
      brandKit: {
        primaryColor: '#1d4ed8',
        textColor: '#0f172a',
        backgroundColor: '#f8fafc',
        buttonTextColor: '#ffffff',
      },
      embedAllowedOrigins: ['https://app.example.com'],
    },
  })
  assert.equal(brand.status, 200)
  assert.equal(brand.data.brandKit.primaryColor, '#1d4ed8')
  assert.deepEqual(brand.data.embedAllowedOrigins, ['https://app.example.com'])

  const id = surveyId('brand_pro')
  await api(`/api/surveys/${id}`, {
    method: 'PATCH',
    token: fixtures.adminToken,
    body: {
      survey: { id, title: 'Pro brand', companyLogo: 'data:image/png;base64,xyz', status: 'live' },
      items: [],
    },
  })
  const row = await api(`/api/surveys/${id}`, { token: fixtures.adminToken })
  assert.equal(row.data.survey.companyLogo, 'data:image/png;base64,xyz')

  const pub = await api(`/api/public/surveys/${id}?embed=1`)
  assert.equal(pub.status, 200)
  assert.ok(pub.data.branding?.theme)
  assert.equal(pub.data.branding.hidePlatformBranding, true)
})

test('sanitizeEmbedOrigins enforces professional limit', () => {
  const origins = Array.from({ length: 11 }, (_, i) => `https://site${i}.example.com`)
  const result = sanitizeEmbedOrigins(origins, 'professional')
  assert.ok(result.errors.length)
})
