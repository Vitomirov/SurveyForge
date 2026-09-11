import { nav } from '@/utils/routing/appRoute'

/** @typedef {'freeTrial' | 'signIn' | 'contact' | 'scrollTrial' | 'dashboard'} MarketingCtaId */

/** @typedef {{ type: 'route', view: 'signup' | 'login' | 'home' | 'dashboard' } | { type: 'hash', hash: string } | { type: 'mailto', href: string }} CtaAction */

/** @type {Record<MarketingCtaId, CtaAction>} */
export const CTA_ACTIONS = {
  freeTrial: { type: 'route', view: 'signup' },
  signIn: { type: 'route', view: 'login' },
  contact: { type: 'hash', hash: '#contact' },
  scrollTrial: { type: 'hash', hash: '#trial' },
  dashboard: { type: 'route', view: 'dashboard' },
}

export function runCtaAction(action, { isAuthenticated } = {}) {
  if (!action) return
  if (action.type === 'route') {
    if (action.view === 'dashboard' && isAuthenticated) {
      nav('dashboard')
      return
    }
    if (action.view === 'dashboard' && !isAuthenticated) {
      nav('signup')
      return
    }
    nav(action.view)
    return
  }
  if (action.type === 'hash') {
    const current = window.location.hash.replace(/\?.*/, '')
    const onMarketing = current === '#/home' || current === '#/' || current === ''
    if (!onMarketing) {
      nav('home')
      requestAnimationFrame(() => {
        document.querySelector(action.hash)?.scrollIntoView({ behavior: 'smooth' })
      })
      return
    }
    document.querySelector(action.hash)?.scrollIntoView({ behavior: 'smooth' })
    return
  }
  if (action.type === 'mailto') {
    window.location.href = action.href
  }
}

export function resolveCta(ctaId) {
  return CTA_ACTIONS[ctaId] ?? null
}
