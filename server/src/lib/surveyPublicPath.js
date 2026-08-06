import {
  buildPublicPath,
  clientDomainFromName,
  isPublicPathLocked,
  previewPublicPath,
  surveyPathName,
} from '../../../shared/surveyUrl.js'

export { resolvePublicPath } from '../../../shared/surveyUrl.js'

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
  const date = survey.createdAt ? new Date(survey.createdAt) : new Date()
  const base = buildPublicPath(name, date)
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

/** Match a survey row to a white-label client subdomain. */
export function surveyMatchesClientDomain(row, clientDomain, clientById) {
  if (!clientDomain) return true
  const clientId = row.survey?.clientId
  if (!clientId) return false
  const client = clientById.get(clientId)
  return client ? clientDomainFromName(client.name) === clientDomain : false
}

export async function findPublicSurvey(prisma, publicPath, clientDomain = null) {
  const rows = await prisma.survey.findMany({
    where: { publicPath },
  })
  if (!rows.length) return null

  const live = rows.filter(r => r.survey?.status === 'live')
  if (!live.length) return null

  if (!clientDomain) return live[0]

  const clientIds = [...new Set(live.map(r => r.survey?.clientId).filter(Boolean))]
  const clients = clientIds.length
    ? await prisma.client.findMany({ where: { id: { in: clientIds } } })
    : []
  const clientById = new Map(clients.map(c => [c.id, c]))

  return live.find(r => surveyMatchesClientDomain(r, clientDomain, clientById)) || null
}

export function clientDomainFromRequest(request) {
  const host = request.headers['x-forwarded-host'] || request.headers.host || ''
  const hostname = host.split(':')[0]
  const fromHost = hostname.match(/^surveys\.(.+)$/i)
  if (fromHost) return fromHost[1].toLowerCase()
  const q = request.query?.client
  return q ? String(q).toLowerCase() : null
}
