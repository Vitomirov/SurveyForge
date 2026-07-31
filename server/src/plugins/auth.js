import fastifyJwt from '@fastify/jwt'

const PUBLIC_EXACT = new Set(['/api/auth/login', '/api/auth/signup'])
const PUBLIC_PREFIXES = ['/api/public/']

function isPublicRoute(url) {
  const path = url.split('?')[0]
  if (PUBLIC_EXACT.has(path)) return true
  return PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix))
}

export async function registerAuth(app, { jwtSecret }) {
  await app.register(fastifyJwt, {
    secret: jwtSecret,
  })

  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api')) return
    if (isPublicRoute(request.url)) return

    try {
      await request.jwtVerify()
      const payload = request.user
      request.organizationId = payload.organizationId
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}
