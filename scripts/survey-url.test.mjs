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
  buildLocalTakeUrl,
  parseSurveyHost,
  clientDomainFromName,
  previewPublicPath,
  resolvePublicPath,
  displayPublicPath,
  isPublicPathLocked,
  ensureUniquePublicPath,
} from '../shared/surveyUrl.js'

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

test('buildSurveyPublicUrl matches target structure', () => {
  const url = buildSurveyPublicUrl('acme', 'brand-tracking-060826')
  assert.equal(url, 'https://surveys.acme/brand-tracking-060826')
})

test('buildLocalTakeUrl uses hash route', () => {
  const url = buildLocalTakeUrl('abc-123', 'http://localhost:5173', '/')
  assert.equal(url, 'http://localhost:5173#/take/abc-123')
})

test('parseSurveyHost extracts client domain', () => {
  assert.equal(parseSurveyHost('surveys.acme.com'), 'acme.com')
  assert.equal(parseSurveyHost('localhost'), null)
})

test('clientDomainFromName slugifies client names', () => {
  assert.equal(clientDomainFromName('DMR Group'), 'dmr-group')
})

test('resolvePublicPath preserves path while live', () => {
  const survey = { publicPath: 'fixed-path-010126', title: 'Other', status: 'live' }
  assert.equal(resolvePublicPath(survey), 'fixed-path-010126')
})

test('previewPublicPath generates from title when missing', () => {
  const survey = { title: 'My Survey', createdAt: '2026-01-01T00:00:00.000Z' }
  assert.equal(previewPublicPath(survey), 'my-survey-010126')
})

test('ensureUniquePublicPath appends suffix on collision', () => {
  const taken = new Set(['untitled-survey-060826'])
  const isTaken = (candidate) => taken.has(candidate)
  assert.equal(
    ensureUniquePublicPath('untitled-survey-060826', isTaken),
    'untitled-survey-060826-2',
  )
})

test('displayPublicPath follows name until live', () => {
  const draft = { title: 'New Name', createdAt: '2026-08-06T00:00:00.000Z', publicPath: 'old-name-060826', status: 'draft' }
  assert.equal(displayPublicPath(draft), 'new-name-060826')

  const live = { ...draft, status: 'live' }
  assert.equal(displayPublicPath(live), 'old-name-060826')
  assert.equal(isPublicPathLocked(live), true)
})
