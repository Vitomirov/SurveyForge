/**
 * Phase 2 — Secure iframe embed MVP
 * Run: node --test scripts/phase-brand-phase2.test.mjs
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeApi, provisionOrg, surveyId } from './lib/rbacFixtures.mjs'
import { buildEmbedUrl, buildEmbedSnippet, buildFrameAncestorsDirective } from '../shared/embedProtocol.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`
const api = makeApi(BASE)

const unique = `brand2_${Date.now()}`
let fixtures = null
let vendorToken = null
let liveSurveyId = null

before(async () => {
  const health = await api('/health')
  assert.ok(health.data?.ok, `API not reachable at ${BASE}`)
  fixtures = await provisionOrg(api, unique)
  const vendorLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'vendor@rescopesurveys.local', password: 'vendor123' },
  })
  vendorToken = vendorLogin.data.token

  await api(`/api/vendor/organizations/${fixtures.adminSession.organizationId}/subscription`, {
    method: 'PATCH',
    token: vendorToken,
    body: { planId: 'professional', status: 'active' },
  })

  await api('/api/billing/brand', {
    method: 'PATCH',
    token: fixtures.adminToken,
    body: {
      brandKit: {
        primaryColor: '#1d4ed8',
        textColor: '#0f172a',
        backgroundColor: '#f8fafc',
        buttonTextColor: '#ffffff',
      },
      embedAllowedOrigins: ['https://client.example.com'],
    },
  })

  liveSurveyId = surveyId('embed_live')
  await api(`/api/surveys/${liveSurveyId}`, {
    method: 'PATCH',
    token: fixtures.adminToken,
    body: {
      survey: { id: liveSurveyId, title: 'Embed Test', status: 'live' },
      items: [],
    },
  })
})

test('buildEmbedUrl produces embed path with protocol version', () => {
  const url = buildEmbedUrl('https://surveys.rescopesurveys.com/foo-bar-110826')
  assert.match(url, /\/embed\/foo-bar-110826/)
  assert.match(url, /v=1/)
})

test('buildEmbedSnippet includes restrictive sandbox', () => {
  const snippet = buildEmbedSnippet('https://surveys.example.com/embed/x?v=1')
  assert.match(snippet, /sandbox=/)
  assert.match(snippet, /allow-scripts/)
})

test('public survey embed request sets frame-ancestors CSP', async () => {
  const res = await fetch(`${BASE}/api/public/surveys/${liveSurveyId}?embed=1`)
  assert.equal(res.status, 200)
  const csp = res.headers.get('content-security-policy')
  assert.ok(csp, 'CSP header should be set for embed requests')
  assert.match(csp, /frame-ancestors https:\/\/client\.example\.com/)
  const data = await res.json()
  assert.ok(data.branding)
})

test('starter plan cannot save embed origins', async () => {
  const starterOrg = await provisionOrg(api, `${unique}_starter`)
  const result = await api('/api/billing/brand', {
    method: 'PATCH',
    token: starterOrg.adminToken,
    body: { embedAllowedOrigins: ['https://evil.example.com'] },
  })
  assert.equal(result.status, 403)
})

test('buildFrameAncestorsDirective blocks when no origins', () => {
  assert.equal(buildFrameAncestorsDirective([]), "'none'")
})
