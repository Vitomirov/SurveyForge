/**
 * Public survey URL path management.
 * Assigns globally unique `publicPath` slugs, resolves surveys by path and
 * request host (custom domain routing), and extracts client domain from headers.
 */
import {
  buildPublicPath,
  isPublicPathLocked,
  previewPublicPath,
  surveyHostMatches,
  surveyPathName,
} from '../../../../shared/surveyUrl.js'
import { readEffectiveSurveyDomain } from '../platform/orgSettings.js'

export { resolvePublicPath } from '../../../../shared/surveyUrl.js'

async function pathIsTaken(prisma, candidate, surveyId) {
  const existing = await prisma.survey.findFirst({
    where: { publicPath: candidate },
    select: { id: true },
  })
  return Boolean(existing && existing.id !== surveyId)
}

/** Assign a globally unique publicPath for a survey row. */
export async function assignPublicPath(prisma, survey) {
  const surveyId = survey.id
  const name = surveyPathName(survey)
  const base = buildPublicPath(name)
  const start = isPublicPathLocked(survey) ? survey.publicPath : base

  const publicPath = await (async () => {
    let candidate = start
    let suffix = 2
    while (await pathIsTaken(prisma, candidate, surveyId)) {
      candidate = `${base}-${suffix}`
      suffix++
    }
    return candidate
  })()

  return {
    survey: { ...survey, publicPath },
    publicPath,
  }
}

/** Match a survey row to the request host via org plan + survey domain. */
export function surveyMatchesRequestHost(row, requestDomain, org) {
  if (!requestDomain) return true
  const planId = org?.subscription?.planId || 'starter'
  const surveyDomain = readEffectiveSurveyDomain(org?.settings, planId)
  return surveyHostMatches(requestDomain, { planId, surveyDomain })
}

export async function findPublicSurvey(prisma, publicPath, clientDomain = null) {
  const rows = await prisma.survey.findMany({
    where: { publicPath },
  })
  if (!rows.length) return null

  const live = rows.filter(r => r.survey?.status === 'live')
  if (!live.length) return null

  if (!clientDomain) return live[0]

  const orgIds = [...new Set(live.map(r => r.organizationId))]
  const orgs = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    include: { subscription: true },
  })
  const orgById = new Map(orgs.map(o => [o.id, o]))

  return live.find(r => surveyMatchesRequestHost(r, clientDomain, orgById.get(r.organizationId))) || null
}

export function clientDomainFromRequest(request) {
  const host = request.headers['x-forwarded-host'] || request.headers.host || ''
  const hostname = host.split(':')[0].toLowerCase()
  const fromSurveys = hostname.match(/^surveys\.(.+)$/i)
  if (fromSurveys) return fromSurveys[1].toLowerCase()
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(hostname) && hostname !== 'localhost') {
    return hostname
  }
  const q = request.query?.client
  return q ? String(q).toLowerCase() : null
}
