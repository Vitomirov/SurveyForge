/**
 * Self-service password reset.
 * "Forgot" always answers 200 so account existence is never disclosed. The
 * reset link is single-use and short-lived; a successful reset signs the user
 * in on this device and signs out every other session.
 */
import { hashPassword } from '../lib/auth/password.js'
import { validatePassword } from '../lib/auth/passwordPolicy.js'
import { issueAuthSession } from '../lib/auth/session.js'
import { revokeAllForUser } from '../lib/auth/refreshTokens.js'
import { enforceAuthLimits } from '../lib/survey/rateLimit.js'
import { sendPasswordResetEmail } from '../lib/auth/accountLinks.js'
import { AUTH_TOKEN_TYPES, AuthTokenError, consumeAuthToken } from '../lib/auth/authTokens.js'
import { normalizeEmail } from '../lib/auth/userIdentity.js'

const FORGOT_RESPONSE = {
  ok: true,
  message: 'If an account exists for that email, a reset link is on its way.',
}

export async function registerPasswordResetRoutes(app) {
  const limits = app.rateLimits

  app.post('/api/auth/password/forgot', async (request, reply) => {
    const limited = await enforceAuthLimits(request, reply, {
      ipLimiter: limits.recovery,
      globalLimiter: limits.recoveryGlobal,
      scope: 'recovery',
    })
    if (limited) return limited

    const email = normalizeEmail(request.body?.email)
    if (!email) return reply.code(400).send({ error: 'Email is required.' })

    const user = await app.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true, name: true, username: true, organizationId: true },
    })
    if (user) {
      sendPasswordResetEmail(app, user).catch(err => request.log.error(err, 'reset email failed'))
    }
    return FORGOT_RESPONSE
  })

  app.post('/api/auth/password/reset', async (request, reply) => {
    const limited = await enforceAuthLimits(request, reply, {
      ipLimiter: limits.tokenExchange,
      globalLimiter: limits.tokenExchangeGlobal,
      scope: 'token-exchange',
    })
    if (limited) return limited

    const { token, password } = request.body ?? {}
    const passwordCheck = validatePassword(password)
    if (!passwordCheck.ok) return reply.code(400).send({ error: passwordCheck.error })

    const passwordHash = await hashPassword(password)
    let user
    try {
      user = await app.prisma.$transaction(async (tx) => {
        const row = await consumeAuthToken(tx, AUTH_TOKEN_TYPES.PASSWORD_RESET, token)
        const updated = await tx.user.update({
          where: { id: row.userId },
          data: {
            passwordHash,
            tokenVersion: { increment: 1 },
            // Completing a reset proves control of the mailbox.
            emailVerifiedAt: new Date(),
          },
          include: { organization: { select: { name: true } } },
        })
        await revokeAllForUser(tx, updated.id)
        return updated
      })
    } catch (err) {
      if (err instanceof AuthTokenError) {
        return reply.code(400).send({ error: err.message, code: err.code })
      }
      throw err
    }

    app.cache.invalidateUser(user.id)
    const session = await issueAuthSession(app, reply, user, user.organization?.name)
    return { session }
  })
}
