/**
 * Public (unauthenticated) survey taker routes.
 * Serves live survey definitions by public path or ID, returns DNC lists,
 * accepts response submissions, and applies embed CSP headers and branding.
 */
import { upsertResponse } from './responses.js'
import { clientDomainFromRequest, findPublicSurvey } from '../lib/survey/surveyPublicPath.js'
import { buildPublicBrandingPayload } from '../lib/branding/publicBranding.js'
import { readEmbedAllowedOrigins } from '../lib/platform/orgSettings.js'
import { resolvePlanId } from '../../../shared/planFeatures.js'
import { buildFrameAncestorsDirective } from '../../../shared/embedProtocol.js'
import { createRouteLimiters, sendIfRateLimited } from '../lib/survey/rateLimit.js'
import { loadConfig } from '../config.js'

async function loadOrgBrandingContext(prisma, organizationId) {
  const [org, subscription] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    }),
    prisma.subscription.findUnique({
      where: { organizationId },
      select: { planId: true },
    }),
  ])
  return {
    settings: org?.settings,
    planId: resolvePlanId(subscription?.planId),
  }
}

function applyEmbedSecurityHeaders(reply, { isEmbed, embedOrigins }) {
  if (!isEmbed) return
  const directive = buildFrameAncestorsDirective(embedOrigins)
  reply.header('Content-Security-Policy', `frame-ancestors ${directive}`)
}

async function dncEmailsForSurvey(prisma, surveyRow) {
  const rows = await prisma.dncEntry.findMany({
    where: { surveyId: surveyRow.id },
    orderBy: { email: 'asc' },
  })
  return rows.map(r => r.email)
}

async function loadLivePublicSurvey(app, id, reply) {
  const row = await app.prisma.survey.findUnique({ where: { id } })
  if (!row || row.survey?.status !== 'live') {
    reply.code(404).send({ error: 'Survey not found' })
    return null
  }
  return row
}

export async function registerPublicRoutes(app) {
  const { rateLimitRelaxed } = loadConfig()
  const limits = createRouteLimiters({ relaxed: rateLimitRelaxed })

  app.get('/api/public/s/:publicPath', async (request, reply) => {
    const limited = sendIfRateLimited(limits.publicFetch, request, reply, 'public-fetch')
    if (limited) return limited

    const clientDomain = clientDomainFromRequest(request)
    const row = await findPublicSurvey(app.prisma, request.params.publicPath, clientDomain)
    if (!row) return reply.code(404).send({ error: 'Survey not found' })

    const isEmbed = request.query?.embed === '1' || request.query?.embed === 'true'
    const { settings, planId } = await loadOrgBrandingContext(app.prisma, row.organizationId)
    const branding = buildPublicBrandingPayload(settings, row.survey, planId)
    const embedOrigins = readEmbedAllowedOrigins(settings)
    applyEmbedSecurityHeaders(reply, { isEmbed, embedOrigins })

    return {
      survey: row.survey,
      items:  row.items,
      branding,
    }
  })

  app.get('/api/public/surveys/:id', async (request, reply) => {
    const limited = sendIfRateLimited(limits.publicFetch, request, reply, 'public-fetch')
    if (limited) return limited

    const row = await loadLivePublicSurvey(app, request.params.id, reply)
    if (!row) return

    const isEmbed = request.query?.embed === '1' || request.query?.embed === 'true'
    const { settings, planId } = await loadOrgBrandingContext(app.prisma, row.organizationId)
    const branding = buildPublicBrandingPayload(settings, row.survey, planId)
    const embedOrigins = readEmbedAllowedOrigins(settings)
    applyEmbedSecurityHeaders(reply, { isEmbed, embedOrigins })

    return {
      survey: row.survey,
      items:  row.items,
      branding,
    }
  })

  app.get('/api/public/surveys/:id/dnc', async (request, reply) => {
    const limited = sendIfRateLimited(limits.dnc, request, reply, 'public-dnc')
    if (limited) return limited

    const row = await loadLivePublicSurvey(app, request.params.id, reply)
    if (!row) return

    return { emails: await dncEmailsForSurvey(app.prisma, row) }
  })

  app.post('/api/public/surveys/:id/responses', async (request, reply) => {
    const limited = sendIfRateLimited(limits.responses, request, reply, 'responses')
    if (limited) return limited

    const row = await loadLivePublicSurvey(app, request.params.id, reply)
    if (!row) return

    const entry = request.body
    if (!entry?.id) {
      return reply.code(400).send({ error: 'Response entry must include id' })
    }

    const result = await upsertResponse(app, {
      surveyId: row.id,
      organizationId: row.organizationId,
      entry,
      surveyItems: row.items || [],
    })
    if (!result) {
      return reply.code(400).send({ error: 'Response entry must include id and status' })
    }
    if (result.conflict) {
      return reply.code(409).send({ error: 'Response id belongs to another survey' })
    }
    if (result.invalidStatus) {
      return reply.code(400).send({ error: 'Invalid response status' })
    }

    return { ok: true, id: result.row.id }
  })
}
