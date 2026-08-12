import { useEffect, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  brandThemeToCssVars,
  ensureBrandFontLoaded,
  meetsContrast,
  validateBrandTheme,
} from '@shared/brandTheme.js'

const SAMPLE_OPTIONS = ['Very satisfied', 'Satisfied', 'Neutral']

/**
 * Live mini survey mockup for brand theme editing.
 * Updates instantly as colors, fonts, radius, and button style change.
 */
export function BrandThemePreview({ theme, logoUrl, compact = false, className = '' }) {
  const validated = useMemo(
    () => validateBrandTheme(theme, { requireAccessible: false }).theme,
    [theme],
  )
  const themeVars = useMemo(() => brandThemeToCssVars(validated), [validated])

  const contrastIssues = useMemo(() => {
    const issues = []
    if (!meetsContrast(validated.textColor, validated.backgroundColor)) {
      issues.push('Text and background contrast is too low')
    }
    if (!meetsContrast(validated.buttonTextColor, validated.primaryColor)) {
      issues.push('Button text and primary color contrast is too low')
    }
    return issues
  }, [validated])

  useEffect(() => {
    ensureBrandFontLoaded(validated.fontKey)
  }, [validated.fontKey])

  const displayLogo = logoUrl || validated.logoUrl

  return (
    <div className={className}>
      <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">
        Live preview
      </p>

      <div
        className="survey-theme rounded-xl border border-ink-200 overflow-hidden shadow-sm"
        data-sf-button-variant={validated.buttonVariant}
        style={{
          ...themeVars,
          backgroundColor: 'var(--sf-bg)',
          color: 'var(--sf-text)',
          fontFamily: 'var(--sf-font)',
        }}
      >
        {/* Header */}
        <div
          className="px-3 py-2.5 border-b flex items-center gap-2 min-h-[44px]"
          style={{ borderColor: 'color-mix(in srgb, var(--sf-text) 12%, transparent)' }}
        >
          {displayLogo ? (
            <img
              src={displayLogo}
              alt=""
              className="h-6 max-w-[88px] object-contain shrink-0"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <div
              className="h-6 w-14 rounded shrink-0 border border-dashed opacity-40"
              style={{ borderColor: 'var(--sf-secondary)' }}
              aria-hidden
            />
          )}
          <span className="text-sm font-semibold truncate flex-1">
            Customer Feedback Survey
          </span>
        </div>

        {/* Progress */}
        {!compact && (
          <div className="px-3 py-2">
            <div
              className="flex justify-between text-[11px] mb-1.5"
              style={{ color: 'var(--sf-secondary)' }}
            >
              <span>Page 1 of 3</span>
              <span>33% complete</span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'color-mix(in srgb, var(--sf-text) 10%, transparent)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{ width: '33%', backgroundColor: 'var(--sf-primary)' }}
              />
            </div>
          </div>
        )}

        {/* Question card */}
        <div className={`px-3 ${compact ? 'py-3' : 'pb-3'}`}>
          <div
            className="rounded-2xl border p-3 sm:p-4 bg-white/90"
            style={{ borderColor: 'color-mix(in srgb, var(--sf-text) 10%, transparent)' }}
          >
            <p className="text-sm font-semibold mb-3 leading-snug">
              How satisfied are you with our service?
              <span className="text-rose-500 ml-0.5">*</span>
            </p>

            <div className="space-y-2 mb-3">
              {SAMPLE_OPTIONS.map((opt, i) => (
                <label
                  key={opt}
                  className="flex items-center gap-2.5 text-sm cursor-default select-none"
                >
                  <span
                    className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                    style={{
                      borderColor: i === 0 ? 'var(--sf-primary)' : 'var(--sf-secondary)',
                    }}
                  >
                    {i === 0 && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: 'var(--sf-primary)' }}
                      />
                    )}
                  </span>
                  {opt}
                </label>
              ))}
            </div>

            <input
              type="text"
              readOnly
              placeholder="Additional comments (optional)"
              className="input-base text-sm"
              style={{ backgroundColor: 'var(--sf-bg)' }}
            />
          </div>

          <div className="flex items-center justify-between gap-2 mt-3">
            <span
              className="text-xs"
              style={{ color: 'var(--sf-secondary)' }}
            >
              Question 1 of 5
            </span>
            <button type="button" className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-1">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {contrastIssues.length > 0 && (
        <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 space-y-0.5">
          {contrastIssues.map(issue => <p key={issue}>{issue}</p>)}
        </div>
      )}
    </div>
  )
}

export default BrandThemePreview
