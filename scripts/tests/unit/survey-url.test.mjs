/**
 * White-label survey URL generation tests
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  slugify,
  dateSuffix,
  buildPublicPath,
  buildSurveyPublicUrl,
  buildShareableSurveyUrl,
  buildLocalTakeUrl,
  parseSurveyHost,
  normalizeSurveyDomain,
  resolveSurveyHost,
  previewPublicPath,
  resolvePublicPath,
  displayPublicPath,
  isPublicPathLocked,
  ensureUniquePublicPath,
  RESCOPESURVEYS_HOST,
} from '../../../shared/surveyUrl.js'

test('slugify normalizes project names', () => {
  assert.equal(slugify('Brand Tracking UK!'), 'brand-tracking-uk')
  assert.equal(slugify('  Hello   World  '), 'hello-world')
})

test('dateSuffix uses ddmmyy format', () => {
  assert.equal(dateSuffix(new Date('2026-08-06T12:00:00Z')), '060826')
})

test('buildPublicPath combines slug and date', () => {
  const path = buildPublicPath('Brand Tracking', new Date('2026-08-06'))
  assert.equal(path, 'brand-tracking-060826')
})

test('buildSurveyPublicUrl uses surveys subdomain for Rescope Surveys host', () => {
  const url = buildSurveyPublicUrl(RESCOPESURVEYS_HOST, 'brand-tracking-060826')
  assert.equal(url, 'https://surveys.rescopesurveys.com/brand-tracking-060826')
})

test('buildSurveyPublicUrl uses surveys subdomain for enterprise domains', () => {
  const url = buildSurveyPublicUrl('cocacola.com', 'brand-tracking-060826')
  assert.equal(url, 'https://surveys.cocacola.com/brand-tracking-060826')
})

test('resolveSurveyHost picks org domain for enterprise', () => {
  assert.equal(resolveSurveyHost({ planId: 'enterprise', surveyDomain: 'cocacola.com' }), 'cocacola.com')
  assert.equal(resolveSurveyHost({ planId: 'starter', surveyDomain: 'cocacola.com' }), RESCOPESURVEYS_HOST)
})

test('buildShareableSurveyUrl requires enterprise domain', () => {
  const survey = { id: 's1', title: 'Brand Tracking' }
  const today = dateSuffix(new Date())
  assert.equal(
    buildShareableSurveyUrl({ survey, planId: 'enterprise', surveyDomain: 'cocacola.com' }),
    `https://surveys.cocacola.com/brand-tracking-${today}`,
  )
  assert.equal(buildShareableSurveyUrl({ survey, planId: 'enterprise', surveyDomain: '' }), null)
  assert.equal(
    buildShareableSurveyUrl({ survey, planId: 'starter' }),
    `https://surveys.rescopesurveys.com/brand-tracking-${today}`,
  )
})

test('buildLocalTakeUrl uses hash route', () => {
  const url = buildLocalTakeUrl('abc-123', 'http://localhost:5173', '/')
  assert.equal(url, 'http://localhost:5173#/take/abc-123')
})

test('parseSurveyHost extracts client domain from surveys subdomain', () => {
  assert.equal(parseSurveyHost('surveys.rescopesurveys.com'), 'rescopesurveys.com')
  assert.equal(parseSurveyHost('surveys.cocacola.com'), 'cocacola.com')
  assert.equal(parseSurveyHost('localhost'), null)
})

test('normalizeSurveyDomain strips protocol and validates host', () => {
  assert.equal(normalizeSurveyDomain('https://CocaCola.com/'), 'cocacola.com')
  assert.equal(normalizeSurveyDomain('not a domain'), null)
})

test('resolvePublicPath preserves path while live', () => {
  const survey = { publicPath: 'fixed-path-010126', title: 'Other', status: 'live' }
  assert.equal(resolvePublicPath(survey), 'fixed-path-010126')
})

test('previewPublicPath generates from title using today', () => {
  const survey = { title: 'My Survey' }
  const today = dateSuffix(new Date())
  assert.equal(previewPublicPath(survey), `my-survey-${today}`)
})

test('ensureUniquePublicPath appends suffix on collision', () => {
  const taken = new Set(['untitled-survey-060826'])
  const isTaken = (candidate) => taken.has(candidate)
  assert.equal(
    ensureUniquePublicPath('untitled-survey-060826', isTaken),
    'untitled-survey-060826-2',
  )
})

test('displayPublicPath uses assigned path for drafts; preview only before save', () => {
  const today = dateSuffix(new Date())
  const draft = { title: 'New Name', publicPath: 'old-name-060826', status: 'draft' }
  assert.equal(displayPublicPath(draft), 'old-name-060826')

  const unsaved = { title: 'New Name', status: 'draft' }
  assert.equal(displayPublicPath(unsaved), `new-name-${today}`)

  const live = { ...draft, status: 'live' }
  assert.equal(displayPublicPath(live), 'old-name-060826')
  assert.equal(isPublicPathLocked(live), true)
})
