/**
 * In-process caches for the live-survey and author read paths.
 *
 * TTLs bound staleness if a write forgets to invalidate. Writes that change
 * authorization, survey definition, or org branding always invalidate.
 * Response stats / dashboard aggregates use TTL only — a second of lag is
 * accepted so GROUP BY does not run on every concurrent author poll.
 */
import { createTtlCache } from '../lib/cache/ttlCache.js'

const LIVE_SURVEY_TTL_MS = 5_000
const ORG_BRANDING_TTL_MS = 5_000
const USER_TTL_MS = 2_000
const STATS_TTL_MS = 1_500
const DASHBOARD_TTL_MS = 1_500

export async function registerHotCache(app) {
  const liveSurveys = createTtlCache({ max: 2_000, ttlMs: LIVE_SURVEY_TTL_MS })
  const orgBranding = createTtlCache({ max: 1_000, ttlMs: ORG_BRANDING_TTL_MS })
  const users = createTtlCache({ max: 4_000, ttlMs: USER_TTL_MS })
  const stats = createTtlCache({ max: 4_000, ttlMs: STATS_TTL_MS })
  const dashboards = createTtlCache({ max: 2_000, ttlMs: DASHBOARD_TTL_MS })
  const inflight = new Map()

  function loadOnce(key, fn) {
    const existing = inflight.get(key)
    if (existing) return existing
    const promise = Promise.resolve().then(fn).finally(() => inflight.delete(key))
    inflight.set(key, promise)
    return promise
  }

  app.decorate('cache', {
    getLiveSurvey: (id) => liveSurveys.get(id),
    setLiveSurvey: (id, row) => liveSurveys.set(id, row),

    getOrgBranding: (orgId) => orgBranding.get(orgId),
    setOrgBranding: (orgId, value) => orgBranding.set(orgId, value),

    getUser: (id) => users.get(id),
    setUser: (id, value) => users.set(id, value),

    getStats: (surveyId) => stats.get(surveyId),
    setStats: (surveyId, value) => stats.set(surveyId, value),

    getDashboard: (orgId, userId) => dashboards.get(`${orgId}:${userId}`),
    setDashboard: (orgId, userId, value) => dashboards.set(`${orgId}:${userId}`, value),
    loadOnce,

    invalidateSurvey(id, organizationId) {
      liveSurveys.del(id)
      stats.del(id)
      if (organizationId) dashboards.delByPrefix(`${organizationId}:`)
    },

    invalidateOrg(orgId) {
      orgBranding.del(orgId)
      dashboards.delByPrefix(`${orgId}:`)
    },

    invalidateUser(id) {
      users.del(id)
    },
  })
}
