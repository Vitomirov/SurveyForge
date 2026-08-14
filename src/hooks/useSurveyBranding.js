import { useState, useEffect } from 'react'
import { useApi } from '@/config/api'
import { getPublicSurvey } from '@/api/survey/surveys'
import { fetchBrandKit } from '@/api/platform/billing'
import { mergeBrandThemes, DEFAULT_BRAND_THEME } from '@shared/brandTheme.js'

/** Load org branding for preview/test modes (builder Preview does not use public take route). */
export function useSurveyBranding(survey, { enabled = true } = {}) {
  const [branding, setBranding] = useState(null)

  useEffect(() => {
    if (!enabled || !survey?.id) {
      setBranding(null)
      return
    }

    let cancelled = false

    async function load() {
      try {
        if (useApi && survey.status === 'live') {
          const payload = await getPublicSurvey(survey.id)
          if (!cancelled && payload?.branding) {
            setBranding(payload.branding)
            return
          }
        }

        if (useApi) {
          const data = await fetchBrandKit()
          if (cancelled) return

          const mustShow = data.planFeatures?.mustShowPlatformBranding
            ?? !data.planFeatures?.hidePlatformBranding

          if (!data.planFeatures?.brandKit) {
            setBranding({
              theme: DEFAULT_BRAND_THEME,
              logo: survey.companyLogo || null,
              canHidePlatformBranding: Boolean(data.planFeatures?.hidePlatformBranding),
              mustShowPlatformBranding: mustShow,
              hidePlatformBranding: false,
            })
            return
          }

          const theme = mergeBrandThemes(
            data.brandKit || DEFAULT_BRAND_THEME,
            survey.themeOverrides,
          )
          setBranding({
            theme,
            logo: survey.companyLogo || theme.logoUrl || null,
            canHidePlatformBranding: Boolean(data.planFeatures?.hidePlatformBranding),
            mustShowPlatformBranding: mustShow,
            hidePlatformBranding: data.planFeatures.hidePlatformBranding,
          })
          return
        }

        setBranding(null)
      } catch {
        if (!cancelled) setBranding(null)
      }
    }

    load()
    return () => { cancelled = true }
  }, [enabled, survey?.id, survey?.status, survey?.companyLogo, survey?.themeOverrides])

  return branding
}
