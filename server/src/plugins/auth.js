import fastifyJwt from '@fastify/jwt'
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../lib/auth/cookies.js'

const PUBLIC_EXACT = new Set([
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/refresh',
])
const PUBLIC_PREFIXES = ['/api/public/']

function isPublicRoute(url) {
  const path = url.split('?')[0]
  if (PUBLIC_EXACT.has(path)) return true
  return PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix))
}

function authError(reply, { status = 401, error, code }) {
  return reply.code(status).send({ error, code })
}

function extractAccessToken(request, authAllowBearer) {
  const fromCookie = request.cookies?.[ACCESS_COOKIE]
  if (fromCookie) return fromCookie
  if (!authAllowBearer) return null
  const header = request.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return null
}

export async function registerAuth(app, { jwtSecret, jwtExpiresIn, authAllowBearer = false }) {
  await app.register(fastifyJwt, {
    secret: jwtSecret,
    sign: { expiresIn: jwtExpiresIn },
  })

  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api')) return
    if (isPublicRoute(request.url)) return

    const token = extractAccessToken(request, authAllowBearer)
    if (!token) {
      // Access cookie expires with the JWT (~15m). The refresh cookie lasts
      // much longer — tell the client to rotate instead of treating this as logout.
      const hasRefresh = Boolean(request.cookies?.[REFRESH_COOKIE])
      return authError(reply, {
        error: hasRefresh ? 'Session expired. Please sign in again.' : 'Unauthorized',
        code: hasRefresh ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
      })
    }

    try {
      await request.jwtVerify({
        verify: { extractToken: () => token },
      })
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
        avatarUrl: true,
        tokenVersion: true,
      },
    })

    // Trust the live DB row, not the JWT snapshot — role changes, password
    // resets, and deletions take effect on the very next request.
    if (!user || user.organizationId !== payload.organizationId) {
      return authError(reply, {
        error: 'Session is no longer valid. Please sign in again.',
        code: 'SESSION_INVALID',
      })
    }

    const tokenVersion = payload.tv ?? 0
    if (tokenVersion !== (user.tokenVersion ?? 0)) {
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
