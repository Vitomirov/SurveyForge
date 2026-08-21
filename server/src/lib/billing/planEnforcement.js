/**
 * Subscription plan limit enforcement.
 * Pre-flight checks before creating surveys or adding team members — compares
 * current usage against plan seat and survey caps, and refuses work when the
 * subscription is canceled, past due, or a trial that has expired.
 */
import { maxSurveys } from '../../../../shared/planFeatures.js'
import { ensureOrgBilling } from './billingDefaults.js'

const INACTIVE_STATUSES = new Set(['canceled', 'past_due'])

/**
 * Live subscription check. Authoring paths may provision a missing trial row;
 * public paths must not.
 */
export async function assertOrgActive(prisma, organizationId, { provision = true } = {}) {
  const subscription = provision
    ? await ensureOrgBilling(prisma, organizationId)
    : await prisma.subscription.findUnique({ where: { organizationId } })

  if (!subscription) {
    return {
      ok: false,
      error: 'Subscription is not active.',
      code: 'SUBSCRIPTION_INACTIVE',
    }
  }

  if (INACTIVE_STATUSES.has(subscription.status)) {
    return {
      ok: false,
      error: 'Subscription is not active.',
      code: 'SUBSCRIPTION_INACTIVE',
    }
  }

  if (
    subscription.status === 'trialing'
    && subscription.currentPeriodEnd
    && subscription.currentPeriodEnd < new Date()
  ) {
    return {
      ok: false,
      error: 'Your trial has ended. Contact support to activate a plan.',
      code: 'TRIAL_EXPIRED',
    }
  }

  return { ok: true, subscription }
}

export async function assertCanCreateSurvey(prisma, organizationId) {
  const active = await assertOrgActive(prisma, organizationId)
  if (!active.ok) return active

  const count = await prisma.survey.count({ where: { organizationId } })
  const limit = maxSurveys(active.subscription.planId)
  if (limit != null && count >= limit) {
    return {
      ok: false,
      error: `Survey limit reached (${limit}). Upgrade your plan to create more surveys.`,
      code: 'SURVEY_LIMIT',
    }
  }

  return { ok: true, count, limit }
}

export async function assertCanAddUser(prisma, organizationId) {
  const active = await assertOrgActive(prisma, organizationId)
  if (!active.ok) return active

  const count = await prisma.user.count({ where: { organizationId } })
  if (count >= active.subscription.seats) {
    return {
      ok: false,
      error: `Seat limit reached (${active.subscription.seats}). Upgrade your plan to add team members.`,
      code: 'SEAT_LIMIT',
    }
  }

  return { ok: true, count, seats: active.subscription.seats }
}
