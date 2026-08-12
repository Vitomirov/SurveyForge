// ─── Public plan catalog (shared by client + server) ───────────────────────

import { maxSurveys } from './planFeatures.js'

/** Ordered tiers — higher number = higher plan. */
export const PLAN_CATALOG = {
  free_trial: {
    id: 'free_trial',
    name: 'Free Trial',
    seats: 1,
    priceCents: 0,
    tier: 0,
    selfService: false,
    highlights: [
      '5 surveys',
      '1 seat',
      '14-day trial',
      'Core survey builder',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    seats: 5,
    priceCents: 4900,
    tier: 1,
    selfService: true,
    highlights: [
      'Unlimited surveys',
      '5 seats',
      'Email support',
    ],
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    seats: 25,
    priceCents: 14900,
    tier: 2,
    selfService: true,
    highlights: [
      'Unlimited surveys',
      '25 seats',
      'Brand Kit & embeds',
      'Hide platform branding',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    seats: 100,
    priceCents: 49900,
    tier: 3,
    selfService: true,
    highlights: [
      'Unlimited surveys',
      '100 seats',
      'Custom survey domain',
      'Brand lock & priority support',
    ],
  },
}

export const PLAN_CATALOG_IDS = Object.keys(PLAN_CATALOG)

export function catalogPlan(planId) {
  return PLAN_CATALOG[planId] ?? null
}

export function planTier(planId) {
  return catalogPlan(planId)?.tier ?? -1
}

export function comparePlanTiers(fromPlanId, toPlanId) {
  return planTier(toPlanId) - planTier(fromPlanId)
}

export function isPlanUpgrade(fromPlanId, toPlanId) {
  return comparePlanTiers(fromPlanId, toPlanId) > 0
}

export function isPlanDowngrade(fromPlanId, toPlanId) {
  return comparePlanTiers(fromPlanId, toPlanId) < 0
}

/** Plans customers can switch to from the billing dashboard. */
export function selfServiceTargetPlanIds(currentPlanId) {
  const current = catalogPlan(currentPlanId)
  if (!current) return PLAN_CATALOG_IDS.filter(id => PLAN_CATALOG[id].selfService)

  if (currentPlanId === 'free_trial') {
    return PLAN_CATALOG_IDS.filter(id => id !== 'free_trial')
  }

  return PLAN_CATALOG_IDS.filter(id => PLAN_CATALOG[id].selfService)
}

export function serializeCatalogPlan(planId) {
  const plan = catalogPlan(planId)
  if (!plan) return null
  const surveyCap = maxSurveys(planId)
  return {
    id: plan.id,
    name: plan.name,
    seats: plan.seats,
    priceCents: plan.priceCents,
    maxSurveys: surveyCap,
    highlights: plan.highlights,
    tier: plan.tier,
    selfService: plan.selfService,
  }
}
