// ─── White-label survey URL helpers (shared by client + server) ─────────────
// Target shape: https://surveys.{clientDomain}/{project-slug-ddmmyy}

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

/** Client subdomain label from a display name (e.g. "DMR Group" → "dmr-group"). */
export function clientDomainFromName(name) {
  return slugify(name)
}

/** Full public survey URL on a white-label host. */
export function buildSurveyPublicUrl(clientDomain, publicPath, { protocol = 'https' } = {}) {
  const domain = clientDomain || 'client'
  const path = publicPath || 'survey'
  return `${protocol}://surveys.${domain}/${path}`
}

/** Local dev/test link — always works on the current host. */
export function buildLocalTakeUrl(surveyId, origin = typeof window !== 'undefined' ? window.location.origin : '', pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  const base = `${origin}${pathname}`.replace(/\/$/, '') || origin
  return `${base}#/take/${surveyId}`
}

/** Extract client domain from hostname like surveys.acme.com */
export function parseSurveyHost(hostname) {
  const host = String(hostname || '').split(':')[0].toLowerCase()
  const match = host.match(/^surveys\.([a-z0-9-]+(?:\.[a-z0-9-]+)*)$/)
  return match ? match[1] : null
}

/** Name used when generating a public path slug. */
export function surveyPathName(survey) {
  return survey?.internalName?.trim() || survey?.title?.trim() || 'survey'
}

/** Preview path from the current survey name. */
export function previewPublicPath(survey) {
  const date = survey?.createdAt ? new Date(survey.createdAt) : new Date()
  return buildPublicPath(surveyPathName(survey), date)
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
