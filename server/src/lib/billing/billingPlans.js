import { maxSurveys } from '../../../../shared/planFeatures.js'
import { PLAN_CATALOG } from '../../../../shared/planCatalog.js'

/** Subscription plan catalog — amounts in cents (USD). */
export const PLANS = Object.fromEntries(
  Object.entries(PLAN_CATALOG).map(([id, plan]) => [id, {
    id: plan.id,
    name: plan.name,
    seats: plan.seats,
    priceCents: plan.priceCents,
  }]),
)

export const PLAN_IDS = new Set(Object.keys(PLANS))

export const SUBSCRIPTION_STATUSES = new Set([
  'trialing', 'active', 'past_due', 'canceled',
])

export const INVOICE_STATUSES = new Set([
  'draft', 'open', 'paid', 'void',
])

export function planById(planId) {
  return PLANS[planId] ?? null
}

export function defaultTrialPeriod() {
  const start = new Date()
  const end = new Date(start)
  end.setDate(end.getDate() + 14)
  return { start, end }
}

export function serializeSubscription(row) {
  const plan = planById(row.planId)
  return {
    id:                 row.id,
    planId:             row.planId,
    planName:           plan?.name ?? row.planId,
    status:             row.status,
    seats:              row.seats,
    maxSurveys:         maxSurveys(row.planId),
    priceCents:         row.priceCents,
    currency:           row.currency,
    currentPeriodStart: row.currentPeriodStart.toISOString(),
    currentPeriodEnd:   row.currentPeriodEnd.toISOString(),
  }
}

export function serializeInvoice(row) {
  return {
    id:          row.id,
    amountCents:   row.amountCents,
    currency:    row.currency,
    status:      row.status,
    description: row.description,
    periodStart: row.periodStart?.toISOString() ?? null,
    periodEnd:   row.periodEnd?.toISOString() ?? null,
    dueDate:     row.dueDate?.toISOString() ?? null,
    paidAt:      row.paidAt?.toISOString() ?? null,
    createdAt:   row.createdAt.toISOString(),
  }
}
