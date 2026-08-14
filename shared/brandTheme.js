// ─── Brand theme schema, validation, and merge (shared by client + server) ─

import { BRAND_COLORS } from './brandColors.js'

export const BRAND_THEME_VERSION = 1

export const APPROVED_FONTS = [
  { key: 'dm-sans', label: 'DM Sans', stack: "'DM Sans', system-ui, sans-serif" },
  { key: 'inter', label: 'Inter', stack: "'Inter', system-ui, sans-serif" },
  { key: 'roboto', label: 'Roboto', stack: "'Roboto', system-ui, sans-serif" },
  { key: 'open-sans', label: 'Open Sans', stack: "'Open Sans', system-ui, sans-serif" },
  { key: 'lato', label: 'Lato', stack: "'Lato', system-ui, sans-serif" },
]

export const BORDER_RADIUS_OPTIONS = ['sm', 'md', 'lg']
export const BUTTON_VARIANTS = ['solid', 'outline']
export const INPUT_STYLES = ['default', 'underline']

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const DATA_URL = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/

export const DEFAULT_BRAND_THEME = {
  version: BRAND_THEME_VERSION,
  logoUrl: null,
  primaryColor: BRAND_COLORS.primary,
  secondaryColor: BRAND_COLORS.dark,
  backgroundColor: '#f8fafc',
  textColor: '#0f172a',
  buttonTextColor: '#ffffff',
  fontKey: 'dm-sans',
  borderRadius: 'md',
  buttonVariant: 'solid',
  inputStyle: 'default',
  showPoweredBy: false,
}

const FONT_BY_KEY = Object.fromEntries(APPROVED_FONTS.map(f => [f.key, f]))

/** Google Fonts family query params for approved brand fonts. */
const GOOGLE_FONT_FAMILY = {
  'dm-sans': 'DM+Sans:wght@400;500;600;700',
  inter: 'Inter:wght@400;500;600;700',
  roboto: 'Roboto:wght@400;500;700',
  'open-sans': 'Open+Sans:wght@400;600;700',
  lato: 'Lato:wght@400;700',
}

const loadedBrandFonts = new Set()

/** Load a brand font from Google Fonts (no-op if already loaded). Safe for SSR-less client use. */
export function ensureBrandFontLoaded(fontKey) {
  if (typeof document === 'undefined') return
  const family = GOOGLE_FONT_FAMILY[fontKey]
  if (!family || loadedBrandFonts.has(fontKey)) return
  loadedBrandFonts.add(fontKey)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`
  document.head.appendChild(link)
}

export function normalizeHexColor(value, fallback) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!HEX_COLOR.test(trimmed)) return fallback
  return trimmed.toLowerCase()
}

function relativeLuminance(hex) {
  const rgb = hex.slice(1).match(/.{2}/g).map(h => {
    const c = parseInt(h, 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

export function contrastRatio(hexA, hexB) {
  const l1 = relativeLuminance(hexA)
  const l2 = relativeLuminance(hexB)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function meetsContrast(textHex, bgHex, minRatio = 4.5) {
  return contrastRatio(textHex, bgHex) >= minRatio
}

function normalizeLogoUrl(value) {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return null
  if (DATA_URL.test(value)) return value
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href
  } catch {
    return null
  }
  return null
}

/** Validate and sanitize a brand theme object. Returns { theme, errors }. */
export function validateBrandTheme(input, { requireAccessible = true } = {}) {
  const raw = input && typeof input === 'object' ? input : {}
  const errors = []

  const theme = {
    version: BRAND_THEME_VERSION,
    logoUrl: normalizeLogoUrl(raw.logoUrl),
    primaryColor: normalizeHexColor(raw.primaryColor, DEFAULT_BRAND_THEME.primaryColor),
    secondaryColor: normalizeHexColor(raw.secondaryColor, DEFAULT_BRAND_THEME.secondaryColor),
    backgroundColor: normalizeHexColor(raw.backgroundColor, DEFAULT_BRAND_THEME.backgroundColor),
    textColor: normalizeHexColor(raw.textColor, DEFAULT_BRAND_THEME.textColor),
    buttonTextColor: normalizeHexColor(raw.buttonTextColor, DEFAULT_BRAND_THEME.buttonTextColor),
    fontKey: FONT_BY_KEY[raw.fontKey] ? raw.fontKey : DEFAULT_BRAND_THEME.fontKey,
    borderRadius: BORDER_RADIUS_OPTIONS.includes(raw.borderRadius) ? raw.borderRadius : DEFAULT_BRAND_THEME.borderRadius,
    buttonVariant: BUTTON_VARIANTS.includes(raw.buttonVariant) ? raw.buttonVariant : DEFAULT_BRAND_THEME.buttonVariant,
    inputStyle: INPUT_STYLES.includes(raw.inputStyle) ? raw.inputStyle : DEFAULT_BRAND_THEME.inputStyle,
    showPoweredBy: raw.showPoweredBy !== false,
  }

  if (requireAccessible) {
    if (!meetsContrast(theme.textColor, theme.backgroundColor)) {
      errors.push('Text color must have sufficient contrast against the background.')
    }
    if (!meetsContrast(theme.buttonTextColor, theme.primaryColor)) {
      errors.push('Button text must have sufficient contrast against the primary color.')
    }
  }

  return { theme, errors }
}

/** Merge org defaults with optional survey overrides (survey wins on defined keys). */
export function mergeBrandThemes(orgTheme, surveyOverrides) {
  const base = validateBrandTheme(orgTheme, { requireAccessible: false }).theme
  if (!surveyOverrides || typeof surveyOverrides !== 'object') return base

  const merged = { ...base, ...surveyOverrides }
  return validateBrandTheme(merged, { requireAccessible: false }).theme
}

export function fontStackForKey(fontKey) {
  return FONT_BY_KEY[fontKey]?.stack || FONT_BY_KEY['dm-sans'].stack
}

const RADIUS_PX = { sm: '6px', md: '10px', lg: '14px' }

/** CSS custom properties for the taker root (.survey-theme scope). */
export function brandThemeToCssVars(theme) {
  const t = validateBrandTheme(theme, { requireAccessible: false }).theme
  return {
    '--sf-primary': t.primaryColor,
    '--sf-secondary': t.secondaryColor,
    '--sf-bg': t.backgroundColor,
    '--sf-text': t.textColor,
    '--sf-button-text': t.buttonTextColor,
    '--sf-font': fontStackForKey(t.fontKey),
    '--sf-radius': RADIUS_PX[t.borderRadius] || RADIUS_PX.md,
    '--sf-button-variant': t.buttonVariant,
    '--sf-input-style': t.inputStyle,
  }
}

/** Strip gated branding fields from survey payload when plan lacks access. */
export function stripSurveyBrandingFields(survey, { allowThemeOverrides = false, allowLogo = false } = {}) {
  if (!survey || typeof survey !== 'object') return survey
  const next = { ...survey }
  if (!allowLogo) {
    delete next.companyLogo
    delete next.logoPosition
  }
  if (!allowThemeOverrides && next.themeOverrides) {
    delete next.themeOverrides
  }
  return next
}
