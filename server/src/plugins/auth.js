import fastifyJwt from '@fastify/jwt'

const PUBLIC_EXACT = new Set(['/api/auth/login', '/api/auth/signup'])
const PUBLIC_PREFIXES = ['/api/public/']

function isPublicRoute(url) {
  const path = url.split('?')[0]
  if (PUBLIC_EXACT.has(path)) return true
  return PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix))
}

function authError(reply, { status = 401, error, code }) {
  return reply.code(status).send({ error, code })
}

export async function registerAuth(app, { jwtSecret, jwtExpiresIn }) {
  await app.register(fastifyJwt, {
    secret: jwtSecret,
    sign: { expiresIn: jwtExpiresIn },
  })

  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api')) return
    if (isPublicRoute(request.url)) return

    try {
      await request.jwtVerify()
    } catch (err) {
      if (err.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
        return authError(reply, {
          error: 'Session expired. Please sign in again.',
          code: 'TOKEN_EXPIRED',
        })
      }
      return authError(reply, {
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      })
    }

    const payload = request.user
    const user = await app.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        organizationId: true,
        role: true,
        username: true,
        email: true,
        name: true,
      },
    })

    // Trust the live DB row, not the JWT snapshot — role changes and deletions
    // take effect on the very next request.
    if (!user || user.organizationId !== payload.organizationId) {
      return authError(reply, {
        error: 'Session is no longer valid. Please sign in again.',
        code: 'SESSION_INVALID',
      })
    }

    request.auth = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      user,
    }
    request.organizationId = user.organizationId
  })
}
