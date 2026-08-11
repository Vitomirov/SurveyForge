import { defaultTrialPeriod, planById } from './billingPlans.js'

const DEFAULT_PLAN_ID = 'starter'

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

/** One support thread per org (idempotent). */
export async function ensureSupportThread(prisma, organizationId) {
  const existing = await prisma.supportThread.findUnique({
    where: { organizationId },
  })
  if (existing) return existing

  return prisma.supportThread.create({
    data: { organizationId },
  })
}

export async function provisionOrgBilling(prisma, organizationId) {
  await ensureOrgBilling(prisma, organizationId)
  await ensureSupportThread(prisma, organizationId)
}
