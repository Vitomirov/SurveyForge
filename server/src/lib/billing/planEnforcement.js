/**
 * Subscription plan limit enforcement.
 * Pre-flight checks before creating surveys or adding team members — compares
 * current usage against plan seat and survey caps.
 */
import { maxSurveys } from '../../../../shared/planFeatures.js'
import { ensureOrgBilling } from './billingDefaults.js'

export async function assertCanCreateSurvey(prisma, organizationId) {
  const [subscription, count] = await Promise.all([
    ensureOrgBilling(prisma, organizationId),
    prisma.survey.count({ where: { organizationId } }),
  ])

  const limit = maxSurveys(subscription.planId)
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
  const [subscription, count] = await Promise.all([
    ensureOrgBilling(prisma, organizationId),
    prisma.user.count({ where: { organizationId } }),
  ])

  if (count >= subscription.seats) {
    return {
      ok: false,
      error: `Seat limit reached (${subscription.seats}). Upgrade your plan to add team members.`,
      code: 'SEAT_LIMIT',
    }
  }

  return { ok: true, count, seats: subscription.seats }
}
