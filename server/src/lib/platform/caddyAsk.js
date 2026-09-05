/**
 * Caddy on-demand TLS "ask" endpoint helpers.
 * Allows certificates only for surveys.{verified-enterprise-domain} hosts.
 */
import { parseSurveyHost } from '../../../../shared/surveyUrl.js'
import { readEffectiveSurveyDomain } from './orgSettings.js'

export function surveysHostnameForDomain(domain) {
  const normalized = String(domain || '').trim().toLowerCase()
  if (!normalized) return null
  return `surveys.${normalized}`
}

/** True when hostname is surveys.{verified enterprise survey domain}. */
export function isAllowedCaddySurveyHost(hostname, verifiedDomains) {
  const clientDomain = parseSurveyHost(hostname)
  if (!clientDomain) return false
  const allowed = new Set(
    (verifiedDomains || [])
      .map(domain => String(domain || '').trim().toLowerCase())
      .filter(Boolean),
  )
  return allowed.has(clientDomain)
}

export async function listVerifiedEnterpriseSurveyDomains(prisma) {
  const rows = await prisma.organization.findMany({
    where: {
      subscription: { planId: 'enterprise' },
    },
    select: {
      settings: true,
      subscription: { select: { planId: true } },
    },
  })

  return rows
    .map(row => readEffectiveSurveyDomain(row.settings, row.subscription?.planId || 'starter'))
    .filter(Boolean)
}
