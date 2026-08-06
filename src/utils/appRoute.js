// ─── Hash routing ──────────────────────────────────────────────────────────
// The URL is the single source of truth for navigation, so every view
// survives a refresh and browser back/forward works.
//   #/                dashboard
//   #/builder/:id     edit (unknown id = new draft)
//   #/preview/:id     preview
//   #/take/:id        public taker — no auth
// White-label path URLs also resolve on surveys.{client}.com/{publicPath}
import { useMemo, useSyncExternalStore } from 'react'
import { parseSurveyHost } from '@shared/surveyUrl.js'

const DASHBOARD = { view: 'dashboard', id: null, byPath: false, clientDomain: null }
const VIEWS     = ['builder', 'preview', 'take']

function pathSlug(pathname = window.location.pathname) {
  const slug = pathname.replace(/^\//, '').split('/').filter(Boolean)[0]
  if (!slug || slug.includes('.')) return null
  return slug
}

export function parseRoute(hash = window.location.hash, pathname = window.location.pathname) {
  const [, view, id] = (hash || '').match(/^#\/([a-z]+)\/([^/?]+)$/) || []
  if (VIEWS.includes(view)) {
    return { view, id, byPath: false, clientDomain: null }
  }

  const clientDomain = parseSurveyHost(window.location.hostname)
  const slug = clientDomain ? pathSlug(pathname) : null
  if (slug) {
    return {
      view: 'take',
      id: slug,
      byPath: true,
      clientDomain,
    }
  }

  return DASHBOARD
}

export function parseTakeHash() {
  const { view, id } = parseRoute()
  return view === 'take' ? id : null
}

/** Navigate — pushes a history entry so back/forward moves between views. */
export function nav(view, id) {
  const hash = view === 'dashboard' ? '#/' : `#/${view}/${id}`
  if (window.location.hash !== hash) window.location.hash = hash
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
