/** Notifies the app when auth storage was cleared (401 from API). */
const listeners = new Set()

export function onAuthInvalidated(handler) {
  listeners.add(handler)
  return () => listeners.delete(handler)
}

export function notifyAuthInvalidated(code = 'UNAUTHORIZED') {
  listeners.forEach(fn => {
    try { fn(code) } catch { /* noop */ }
  })
}
