/**
 * Default subscription provisioning.
 * Ensures every organization has a trial subscription row on first access —
 * idempotent create used during signup and billing route handlers.
 */
import { DEFAULT_PLAN_ID } from '../../../../shared/planFeatures.js'
import { defaultTrialPeriod, planById } from './billingPlans.js'

/** Ensure every org has a subscription row (idempotent). */
export async function ensureOrgBilling(prisma, organizationId) {
  const existing = await prisma.subscription.findUnique({
    where: { organizationId },
  })
  if (existing) return existing

  const plan = planById(DEFAULT_PLAN_ID)
  const { start, end } = defaultTrialPeriod()

  return prisma.subscription.create({
    data: {
      organizationId,
      planId:             DEFAULT_PLAN_ID,
      status:             'trialing',
      seats:              plan.seats,
      priceCents:         plan.priceCents,
      currency:           'USD',
      currentPeriodStart: start,
      currentPeriodEnd:   end,
    },
  })
}

/** Provision billing for a new organization (idempotent). */
export async function provisionOrgBilling(prisma, organizationId) {
  return ensureOrgBilling(prisma, organizationId)
}
