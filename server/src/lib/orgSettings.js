import { normalizeSurveyDomain } from '../../../shared/surveyUrl.js'
import { validateBrandTheme, DEFAULT_BRAND_THEME } from '../../../shared/brandTheme.js'
import { normalizeEmbedOrigin } from '../../../shared/embedProtocol.js'
import {
  normalizeDomainVerification,
  resolveVerifiedSurveyDomain,
} from '../../../shared/domainVerification.js'
import { canUseCustomDomain } from '../../../shared/planFeatures.js'

export function readSurveyDomain(settings) {
  if (!settings || typeof settings !== 'object') return ''
  return normalizeSurveyDomain(settings.surveyDomain) || ''
}

export function readBrandKit(settings) {
  if (!settings?.brandKit) return null
  return validateBrandTheme(settings.brandKit, { requireAccessible: false }).theme
}

export function readEmbedAllowedOrigins(settings) {
  if (!settings || !Array.isArray(settings.embedAllowedOrigins)) return []
  return [...new Set(settings.embedAllowedOrigins.map(normalizeEmbedOrigin).filter(Boolean))]
}

export function readDomainVerification(settings) {
  return normalizeDomainVerification(settings?.domainVerification, {
    domain: readSurveyDomain(settings),
  })
}

/** Effective custom domain — only when enterprise plan and DNS verified. */
export function readEffectiveSurveyDomain(settings, planId = 'starter') {
  const requested = readSurveyDomain(settings)
  if (!canUseCustomDomain(planId)) return ''
  return resolveVerifiedSurveyDomain({
    surveyDomain: requested,
    domainVerification: readDomainVerification(settings),
    planAllowsCustomDomain: true,
  })
}

export function patchOrgSettings(settings, {
  surveyDomain,
  brandKit,
  embedAllowedOrigins,
  domainVerification,
} = {}) {
  const next = settings && typeof settings === 'object' ? { ...settings } : {}
  if (surveyDomain !== undefined) {
    const normalized = normalizeSurveyDomain(surveyDomain)
    if (normalized) next.surveyDomain = normalized
    else delete next.surveyDomain
  }
  if (brandKit !== undefined) {
    if (brandKit == null) delete next.brandKit
    else next.brandKit = validateBrandTheme(brandKit, { requireAccessible: false }).theme
  }
  if (embedAllowedOrigins !== undefined) {
    if (!embedAllowedOrigins?.length) delete next.embedAllowedOrigins
    else {
      next.embedAllowedOrigins = [...new Set(
        embedAllowedOrigins.map(normalizeEmbedOrigin).filter(Boolean),
      )]
    }
  }
  if (domainVerification !== undefined) {
    if (domainVerification == null) delete next.domainVerification
    else {
      next.domainVerification = normalizeDomainVerification(domainVerification, {
        domain: readSurveyDomain(next),
      })
    }
  }
  return next
}

export function defaultBrandKitPreview() {
  return { ...DEFAULT_BRAND_THEME }
}
