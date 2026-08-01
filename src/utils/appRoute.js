// ─── Hash routing ──────────────────────────────────────────────────────────
// The URL is the single source of truth for navigation, so every view
// survives a refresh and browser back/forward works.
//   #/                dashboard
//   #/builder/:id     edit (unknown id = new draft)
//   #/preview/:id     preview
//   #/take/:id        public taker — no auth
import { useMemo, useSyncExternalStore } from 'react'

const DASHBOARD = { view: 'dashboard', id: null }
const VIEWS     = ['builder', 'preview', 'take']

export function parseRoute(hash = window.location.hash) {
  const [, view, id] = (hash || '').match(/^#\/([a-z]+)\/([^/?]+)$/) || []
  return VIEWS.includes(view) ? { view, id } : DASHBOARD
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
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

/** Current route, re-read whenever the hash changes. */
export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return useMemo(() => parseRoute(hash), [hash])
}
