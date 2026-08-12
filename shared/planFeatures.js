// ─── Subscription feature matrix (shared by client + server) ───────────────
// Existing survey URL / domain logic lives in surveyUrl.js — do not duplicate it here.

import { isEnterprisePlan } from './surveyUrl.js'

export const DEFAULT_PLAN_ID = 'free_trial'

export const PLAN_IDS = ['free_trial', 'starter', 'professional', 'enterprise']

export function resolvePlanId(planId) {
  return planId || DEFAULT_PLAN_ID
}

export function isFreeTrialPlan(planId) {
  return planId === 'free_trial'
}

export function isProfessionalPlan(planId) {
  return planId === 'professional' || isEnterprisePlan(planId)
}

/** Org-level Brand Kit (colors, fonts, logo defaults). */
export function canUseBrandKit(planId) {
  return isProfessionalPlan(planId)
}

/** Survey-level theme overrides on top of org defaults. */
export function canUseSurveyThemeOverrides(planId) {
  return isProfessionalPlan(planId)
}

/** Hide platform branding on public taker surfaces. */
export function canHidePlatformBranding(planId) {
  return isProfessionalPlan(planId)
}

/** Embed surveys in approved customer websites. */
export function canEmbedOnOwnSites(planId) {
  return isProfessionalPlan(planId)
}

/** Verified custom survey domain (enterprise only — see surveyUrl.isEnterprisePlan). */
export function canUseCustomDomain(planId) {
  return isEnterprisePlan(planId)
}

/** Lock survey editors to org brand defaults (enterprise). */
export function canEnforceBrandLock(planId) {
  return isEnterprisePlan(planId)
}

/** Max embed origins per plan (enterprise = unlimited represented as null). */
export function embedOriginLimit(planId) {
  if (isEnterprisePlan(planId)) return null
  if (planId === 'professional') return 10
  return 0
}

/** Max surveys per org; null = unlimited. */
export function maxSurveys(planId) {
  if (isFreeTrialPlan(planId)) return 5
  return null
}

export function planFeatureSummary(planId) {
  const resolved = resolvePlanId(planId)
  return {
    planId: resolved,
    brandKit: canUseBrandKit(resolved),
    surveyThemeOverrides: canUseSurveyThemeOverrides(resolved),
    hidePlatformBranding: canHidePlatformBranding(resolved),
    embed: canEmbedOnOwnSites(resolved),
    customDomain: canUseCustomDomain(resolved),
    brandLock: canEnforceBrandLock(resolved),
    embedOriginLimit: embedOriginLimit(resolved),
    maxSurveys: maxSurveys(resolved),
    isFreeTrial: isFreeTrialPlan(resolved),
  }
}
