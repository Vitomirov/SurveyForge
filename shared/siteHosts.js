// ─── Marketing site vs SaaS app hostnames (production) ─────────────────────
// rescopesurveys.com + www → public marketing SPA routes
// app.rescopesurveys.com → login, dashboard, builder (no marketing shell)
// localhost → unified dev (both marketing #/home and app #/ on one origin)

import { RESCOPESURVEYS_HOST } from './surveyUrl.js'
import { normalizeSignupPlanId } from './planCatalog.js'

export const APP_HOST = `app.${RESCOPESURVEYS_HOST}`

export const MARKETING_HOSTS = [RESCOPESURVEYS_HOST, `www.${RESCOPESURVEYS_HOST}`]

export function normalizeHostname(hostname) {
  return String(hostname || '').split(':')[0].toLowerCase()
}

export function isLocalDevHost(hostname = typeof window !== 'undefined' ? window.location.hostname : '') {
  const h = normalizeHostname(hostname)
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]'
}

/** Apex / www (or localhost in dev). */
export function isMarketingSiteHost(hostname = typeof window !== 'undefined' ? window.location.hostname : '') {
  if (isLocalDevHost(hostname)) return true
  return MARKETING_HOSTS.includes(normalizeHostname(hostname))
}

/** SaaS app host (or localhost in dev). */
export function isAppSiteHost(hostname = typeof window !== 'undefined' ? window.location.hostname : '') {
  if (isLocalDevHost(hostname)) return true
  return normalizeHostname(hostname) === APP_HOST
}

/** True when marketing and app use different origins (production). */
export function usesSplitSiteHosts(hostname = typeof window !== 'undefined' ? window.location.hostname : '') {
  return !isLocalDevHost(hostname)
}

export function marketingSiteOrigin(protocol = 'https:') {
  if (typeof window !== 'undefined' && isLocalDevHost()) return window.location.origin
  return `${protocol}//${RESCOPESURVEYS_HOST}`
}

export function appSiteOrigin(protocol = 'https:') {
  if (typeof window !== 'undefined' && isLocalDevHost()) return window.location.origin
  return `${protocol}//${APP_HOST}`
}

/** Hash-only route for cross-origin navigation (matches appRoute.nav). */
export function buildAppLocationHash(view, id = null, opts = {}) {
  if (view === 'dashboard') return '#/'
  if (view === 'home') return '#/home'
  if (view === 'login') return '#/login'
  if (view === 'signup') {
    let hash = '#/signup'
    if (opts.plan) hash += `?plan=${encodeURIComponent(normalizeSignupPlanId(opts.plan))}`
    return hash
  }
  let hash = `#/${view}/${id}`
  if (opts.export && view === 'builder') hash += '?export=1'
  return hash
}

export function assignAppRoute(view, id = null, opts = {}) {
  const hash = buildAppLocationHash(view, id, opts)
  const target = `${appSiteOrigin()}${hash}`
  if (typeof window !== 'undefined') window.location.assign(target)
  return target
}

export function assignMarketingRoute(hash = '#/home') {
  const normalized = hash.startsWith('#') ? hash : `#${hash}`
  const target = `${marketingSiteOrigin()}${normalized}`
  if (typeof window !== 'undefined') window.location.assign(target)
  return target
}

/** After full navigation to marketing, scroll to a section id (e.g. pricing). */
export const MKT_SCROLL_STORAGE_KEY = 'rescope.mktScrollTarget'

export function queueMarketingScroll(sectionId) {
  if (typeof window === 'undefined') return
  const id = String(sectionId || '').replace(/^#/, '')
  if (!id) return
  try {
    sessionStorage.setItem(MKT_SCROLL_STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}
