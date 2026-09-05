/**
 * Loopback-only routes for host integrations (Caddy on-demand TLS).
 */
import { isAllowedCaddySurveyHost, listVerifiedEnterpriseSurveyDomains } from '../lib/platform/caddyAsk.js'

function isInternalAskRequest(request) {
  const ip = String(request.ip || '')
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim()
  const loopback = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

  if (loopback.has(ip) || loopback.has(forwarded)) return true

  // Host → loopback-published nginx → api (Docker bridge address).
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true

  return false
}

export async function registerInternalRoutes(app) {
  app.get('/api/internal/caddy-ask', async (request, reply) => {
    if (!isInternalAskRequest(request)) {
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
}
