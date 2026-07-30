import { getDefaultOrganization } from '../lib/org.js'

/** Attach organizationId to each request until B2 auth middleware. */
export async function registerOrgScope(app) {
  app.addHook('onRequest', async (request) => {
    if (request.url === '/health' || !request.url.startsWith('/api')) return
    const org = await getDefaultOrganization(app.prisma)
    request.organizationId = org.id
  })
}
