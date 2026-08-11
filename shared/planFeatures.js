// ─── Subscription feature matrix (shared by client + server) ───────────────
// Existing survey URL / domain logic lives in surveyUrl.js — do not duplicate it here.

import { isEnterprisePlan } from './surveyUrl.js'

export const PLAN_IDS = ['starter', 'professional', 'enterprise']

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

export function planFeatureSummary(planId) {
  return {
    planId,
    brandKit: canUseBrandKit(planId),
    surveyThemeOverrides: canUseSurveyThemeOverrides(planId),
    hidePlatformBranding: canHidePlatformBranding(planId),
    embed: canEmbedOnOwnSites(planId),
    customDomain: canUseCustomDomain(planId),
    brandLock: canEnforceBrandLock(planId),
    embedOriginLimit: embedOriginLimit(planId),
  }
}
