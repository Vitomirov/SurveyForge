import {
  canUseBrandKit,
  canUseSurveyThemeOverrides,
  embedOriginLimit,
} from '../../../../shared/planFeatures.js'
import {
  validateBrandTheme,
  stripSurveyBrandingFields,
} from '../../../../shared/brandTheme.js'
import { normalizeEmbedOrigin } from '../../../../shared/embedProtocol.js'

export async function loadOrgPlanContext(prisma, organizationId) {
  const [org, subscription] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    }),
    prisma.subscription.findUnique({
      where: { organizationId },
      select: { planId: true },
    }),
  ])
  const planId = subscription?.planId || 'starter'
  return { org, planId }
}

/** Sanitize survey branding fields based on subscription plan. */
export function enforceSurveyBranding(survey, planId) {
  if (!survey || typeof survey !== 'object') return survey
  const allowLogo = canUseBrandKit(planId)
  const allowThemeOverrides = canUseSurveyThemeOverrides(planId)
  return stripSurveyBrandingFields(survey, { allowLogo, allowThemeOverrides })
}

/** Validate and normalize org brand kit from PATCH body. */
export function sanitizeOrgBrandKit(input, planId) {
  if (!canUseBrandKit(planId)) {
    return { brandKit: null, errors: ['Brand Kit requires a Professional or Enterprise plan.'] }
  }
  const { theme, errors } = validateBrandTheme(input)
  if (errors.length) return { brandKit: null, errors }
  return { brandKit: theme, errors: [] }
}

/** Normalize embed allowed origins with plan limits. */
export function sanitizeEmbedOrigins(origins, planId) {
  const limit = embedOriginLimit(planId)
  if (limit === 0) {
    return { embedAllowedOrigins: [], errors: ['Embedding requires a Professional or Enterprise plan.'] }
  }
  if (!Array.isArray(origins)) {
    return { embedAllowedOrigins: [], errors: ['embedAllowedOrigins must be an array.'] }
  }
  const normalized = [...new Set(origins.map(normalizeEmbedOrigin).filter(Boolean))]
  if (limit != null && normalized.length > limit) {
    return {
      embedAllowedOrigins: [],
      errors: [`Maximum ${limit} embed origins allowed on your plan.`],
    }
  }
  return { embedAllowedOrigins: normalized, errors: [] }
}
