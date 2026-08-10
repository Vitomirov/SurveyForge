// ─── White-label survey URL helpers (shared by client + server) ─────────────
// Target shape: https://surveys.{clientDomain}/{project-slug-ddmmyy}

export const SURVEYFORGE_HOST = 'surveyforge.com'

/** Normalize a survey host/domain. */
export function normalizeSurveyDomain(domain) {
  const raw = String(domain || '').trim().toLowerCase()
  if (!raw) return null
  const cleaned = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '')
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(cleaned)) return cleaned
  return null
}

/** Lowercase slug safe for URL paths. */
export function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'survey'
}

/** Date suffix in ddmmyy format. */
export function dateSuffix(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}${mm}${yy}`
}

/** Path segment: slugified project name + date suffix. */
export function buildPublicPath(name, date = new Date()) {
  const base = slugify(name)
  return `${base}-${dateSuffix(date)}`
}

export function isEnterprisePlan(planId) {
  return planId === 'enterprise'
}

/** Host label for a survey link based on plan and org domain. */
export function resolveSurveyHost({ planId = 'starter', surveyDomain } = {}) {
  if (isEnterprisePlan(planId)) {
    return normalizeSurveyDomain(surveyDomain) || SURVEYFORGE_HOST
  }
  return SURVEYFORGE_HOST
}

/** Full public survey URL on a white-label host. */
export function buildSurveyPublicUrl(host, publicPath, { protocol = 'https' } = {}) {
  const path = publicPath || 'survey'
  const domain = host || SURVEYFORGE_HOST
  return `${protocol}://surveys.${domain}/${path}`
}

/** Whether a request host matches the configured survey host. */
export function surveyHostMatches(requestDomain, { planId = 'starter', surveyDomain } = {}) {
  const expected = resolveSurveyHost({ planId, surveyDomain })
  return String(requestDomain || '').trim().toLowerCase() === expected
}

/** Builder share link — single entry point for display/copy. */
export function buildShareableSurveyUrl({ survey, planId = 'starter', surveyDomain, protocol = 'https' } = {}) {
  if (!survey?.id) return null
  if (isEnterprisePlan(planId) && !normalizeSurveyDomain(surveyDomain)) return null
  const host = resolveSurveyHost({ planId, surveyDomain })
  const path = displayPublicPath(survey)
  return buildSurveyPublicUrl(host, path, { protocol })
}

/** Local dev/test link — always works on the current host. */
export function buildLocalTakeUrl(surveyId, origin = typeof window !== 'undefined' ? window.location.origin : '', pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  const base = `${origin}${pathname}`.replace(/\/$/, '') || origin
  return `${base}#/take/${surveyId}`
}

/** Extract survey host from hostname (surveys.surveyforge or cocacola.com). */
export function parseSurveyHost(hostname) {
  const host = String(hostname || '').split(':')[0].toLowerCase()
  const surveysMatch = host.match(/^surveys\.([a-z0-9-]+(?:\.[a-z0-9-]+)*)$/)
  if (surveysMatch) return surveysMatch[1]
  if (host !== 'localhost' && normalizeSurveyDomain(host)) return host
  return null
}

/** Name used when generating a public path slug (survey title only). */
export function surveyPathName(survey) {
  return survey?.title?.trim() || 'survey'
}

/** Preview path from the current survey name (date = today). */
export function previewPublicPath(survey) {
  return buildPublicPath(surveyPathName(survey))
}

/** Live surveys keep a fixed path; drafts follow the current name. */
export function isPublicPathLocked(survey) {
  return survey?.status === 'live' && Boolean(survey?.publicPath)
}

/** Path shown in the builder and used when assigning a slug. */
export function displayPublicPath(survey) {
  if (isPublicPathLocked(survey)) return survey.publicPath
  return previewPublicPath(survey)
}

/** Resolve publicPath from survey fields. */
export function resolvePublicPath(survey) {
  return displayPublicPath(survey)
}

/** Pick a unique path by appending -2, -3, … when base is taken. */
export function ensureUniquePublicPath(basePath, isTaken, surveyId = null) {
  let candidate = basePath
  let suffix = 2
  while (isTaken(candidate, surveyId)) {
    candidate = `${basePath}-${suffix}`
    suffix++
  }
  return candidate
}
