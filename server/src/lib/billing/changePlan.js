/**
 * Self-service subscription plan changes.
 * Evaluates upgrade/downgrade eligibility (seat and survey limits), applies plan
 * switches, strips downgraded features from org settings, and creates invoices.
 */
import {
  canUseBrandKit,
  canUseCustomDomain,
  canEmbedOnOwnSites,
  isFreeTrialPlan,
  maxSurveys,
  planFeatureSummary,
} from '../../../../shared/planFeatures.js'
import {
  catalogPlan,
  isPlanDowngrade,
  isPlanUpgrade,
  selfServiceTargetPlanIds,
  serializeCatalogPlan,
} from '../../../../shared/planCatalog.js'
import {
  defaultTrialPeriod,
  planById,
  serializeInvoice,
  serializeSubscription,
} from './billingPlans.js'
import { ensureOrgBilling } from './billingDefaults.js'
import { patchOrgSettings, readSurveyDomain } from '../platform/orgSettings.js'

function defaultBillingPeriod() {
  const start = new Date()
  const end = new Date(start)
  end.setDate(end.getDate() + 30)
  return { start, end }
}

function downgradeWarnings(fromPlanId, toPlanId) {
  const warnings = []
  const from = planFeatureSummary(fromPlanId)
  const to = planFeatureSummary(toPlanId)

  if (from.brandKit && !to.brandKit) {
    warnings.push('Brand Kit and custom themes will be disabled.')
  }
  if (from.embed && !to.embed) {
    warnings.push('Survey embeds on external sites will stop working.')
  }
  if (from.customDomain && !to.customDomain) {
    warnings.push('Your custom survey domain will be removed.')
  }
  if (from.hidePlatformBranding && !to.hidePlatformBranding) {
    warnings.push('Platform branding will appear on public surveys again.')
  }

  const toCap = maxSurveys(toPlanId)
  if (toCap != null) {
    warnings.push(`Survey creation will be limited to ${toCap} surveys.`)
  }

  return warnings
}

export async function loadOrgUsage(prisma, organizationId) {
  const [surveys, users] = await Promise.all([
    prisma.survey.count({ where: { organizationId } }),
    prisma.user.count({ where: { organizationId } }),
  ])
  return { surveys, users }
}

export async function evaluatePlanChange(prisma, organizationId, targetPlanId) {
  const subscription = await ensureOrgBilling(prisma, organizationId)
  const currentPlanId = subscription.planId
  const targetPlan = planById(targetPlanId)

  if (!targetPlan) {
    return { ok: false, error: 'Invalid plan.', code: 'INVALID_PLAN' }
  }

  if (currentPlanId === targetPlanId) {
    return { ok: false, error: 'You are already on this plan.', code: 'SAME_PLAN' }
  }

  const allowedTargets = selfServiceTargetPlanIds(currentPlanId)
  if (!allowedTargets.includes(targetPlanId) || (targetPlan.priceCents ?? 0) > 0) {
    return {
      ok: false,
      error: 'Paid plan changes are handled by the vendor until billing is connected.',
      code: 'PLAN_NOT_AVAILABLE',
    }
  }

  const usage = await loadOrgUsage(prisma, organizationId)
  const blockers = []

  if (usage.users > targetPlan.seats) {
    blockers.push({
      code: 'SEAT_LIMIT',
      message: `Remove ${usage.users - targetPlan.seats} team member(s) before switching to ${targetPlan.name}.`,
      current: usage.users,
      limit: targetPlan.seats,
    })
  }

  const targetSurveyCap = maxSurveys(targetPlanId)
  if (targetSurveyCap != null && usage.surveys > targetSurveyCap) {
    blockers.push({
      code: 'SURVEY_LIMIT',
      message: `Delete ${usage.surveys - targetSurveyCap} survey(s) before switching to ${targetPlan.name}.`,
      current: usage.surveys,
      limit: targetSurveyCap,
    })
  }

  const direction = isPlanUpgrade(currentPlanId, targetPlanId)
    ? 'upgrade'
    : isPlanDowngrade(currentPlanId, targetPlanId)
      ? 'downgrade'
      : 'change'

  return {
    ok: blockers.length === 0,
    direction,
    blockers,
    warnings: direction === 'downgrade' ? downgradeWarnings(currentPlanId, targetPlanId) : [],
    usage,
    currentPlanId,
    targetPlanId,
    targetPlan: serializeCatalogPlan(targetPlanId),
  }
}

export async function buildPlanChangeOptions(prisma, organizationId) {
  const subscription = await ensureOrgBilling(prisma, organizationId)
  const currentPlanId = subscription.planId
  const usage = await loadOrgUsage(prisma, organizationId)

  const displayIds = [...new Set([
    currentPlanId,
    ...selfServiceTargetPlanIds(currentPlanId),
  ])]

  const plans = displayIds
    .map((planId) => {
      if (planId === currentPlanId) {
        return {
          planId,
          plan: serializeCatalogPlan(planId),
          direction: 'current',
          selectable: false,
          blockers: [],
          warnings: [],
        }
      }
      return evaluatePlanChangeSync(currentPlanId, planId, usage)
    })
    .sort((a, b) => a.plan.tier - b.plan.tier)

  return {
    currentPlanId,
    usage,
    plans,
  }
}

function evaluatePlanChangeSync(currentPlanId, targetPlanId, usage) {
  const targetPlan = catalogPlan(targetPlanId)
  const blockers = []

  if (usage.users > targetPlan.seats) {
    blockers.push({
      code: 'SEAT_LIMIT',
      message: `Remove ${usage.users - targetPlan.seats} team member(s) first.`,
      current: usage.users,
      limit: targetPlan.seats,
    })
  }

  const targetSurveyCap = maxSurveys(targetPlanId)
  if (targetSurveyCap != null && usage.surveys > targetSurveyCap) {
    blockers.push({
      code: 'SURVEY_LIMIT',
      message: `Delete ${usage.surveys - targetSurveyCap} survey(s) first.`,
      current: usage.surveys,
      limit: targetSurveyCap,
    })
  }

  const direction = isPlanUpgrade(currentPlanId, targetPlanId) ? 'upgrade' : 'downgrade'

  return {
    planId: targetPlanId,
    plan: serializeCatalogPlan(targetPlanId),
    direction,
    selectable: blockers.length === 0,
    blockers,
    warnings: direction === 'downgrade' ? downgradeWarnings(currentPlanId, targetPlanId) : [],
  }
}

async function stripDowngradedSettings(prisma, organizationId, fromPlanId, toPlanId) {
  if (!isPlanDowngrade(fromPlanId, toPlanId)) return

  const org = await prisma.organization.findUnique({ where: { id: organizationId } })
  if (!org) return

  const patch = {}
  const toFeatures = planFeatureSummary(toPlanId)

  if (!toFeatures.brandKit) {
    patch.brandKit = null
  }
  if (!toFeatures.embed) {
    patch.embedAllowedOrigins = []
  }
  if (!toFeatures.customDomain && readSurveyDomain(org.settings)) {
    patch.surveyDomain = ''
    patch.domainVerification = null
  }

  if (Object.keys(patch).length === 0) return

  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: patchOrgSettings(org.settings, patch) },
  })
}

export async function applyPlanChange(prisma, organizationId, targetPlanId) {
  const evaluation = await evaluatePlanChange(prisma, organizationId, targetPlanId)
  if (!evaluation.ok) {
    return {
      ok: false,
      error: evaluation.blockers?.[0]?.message || evaluation.error || 'Plan change blocked.',
      code: evaluation.blockers?.[0]?.code || evaluation.code || 'PLAN_CHANGE_BLOCKED',
      blockers: evaluation.blockers ?? [],
    }
  }

  const subscription = await ensureOrgBilling(prisma, organizationId)
  const plan = planById(targetPlanId)
  const data = {
    planId: targetPlanId,
    seats: plan.seats,
    priceCents: plan.priceCents,
  }

  if (isFreeTrialPlan(subscription.planId) && !isFreeTrialPlan(targetPlanId)) {
    const { start, end } = defaultBillingPeriod()
    data.status = 'active'
    data.currentPeriodStart = start
    data.currentPeriodEnd = end
  } else if (subscription.status === 'trialing' && !isFreeTrialPlan(targetPlanId)) {
    data.status = 'active'
  }

  const updatedAndInvoice = await prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.update({
      where: { organizationId },
      data,
    })

    await stripDowngradedSettings(
      tx,
      organizationId,
      subscription.planId,
      targetPlanId,
    )

    let invoice = null
    if (plan.priceCents > 0 && isPlanUpgrade(subscription.planId, targetPlanId)) {
      const { start, end } = defaultBillingPeriod()
      invoice = await tx.invoice.create({
        data: {
          organizationId,
          amountCents: plan.priceCents,
          currency: updated.currency || 'USD',
          status: 'open',
          description: `${plan.name} plan — monthly subscription`,
          periodStart: start,
          periodEnd: end,
          dueDate: end,
        },
      })
    }

    return { updated, invoice }
  })

  const { updated, invoice } = updatedAndInvoice

  const [surveyCount, userCount] = await Promise.all([
    prisma.survey.count({ where: { organizationId } }),
    prisma.user.count({ where: { organizationId } }),
  ])

  return {
    ok: true,
    subscription: serializeSubscription(updated),
    planFeatures: planFeatureSummary(updated.planId),
    usage: { surveys: surveyCount, users: userCount },
    invoice: invoice ? serializeInvoice(invoice) : null,
    direction: evaluation.direction,
  }
}
