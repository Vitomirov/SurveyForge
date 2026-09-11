import { nav } from '@/utils/routing/appRoute'
import { normalizeSignupPlanId } from '@shared/planCatalog.js'
import { scrollToMarketingTarget } from './scrollToSection'

/** @typedef {'freeTrial' | 'signIn' | 'contact' | 'scrollTrial' | 'dashboard'} MarketingCtaId */

/** @typedef {{ type: 'route', view: 'signup' | 'login' | 'home' | 'dashboard', plan?: string } | { type: 'hash', hash: string } | { type: 'mailto', href: string }} CtaAction */

/** @type {Record<MarketingCtaId, CtaAction>} */
export const CTA_ACTIONS = {
  freeTrial: { type: 'route', view: 'signup', plan: 'free_trial' },
  signIn: { type: 'route', view: 'login' },
  contact: { type: 'hash', hash: '#contact' },
  scrollTrial: { type: 'hash', hash: '#trial' },
  dashboard: { type: 'route', view: 'dashboard' },
}

export function navToSignup(planId) {
  nav('signup', null, { plan: normalizeSignupPlanId(planId) })
}

export function runCtaAction(action, { isAuthenticated } = {}) {
  if (!action) return
  if (action.type === 'route') {
    if (action.view === 'dashboard' && isAuthenticated) {
      nav('dashboard')
      return
    }
    if (action.view === 'dashboard' && !isAuthenticated) {
      navToSignup('free_trial')
      return
    }
    if (action.view === 'signup') {
      navToSignup(action.plan ?? 'free_trial')
      return
    }
    nav(action.view)
    return
  }
  if (action.type === 'hash') {
    const routeHash = window.location.hash.replace(/\?.*/, '')
    const onMarketing = routeHash === '#/home' || routeHash === '#/' || routeHash === ''
    if (!onMarketing) {
      nav('home')
      requestAnimationFrame(() => scrollToMarketingTarget(action.hash))
      return
    }
    scrollToMarketingTarget(action.hash)
    return
  }
  if (action.type === 'mailto') {
    window.location.href = action.href
  }
}

export function resolveCta(ctaId) {
  return CTA_ACTIONS[ctaId] ?? null
}
