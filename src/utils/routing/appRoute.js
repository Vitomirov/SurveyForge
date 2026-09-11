// ─── Hash routing ──────────────────────────────────────────────────────────
// The URL is the single source of truth for navigation, so every view
// survives a refresh and browser back/forward works.
//   #/                dashboard (signed in) or marketing home (signed out, marketing host)
//   #/home            marketing site (marketing host)
//   #/login           sign in (app host in production)
//   #/signup?plan=starter   create org (app host in production)
//   #/builder/:id     edit (unknown id = new draft)
//   #/builder/:id?export=1  edit and open Export Manager (notification deep link)
//   #/preview/:id     preview
//   #/take/:id        public taker — no auth
//   #/embed/:id       embedded taker — no auth, minimal chrome
// White-label path URLs also resolve on surveys.{client}.com/{publicPath}
// Embedded path URLs resolve on surveys.{client}.com/embed/{publicPath}
import { useMemo, useSyncExternalStore } from 'react'
import { parseSurveyHost } from '@shared/surveyUrl.js'
import { normalizeSignupPlanId } from '@shared/planCatalog.js'
import {
  assignAppRoute,
  assignMarketingRoute,
  isAppSiteHost,
  isMarketingSiteHost,
  usesSplitSiteHosts,
} from '@shared/siteHosts.js'

const DASHBOARD = {
  view: 'dashboard',
  id: null,
  byPath: false,
  clientDomain: null,
  isEmbed: false,
  openExport: false,
  signupPlanId: null,
}
const VIEWS     = ['builder', 'preview', 'take', 'embed']
const PUBLIC_APP_VIEWS = ['home', 'login', 'signup']
const APP_ONLY_VIEWS = ['login', 'signup', 'dashboard', 'builder', 'preview']

function parsePublicAppHash(hash = '') {
  const path = hashPath(hash)
  const match = path.match(/^#\/(home|login|signup)$/)
  if (match) {
    return {
      view: match[1],
      id: null,
      byPath: false,
      clientDomain: null,
      isEmbed: false,
      openExport: false,
      signupPlanId: match[1] === 'signup'
        ? normalizeSignupPlanId(hashQuery(hash).get('plan'))
        : null,
    }
  }
  return null
}

export function isMarketingRoute(view) {
  return view === 'home' || view === 'dashboard'
}

function pathSlug(pathname = window.location.pathname) {
  const slug = pathname.replace(/^\//, '').split('/').filter(Boolean)[0]
  if (!slug || slug.includes('.')) return null
  return slug
}

function embedPathSlug(pathname = window.location.pathname) {
  const match = pathname.match(/^\/embed\/([^/]+)/)
  return match ? match[1] : null
}

function hashPath(hash = '') {
  return String(hash).split('?')[0]
}

function hashQuery(hash = '') {
  const q = String(hash).split('?')[1] || ''
  return new URLSearchParams(q)
}

function wantsExport(hash = '') {
  return hashQuery(hash).get('export') === '1'
}

export function parseRoute(hash = window.location.hash, pathname = window.location.pathname) {
  const publicView = parsePublicAppHash(hash)
  if (publicView) return publicView

  const openExport = wantsExport(hash)
  const [, view, id] = hashPath(hash).match(/^#\/([a-z]+)\/([^/]+)$/) || []
  if (view === 'embed') {
    return { view: 'take', id, byPath: false, clientDomain: null, isEmbed: true, openExport: false, signupPlanId: null }
  }
  if (VIEWS.includes(view)) {
    return { view, id, byPath: false, clientDomain: null, isEmbed: false, openExport: view === 'builder' && openExport, signupPlanId: null }
  }

  const clientDomain = parseSurveyHost(window.location.hostname)
  const embedSlug = clientDomain ? embedPathSlug(pathname) : null
  if (embedSlug) {
    return {
      view: 'take',
      id: embedSlug,
      byPath: true,
      clientDomain,
      isEmbed: true,
      openExport: false,
      signupPlanId: null,
    }
  }

  const slug = clientDomain ? pathSlug(pathname) : null
  if (slug) {
    return {
      view: 'take',
      id: slug,
      byPath: true,
      clientDomain,
      isEmbed: false,
      openExport: false,
      signupPlanId: null,
    }
  }

  return DASHBOARD
}

export function parseTakeHash() {
  const { view, id } = parseRoute()
  return view === 'take' ? id : null
}

function setHash(hash) {
  if (window.location.hash !== hash) window.location.hash = hash
}

/** Navigate — same-origin hash, or cross-origin assign in production split. */
export function nav(view, id, opts = {}) {
  const split = usesSplitSiteHosts()
  const onMarketing = isMarketingSiteHost()
  const onApp = isAppSiteHost()

  if (split && onMarketing && APP_ONLY_VIEWS.includes(view)) {
    assignAppRoute(view, id, opts)
    return
  }

  if (split && onApp && view === 'home') {
    assignMarketingRoute('#/home')
    return
  }

  if (view === 'dashboard') {
    if (split && onMarketing) {
      assignAppRoute('dashboard')
      return
    }
    setHash('#/')
    return
  }

  if (PUBLIC_APP_VIEWS.includes(view)) {
    let hash = `#/${view}`
    if (view === 'signup' && opts.plan) {
      hash += `?plan=${encodeURIComponent(normalizeSignupPlanId(opts.plan))}`
    }
    setHash(hash)
    return
  }

  let hash = `#/${view}/${id}`
  if (opts.export && view === 'builder') hash += '?export=1'
  setHash(hash)
}

/** Public marketing homepage (rescopesurveys.com in production). */
export function navMarketingHome() {
  if (usesSplitSiteHosts() && isAppSiteHost()) {
    assignMarketingRoute('#/home')
    return
  }
  nav('home')
}

function subscribe(onChange) {
  const handler = () => onChange()
  window.addEventListener('hashchange', handler)
  window.addEventListener('popstate', handler)
  return () => {
    window.removeEventListener('hashchange', handler)
    window.removeEventListener('popstate', handler)
  }
}

/** Current route, re-read whenever the hash or pathname changes. */
export function useRoute() {
  const locationKey = useSyncExternalStore(subscribe, () =>
    `${window.location.hash}|${window.location.pathname}`,
  )
  return useMemo(() => {
    const [hash, pathname] = locationKey.split('|')
    return parseRoute(hash, pathname)
  }, [locationKey])
}
