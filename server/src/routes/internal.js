/**
 * Loopback-only routes for host integrations (Caddy on-demand TLS, nginx embed CSP).
 */
import { loadConfig } from '../config.js'
import { isAllowedCaddySurveyHost, listVerifiedEnterpriseSurveyDomains } from '../lib/platform/caddyAsk.js'
import { findPublicSurvey } from '../lib/survey/surveyPublicPath.js'
import { readEmbedAllowedOrigins } from '../lib/platform/orgSettings.js'
import { buildFrameAncestorsDirective } from '../../../shared/embedProtocol.js'
import { sendIfRateLimited } from '../lib/survey/rateLimit.js'

function isLoopbackRequest(request) {
  const ip = String(request.ip || '')
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim()
  const loopback = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
  return loopback.has(ip) || loopback.has(forwarded)
}

function isAuthorizedInternalRequest(request, internalApiSecret) {
  if (internalApiSecret) {
    const token = request.headers['x-internal-token'] || request.query?.token
    return token === internalApiSecret
  }
  return isLoopbackRequest(request)
}

export async function registerInternalRoutes(app) {
  const { internalApiSecret } = loadConfig()
  const limits = app.rateLimits

  app.get('/api/internal/caddy-ask', async (request, reply) => {
    const limited = await sendIfRateLimited(limits.caddyAsk, request, reply, 'caddy-ask')
    if (limited) return limited

    if (!isAuthorizedInternalRequest(request, internalApiSecret)) {
      return reply.code(403).send('Forbidden')
    }

    const domain = String(request.query?.domain || '').trim().toLowerCase()
    if (!domain) {
      return reply.code(400).send('Missing domain')
    }

    const verifiedDomains = await listVerifiedEnterpriseSurveyDomains(app.prisma)
    if (!isAllowedCaddySurveyHost(domain, verifiedDomains)) {
      return reply.code(403).send('Domain not allowed')
    }

    return reply.code(200).send('OK')
  })

  app.get('/api/internal/embed-csp', async (request, reply) => {
    const limited = await sendIfRateLimited(limits.caddyAsk, request, reply, 'embed-csp')
    if (limited) return limited

    const uri = String(request.query?.uri || '').trim()
    const match = uri.match(/^\/embed\/([^/?#]+)/i)
    if (!match) {
      return reply.code(403).send('Forbidden')
    }

    const row = await findPublicSurvey(app.prisma, match[1], null)
    if (!row || row.survey?.status !== 'live') {
      return reply.code(403).send('Forbidden')
    }

    const org = await app.prisma.organization.findUnique({
      where: { id: row.organizationId },
      select: { settings: true },
    })
    const embedOrigins = readEmbedAllowedOrigins(org?.settings)
    reply.header('X-Embed-Frame-Ancestors', buildFrameAncestorsDirective(embedOrigins))
    return reply.code(200).send('OK')
  })
}
