/**
 * Public (unauthenticated) survey taker routes.
 * Serves live survey definitions by public path or ID, DNC email checks,
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
import { isEmailOnDncList, normalizeEmail } from '../lib/survey/dncCheck.js'

const LIVE_SURVEY_SELECT = {
  id: true,
  organizationId: true,
  survey: true,
  items: true,
  revision: true,
}

async function loadOrgBrandingContext(app, organizationId) {
  const cached = app.cache.getOrgBranding(organizationId)
  if (cached) return cached

  return app.cache.loadOnce(`org:${organizationId}`, async () => {
    const hit = app.cache.getOrgBranding(organizationId)
    if (hit) return hit
    const [org, subscription] = await Promise.all([
      app.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      }),
      app.prisma.subscription.findUnique({
        where: { organizationId },
        select: { planId: true },
      }),
    ])
    const value = {
      settings: org?.settings,
      planId: resolvePlanId(subscription?.planId),
    }
    app.cache.setOrgBranding(organizationId, value)
    return value
  })
}

function applyEmbedSecurityHeaders(reply, { isEmbed, embedOrigins }) {
  if (!isEmbed) return
  const directive = buildFrameAncestorsDirective(embedOrigins)
  reply.header('Content-Security-Policy', `frame-ancestors ${directive}`)
}

function publicSurveyPayload(row, branding) {
  return {
    survey: row.survey,
    items:  row.items,
    branding,
  }
}

async function loadLivePublicSurvey(app, id, reply) {
  const cached = app.cache.getLiveSurvey(id)
  if (cached) {
    if (cached.survey?.status !== 'live') {
      reply.code(404).send({ error: 'Survey not found' })
      return null
    }
    return cached
  }

  const row = await app.cache.loadOnce(`survey:${id}`, async () => {
    const hit = app.cache.getLiveSurvey(id)
    if (hit) return hit
    const loaded = await app.prisma.survey.findUnique({
      where: { id },
      select: {
        ...LIVE_SURVEY_SELECT,
        organization: {
          select: {
            settings: true,
            subscription: { select: { planId: true } },
          },
        },
      },
    })
    if (loaded?.organization) {
      app.cache.setOrgBranding(loaded.organizationId, {
        settings: loaded.organization.settings,
        planId: resolvePlanId(loaded.organization.subscription?.planId),
      })
    }
    const row = loaded
      ? {
        id: loaded.id,
        organizationId: loaded.organizationId,
        survey: loaded.survey,
        items: loaded.items,
        revision: loaded.revision,
      }
      : null
    if (row?.survey?.status === 'live') app.cache.setLiveSurvey(id, row)
    return row
  })
  if (!row || row.survey?.status !== 'live') {
    reply.code(404).send({ error: 'Survey not found' })
    return null
  }
  return row
}

async function sendPublicSurvey(app, request, reply, row) {
  const isEmbed = request.query?.embed === '1' || request.query?.embed === 'true'
  const { settings, planId } = await loadOrgBrandingContext(app, row.organizationId)
  const branding = buildPublicBrandingPayload(settings, row.survey, planId)
  const embedOrigins = readEmbedAllowedOrigins(settings)
  applyEmbedSecurityHeaders(reply, { isEmbed, embedOrigins })
  return publicSurveyPayload(row, branding)
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

    app.cache.setLiveSurvey(row.id, {
      id: row.id,
      organizationId: row.organizationId,
      survey: row.survey,
      items: row.items,
      revision: row.revision,
    })
    return sendPublicSurvey(app, request, reply, row)
  })

  app.get('/api/public/surveys/:id', async (request, reply) => {
    const limited = sendIfRateLimited(limits.publicFetch, request, reply, 'public-fetch')
    if (limited) return limited

    const row = await loadLivePublicSurvey(app, request.params.id, reply)
    if (!row) return

    return sendPublicSurvey(app, request, reply, row)
  })

  app.post('/api/public/surveys/:id/dnc/check', async (request, reply) => {
    const limited = sendIfRateLimited(limits.dnc, request, reply, 'public-dnc')
    if (limited) return limited

    const row = await loadLivePublicSurvey(app, request.params.id, reply)
    if (!row) return

    const email = normalizeEmail(request.body?.email)
    if (!email || !email.includes('@')) {
      return reply.code(400).send({ error: 'Body must include a valid email' })
    }

    const onList = await isEmailOnDncList(app.prisma, row.id, email)
    return { onList }
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
