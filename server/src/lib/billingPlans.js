/** Subscription plan catalog — amounts in cents (USD). */
export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    seats: 5,
    priceCents: 4900,
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    seats: 25,
    priceCents: 14900,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    seats: 100,
    priceCents: 49900,
  },
}

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
