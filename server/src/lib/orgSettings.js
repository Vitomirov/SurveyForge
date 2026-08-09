import { normalizeSurveyDomain } from '../../../shared/surveyUrl.js'

export function readSurveyDomain(settings) {
  if (!settings || typeof settings !== 'object') return ''
  return normalizeSurveyDomain(settings.surveyDomain) || ''
}

export function patchOrgSettings(settings, { surveyDomain } = {}) {
  const next = settings && typeof settings === 'object' ? { ...settings } : {}
  if (surveyDomain !== undefined) {
    const normalized = normalizeSurveyDomain(surveyDomain)
    if (normalized) next.surveyDomain = normalized
    else delete next.surveyDomain
  }
  return next
}
