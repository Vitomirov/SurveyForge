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
    marketingDescription: 'Try the full builder free for 14 days.',
    showOnPricingPage: false,
    marketingFeatured: false,
    marketingCta: 'signup',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    seats: 5,
    priceCents: 4900,
    tier: 1,
    selfService: false,
    highlights: [
      'Unlimited surveys',
      '5 seats',
      'Email support',
    ],
    marketingDescription: 'For small agencies running occasional fieldwork surveys.',
    showOnPricingPage: true,
    marketingFeatured: false,
    marketingCta: 'signup',
    pricingNote: 'Billed monthly after trial — no card required to start.',
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    seats: 25,
    priceCents: 14900,
    tier: 2,
    selfService: false,
    highlights: [
      'Unlimited surveys',
      '25 seats',
      'Brand Kit & embeds',
      'Hide platform branding',
    ],
    marketingDescription: 'For teams running fieldwork surveys continuously.',
    showOnPricingPage: true,
    marketingFeatured: true,
    marketingCta: 'signup',
    pricingNote: 'Billed monthly after trial — no card required to start.',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    seats: 100,
    priceCents: 49900,
    tier: 3,
    selfService: false,
    highlights: [
      'Unlimited surveys',
      '100 seats',
      'Custom survey domain',
      'Brand lock & priority support',
    ],
    marketingDescription: 'For larger agencies with custom workflow needs.',
    showOnPricingPage: true,
    marketingFeatured: false,
    marketingCta: 'contact',
    marketingPriceLabel: 'Contact us',
    pricingNote: '\u00a0',
  },
}

/** Marketing page — pricing section intro (non-plan copy). */
export const MARKETING_PRICING_SECTION = {
  id: 'pricing',
  eyebrow: 'Pricing',
  title: 'Simple tiers. Talk to us for anything custom.',
  subtitle:
    "Start a free trial on any tier — we'll confirm final rates before you're charged.",
}

export const PLAN_CATALOG_IDS = Object.keys(PLAN_CATALOG)

/** Plans rendered on the public pricing grid, in display order. */
export const MARKETING_PRICING_PLAN_IDS = PLAN_CATALOG_IDS.filter(
  id => PLAN_CATALOG[id].showOnPricingPage,
)

export function catalogPlan(planId) {
  return PLAN_CATALOG[planId] ?? null
}

export function normalizeSignupPlanId(planId) {
  const id = String(planId || '').trim()
  if (id && catalogPlan(id)) return id
  return 'free_trial'
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

/** @returns {{ type: 'label', label: string } | { type: 'price', amount: string, suffix: string }} */
export function planPriceDisplay(planId) {
  const plan = catalogPlan(planId)
  if (!plan) return { type: 'price', amount: '—', suffix: '' }
  if (plan.marketingPriceLabel) {
    return { type: 'label', label: plan.marketingPriceLabel }
  }
  if (plan.priceCents === 0) {
    return { type: 'price', amount: 'Free', suffix: '' }
  }
  const dollars = Math.round(plan.priceCents / 100)
  return { type: 'price', amount: `$${dollars}`, suffix: '/month' }
}

export function marketingPlanCard(planId) {
  const plan = catalogPlan(planId)
  if (!plan?.showOnPricingPage) return null
  const price = planPriceDisplay(planId)
  const isContact = plan.marketingCta === 'contact'
  const signupLabel = plan.marketingCtaLabel ?? `Choose ${plan.name}`
  return {
    id: plan.id,
    name: plan.name,
    description: plan.marketingDescription,
    featured: Boolean(plan.marketingFeatured),
    highlights: plan.highlights,
    pricingNote: plan.pricingNote ?? '',
    price,
    cta: {
      label: isContact ? 'Contact us' : signupLabel,
      variant: isContact ? 'ghost' : (plan.marketingFeatured ? 'primary' : 'ghost'),
      kind: isContact ? 'contact' : 'signup',
      planId: plan.id,
    },
  }
}

export function listMarketingPricingPlans() {
  return MARKETING_PRICING_PLAN_IDS.map(marketingPlanCard).filter(Boolean)
}

/** Short copy for signup screen from chosen plan intent. */
export function signupIntentSummary(planId) {
  const intent = normalizeSignupPlanId(planId)
  const plan = catalogPlan(intent)
  if (!plan || intent === 'free_trial') {
    return {
      planId: 'free_trial',
      name: PLAN_CATALOG.free_trial.name,
      headline: 'Start your 14-day free trial',
      detail: 'No credit card required. Upgrade or change plans anytime by talking to us.',
      highlights: PLAN_CATALOG.free_trial.highlights,
      price: planPriceDisplay('free_trial'),
    }
  }
  const price = planPriceDisplay(intent)
  const priceLine = price.type === 'label'
    ? price.label
    : `${price.amount}${price.suffix ? ` ${price.suffix}` : ''}`
  return {
    planId: intent,
    name: plan.name,
    headline: `Create your organization — ${plan.name}`,
    detail: `You'll begin on a free trial. We will confirm ${priceLine} before any billing starts.`,
    highlights: plan.highlights,
    price,
  }
}

export function selfServiceTargetPlanIds(currentPlanId) {
  const paidSelfService = PLAN_CATALOG_IDS.filter(
    id => id !== currentPlanId && PLAN_CATALOG[id].selfService,
  )
  return paidSelfService
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
