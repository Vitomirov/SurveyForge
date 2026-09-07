/**
 * Rejects unsafe cookie-authenticated API requests that fail origin or CSRF checks.
 */
import { enforceCsrf } from '../lib/security/csrf.js'

export async function registerCsrf(app, config) {
  app.addHook('onRequest', async (request, reply) => {
    const result = enforceCsrf(request, {
      corsOrigin: config.corsOrigin,
      authAllowBearer: config.authAllowBearer,
      isDev: config.isDev,
    })
    if (!result.ok) {
      return reply.code(result.status).send({ error: result.error, code: 'CSRF_BLOCKED' })
    }
  })
}
