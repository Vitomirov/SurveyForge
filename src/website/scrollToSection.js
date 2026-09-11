const DEFAULT_OFFSET = 76

/** Sticky header clearance + small breathing room for in-page nav. */
export function getMarketingScrollOffset() {
  const header = document.querySelector('.mkt-site header')
  if (!header) return DEFAULT_OFFSET
  return Math.ceil(header.getBoundingClientRect().height) + 12
}

export function scrollToMarketingTarget(hash, { behavior = 'smooth' } = {}) {
  if (hash === '#top' || !hash) {
    window.scrollTo({ top: 0, behavior })
    return
  }

  const id = hash.startsWith('#') ? hash.slice(1) : hash
  const el = document.getElementById(id)
  if (!el) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scrollBehavior = reduceMotion ? 'auto' : behavior
  const offset = getMarketingScrollOffset()
  const top = el.getBoundingClientRect().top + window.scrollY - offset

  window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior })
}
