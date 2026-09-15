/**
 * Email address confirmation for self-signup admins.
 * Verifying works with or without an active session; unverified accounts can
 * use the product but cannot invite teammates until confirmed.
 */
import { enforceAuthLimits } from '../lib/survey/rateLimit.js'
import { sendVerificationEmail } from '../lib/auth/accountLinks.js'
import { AUTH_TOKEN_TYPES, AuthTokenError, consumeAuthToken } from '../lib/auth/authTokens.js'

export async function registerEmailVerificationRoutes(app) {
  const limits = app.rateLimits

  app.post('/api/auth/email/verify', async (request, reply) => {
    const limited = await enforceAuthLimits(request, reply, {
      ipLimiter: limits.tokenExchange,
      globalLimiter: limits.tokenExchangeGlobal,
      scope: 'token-exchange',
    })
    if (limited) return limited

    try {
      const row = await consumeAuthToken(app.prisma, AUTH_TOKEN_TYPES.EMAIL_VERIFY, request.body?.token)
      await app.prisma.user.updateMany({
        where: { id: row.userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: new Date() },
      })
      app.cache.invalidateUser(row.userId)
      return { ok: true }
    } catch (err) {
      if (err instanceof AuthTokenError) {
        return reply.code(400).send({ error: err.message, code: err.code })
      }
      throw err
    }
  })

  /** Signed-in user asks for a fresh confirmation link. */
  app.post('/api/auth/email/resend', async (request, reply) => {
    const limited = await enforceAuthLimits(request, reply, {
      ipLimiter: limits.recovery,
      globalLimiter: limits.recoveryGlobal,
      scope: 'recovery',
    })
    if (limited) return limited

    const user = await app.prisma.user.findUnique({
      where: { id: request.auth.userId },
      select: { id: true, email: true, name: true, username: true, organizationId: true, emailVerifiedAt: true },
    })
    if (!user) return reply.code(404).send({ error: 'User not found.' })
    if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true }

    await sendVerificationEmail(app, user)
    return { ok: true }
  })
}
