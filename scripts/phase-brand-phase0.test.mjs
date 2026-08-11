/**
 * Phase 0 — plan features, brand theme, embed protocol, domain verification
 * Run: node --test scripts/phase-brand-phase0.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  canUseBrandKit,
  canEmbedOnOwnSites,
  canUseCustomDomain,
  embedOriginLimit,
  planFeatureSummary,
} from '../shared/planFeatures.js'
import {
  validateBrandTheme,
  mergeBrandThemes,
  brandThemeToCssVars,
  meetsContrast,
  stripSurveyBrandingFields,
  DEFAULT_BRAND_THEME,
} from '../shared/brandTheme.js'
import {
  buildEmbedUrl,
  buildEmbedSnippet,
  buildFrameAncestorsDirective,
  buildEmbedMessage,
  EMBED_EVENTS,
} from '../shared/embedProtocol.js'
import {
  isDomainVerified,
  resolveVerifiedSurveyDomain,
  normalizeDomainVerification,
} from '../shared/domainVerification.js'

test('plan feature matrix gates by tier', () => {
  assert.equal(canUseBrandKit('starter'), false)
  assert.equal(canUseBrandKit('professional'), true)
  assert.equal(canUseBrandKit('enterprise'), true)
  assert.equal(canEmbedOnOwnSites('starter'), false)
  assert.equal(canEmbedOnOwnSites('professional'), true)
  assert.equal(canUseCustomDomain('professional'), false)
  assert.equal(canUseCustomDomain('enterprise'), true)
  assert.equal(embedOriginLimit('professional'), 10)
  assert.equal(embedOriginLimit('enterprise'), null)
})

test('planFeatureSummary returns stable shape', () => {
  const pro = planFeatureSummary('professional')
  assert.equal(pro.brandKit, true)
  assert.equal(pro.customDomain, false)
  assert.equal(pro.embedOriginLimit, 10)
})

test('validateBrandTheme rejects inaccessible colors', () => {
  const { errors } = validateBrandTheme({
    textColor: '#ffffff',
    backgroundColor: '#fefefe',
  })
  assert.ok(errors.length > 0)
})

test('validateBrandTheme accepts accessible palette', () => {
  const { theme, errors } = validateBrandTheme({
    primaryColor: '#1d4ed8',
    textColor: '#0f172a',
    backgroundColor: '#f8fafc',
    buttonTextColor: '#ffffff',
  })
  assert.equal(errors.length, 0)
  assert.equal(theme.primaryColor, '#1d4ed8')
})

test('mergeBrandThemes applies survey overrides', () => {
  const org = { ...DEFAULT_BRAND_THEME, primaryColor: '#111111' }
  const merged = mergeBrandThemes(org, { primaryColor: '#ff0000' })
  assert.equal(merged.primaryColor, '#ff0000')
})

test('brandThemeToCssVars maps to CSS custom properties', () => {
  const vars = brandThemeToCssVars(DEFAULT_BRAND_THEME)
  assert.equal(vars['--sf-primary'], '#2563eb')
  assert.match(vars['--sf-font'], /DM Sans/)
})

test('meetsContrast enforces WCAG threshold', () => {
  assert.equal(meetsContrast('#ffffff', '#000000'), true)
  assert.equal(meetsContrast('#ffff00', '#ffffff'), false)
})

test('stripSurveyBrandingFields removes gated survey fields', () => {
  const survey = { id: 's1', title: 'T', companyLogo: 'x', themeOverrides: { primaryColor: '#000' } }
  const stripped = stripSurveyBrandingFields(survey, { allowLogo: false, allowThemeOverrides: false })
  assert.equal(stripped.companyLogo, undefined)
  assert.equal(stripped.themeOverrides, undefined)
  assert.equal(stripped.title, 'T')
})

test('buildEmbedUrl converts public URL to embed path', () => {
  const url = buildEmbedUrl('https://surveys.rescopesurveys.com/my-survey-110826')
  assert.equal(url, 'https://surveys.rescopesurveys.com/embed/my-survey-110826?v=1')
})

test('buildEmbedSnippet includes sandbox attributes', () => {
  const snippet = buildEmbedSnippet('https://surveys.example.com/embed/foo?v=1')
  assert.match(snippet, /sandbox="allow-scripts allow-same-origin allow-forms allow-popups"/)
  assert.match(snippet, /src="https:\/\/surveys\.example\.com\/embed\/foo\?v=1"/)
})

test('buildFrameAncestorsDirective uses none when empty', () => {
  assert.equal(buildFrameAncestorsDirective([]), "'none'")
  assert.equal(
    buildFrameAncestorsDirective(['https://app.client.com']),
    'https://app.client.com',
  )
})

test('buildEmbedMessage never includes response payload', () => {
  const msg = buildEmbedMessage(EMBED_EVENTS.COMPLETED, { surveyId: 'abc' })
  assert.equal(msg.type, EMBED_EVENTS.COMPLETED)
  assert.equal(msg.surveyId, 'abc')
  assert.equal(msg.responses, undefined)
})

test('domain verification resolves only when verified', () => {
  const pending = normalizeDomainVerification({ domain: 'client.com', status: 'pending' })
  assert.equal(isDomainVerified(pending), false)
  assert.equal(
    resolveVerifiedSurveyDomain({
      surveyDomain: 'client.com',
      domainVerification: pending,
      planAllowsCustomDomain: true,
    }),
    '',
  )

  const verified = { domain: 'client.com', status: 'verified' }
  assert.equal(
    resolveVerifiedSurveyDomain({
      surveyDomain: 'client.com',
      domainVerification: verified,
      planAllowsCustomDomain: true,
    }),
    'client.com',
  )
})
