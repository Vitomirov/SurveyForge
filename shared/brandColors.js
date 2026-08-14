/** Brand palette extracted from src/assets/brand/logo.svg */

/** "RE" wordmark blue + supporting logo tones. */
export const BRAND_COLORS = {
  primary: '#1791e0',
  dark: '#07637a',
  light: '#c2e4f5',
}

/** Tailwind `brand-*` scale derived from logo colors. */
export const BRAND_PALETTE = {
  DEFAULT: BRAND_COLORS.primary,
  50: '#eef8fc',
  100: BRAND_COLORS.light,
  200: '#9dd4ef',
  300: '#6fc0e8',
  400: '#42abe1',
  500: '#1890df',
  600: BRAND_COLORS.primary,
  700: BRAND_COLORS.dark,
  800: '#055263',
  900: '#034652',
}

export const BRAND_PRIMARY_RGB = '23, 145, 224'
