/**
 * Public survey branding payload builder.
 * Merges org brand kit with per-survey theme overrides and computes which
 * platform-branding flags apply for anonymous survey takers.
 */
import { mergeBrandThemes, DEFAULT_BRAND_THEME } from '../../../../shared/brandTheme.js'
import {
  canHidePlatformBranding,
  canUseBrandKit,
  mustShowPlatformBranding,
} from '../../../../shared/planFeatures.js'
import { readBrandKit } from '../platform/orgSettings.js'

/** Build effective theme and flags for public taker responses. */
export function buildPublicBrandingPayload(orgSettings, survey, planId = 'starter') {
  const orgTheme = readBrandKit(orgSettings)
  const brandingAllowed = canUseBrandKit(planId)

  let theme = { ...DEFAULT_BRAND_THEME }
  if (brandingAllowed) {
    theme = mergeBrandThemes(orgTheme || DEFAULT_BRAND_THEME, survey?.themeOverrides)
  }

  const logo = brandingAllowed
    ? (survey?.companyLogo || theme.logoUrl || null)
    : null

  return {
    theme,
    logo,
    canHidePlatformBranding: canHidePlatformBranding(planId),
    mustShowPlatformBranding: mustShowPlatformBranding(planId),
    /** @deprecated Use mustShowPlatformBranding / canHidePlatformBranding */
    hidePlatformBranding: canHidePlatformBranding(planId),
  }
}
