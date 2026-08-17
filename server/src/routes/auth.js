import { verifyPassword, hashPassword } from '../lib/auth/password.js'
import { provisionOrgBilling } from '../lib/billing/billingDefaults.js'
import { createRouteLimiters, sendIfRateLimited } from '../lib/survey/rateLimit.js'
import { loadConfig } from '../config.js'
import { setAuthCookies, clearAuthCookies, readRefreshToken } from '../lib/auth/cookies.js'
import {
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  RefreshTokenError,
} from '../lib/auth/refreshTokens.js'
import {
  normalizeEmail,
  validateEmailFormat,
  assertEmailAvailable,
  assertUsernameAvailableInOrg,
  deriveUsernameForOrg,
} from '../lib/auth/userIdentity.js'

function buildSession(user, organizationName = null) {
  return {
    userId:           user.id,
    organizationId:   user.organizationId,
    organizationName: organizationName,
    username:         user.username || user.email,
    name:             user.name || user.username || user.email,
    avatarUrl:        user.avatarUrl || null,
    role:             user.role,
    loginAt:          new Date().toISOString(),
  }
}

function signToken(app, session, tokenVersion = 0) {
  // Keep JWT lean — never embed avatarUrl (base64 images blow up Authorization headers).
  return app.jwt.sign({
    userId:           session.userId,
    organizationId:   session.organizationId,
    organizationName: session.organizationName,
    username:         session.username,
    name:             session.name,
    role:             session.role,
    tv:               tokenVersion,
  })
}

async function issueAuthSession(app, reply, user, organizationName = null) {
  const session = buildSession(user, organizationName)
  const accessToken = signToken(app, session, user.tokenVersion ?? 0)
  const { rawToken } = await createRefreshToken(app.prisma, user.id)
  setAuthCookies(reply, { accessToken, refreshToken: rawToken })
  return session
}

const MAX_AVATAR_BYTES = 512 * 1024

function validateAvatarUrl(value) {
  if (value === null || value === '') return { ok: true, avatarUrl: null }
  if (typeof value !== 'string') return { ok: false, error: 'Invalid profile image.' }
  if (!value.startsWith('data:image/')) {
    return { ok: false, error: 'Profile image must be a JPEG, PNG, or WebP file.' }
  }
  const base64 = value.split(',')[1]
  if (!base64) return { ok: false, error: 'Invalid profile image.' }
  const bytes = Math.ceil((base64.length * 3) / 4)
  if (bytes > MAX_AVATAR_BYTES) {
    return { ok: false, error: 'Profile image must be 512 KB or smaller.' }
  }
  return { ok: true, avatarUrl: value }
}

export async function registerAuthRoutes(app) {
  const { rateLimitRelaxed } = loadConfig()
  const limits = createRouteLimiters({ relaxed: rateLimitRelaxed })

  app.post('/api/auth/signup', async (request, reply) => {
    const { organizationName, name, email, password } = request.body ?? {}

    if (!organizationName?.trim()) {
      return reply.code(400).send({ error: 'Organization name is required.' })
    }
    if (!name?.trim() || !email?.trim() || !password) {
      return reply.code(400).send({ error: 'Name, email, and password are required.' })
    }
    if (password.length < 8) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters.' })
    }

    const formatCheck = validateEmailFormat(email)
    if (!formatCheck.ok) return reply.code(400).send({ error: formatCheck.error })

    const emailCheck = await assertEmailAvailable(app.prisma, formatCheck.email)
    if (!emailCheck.ok) return reply.code(409).send({ error: emailCheck.error })

    const passwordHash = await hashPassword(password)

    // Create org and admin atomically so a failure never leaves an orphan org behind.
    const { org, user } = await app.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: organizationName.trim(), settings: {} },
      })
      await provisionOrgBilling(tx, org.id)
      const username = await deriveUsernameForOrg(tx, org.id, emailCheck.email)
      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          username,
          email:          emailCheck.email,
          passwordHash,
          name:           name.trim(),
          role:           'admin',
        },
      })
      return { org, user }
    })

    const session = await issueAuthSession(app, reply, user, org.name)
    return reply.code(201).send({ session })
  })

  app.post('/api/auth/login', async (request, reply) => {
    const limited = sendIfRateLimited(limits.login, request, reply, 'login')
    if (limited) return limited

    const { email, password } = request.body ?? {}
    if (!email?.trim() || !password) {
      return reply.code(400).send({ error: 'Email and password are required.' })
    }

    const normalized = normalizeEmail(email)
    const user = await app.prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
      include: { organization: true },
    })

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid email or password.' })
    }

    const session = await issueAuthSession(app, reply, user, user.organization?.name)
    return { session }
  })

  app.post('/api/auth/logout', async (request, reply) => {
    const raw = readRefreshToken(request)
    if (raw) await revokeRefreshToken(app.prisma, raw)
    clearAuthCookies(reply)
    return { ok: true }
  })

  app.post('/api/auth/refresh', async (request, reply) => {
    const raw = readRefreshToken(request)
    if (!raw) {
      clearAuthCookies(reply)
      return reply.code(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
    }

    try {
      const rotated = await rotateRefreshToken(app.prisma, raw)
      const user = await app.prisma.user.findUnique({
        where: { id: rotated.userId },
        include: { organization: true },
      })
      if (!user) {
        clearAuthCookies(reply)
        return reply.code(401).send({
          error: 'Session is no longer valid. Please sign in again.',
          code: 'SESSION_INVALID',
        })
      }
      const session = buildSession(user, user.organization?.name)
      setAuthCookies(reply, {
        accessToken: signToken(app, session, user.tokenVersion ?? 0),
        refreshToken: rotated.rawToken,
      })
      return { session }
    } catch (err) {
      clearAuthCookies(reply)
      const code = err instanceof RefreshTokenError ? err.code : 'UNAUTHORIZED'
      if (code === 'REUSE_DETECTED') {
        return reply.code(401).send({ error: 'Unauthorized', code })
      }
      return reply.code(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
    }
  })

  /** Current caller — role and profile always read from the database. */
  app.get('/api/auth/me', async (request) => {
    const { user, organizationId, role, userId } = request.auth
    const org = await app.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    })
    const session = {
      userId,
      organizationId,
      organizationName: org?.name ?? null,
      username:         user.username || user.email,
      name:             user.name || user.username || user.email,
      avatarUrl:        user.avatarUrl || null,
      email:            user.email,
      role,
    }
    return { session }
  })

  /** Self-service profile updates for the signed-in user. */
  app.patch('/api/auth/me', async (request, reply) => {
    const { userId, organizationId } = request.auth
    const { name, username, avatarUrl, currentPassword, newPassword } = request.body ?? {}

    const existing = await app.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    })
    if (!existing || existing.organizationId !== organizationId) {
      return reply.code(404).send({ error: 'User not found.' })
    }

    const data = {}

    if (name !== undefined) {
      if (!name?.trim()) return reply.code(400).send({ error: 'Display name is required.' })
      data.name = name.trim()
    }

    if (username !== undefined) {
      const check = await assertUsernameAvailableInOrg(
        app.prisma,
        organizationId,
        username,
        { excludeUserId: userId },
      )
      if (!check.ok) return reply.code(409).send({ error: check.error })
      data.username = check.username
    }

    if (avatarUrl !== undefined) {
      const check = validateAvatarUrl(avatarUrl)
      if (!check.ok) return reply.code(400).send({ error: check.error })
      data.avatarUrl = check.avatarUrl
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        return reply.code(400).send({ error: 'Password must be at least 8 characters.' })
      }
      if (!currentPassword) {
        return reply.code(400).send({ error: 'Current password is required to set a new password.' })
      }
      if (!(await verifyPassword(currentPassword, existing.passwordHash))) {
        return reply.code(401).send({ error: 'Current password is incorrect.' })
      }
      data.passwordHash = await hashPassword(newPassword)
      data.tokenVersion = { increment: 1 }
    }

    if (!Object.keys(data).length) {
      return reply.code(400).send({ error: 'No changes to save.' })
    }

    const passwordChanged = Boolean(data.passwordHash)
    const row = passwordChanged
      ? await app.prisma.$transaction(async (tx) => {
          const updated = await tx.user.update({ where: { id: userId }, data })
          await revokeAllForUser(tx, userId)
          return updated
        })
      : await app.prisma.user.update({ where: { id: userId }, data })

    const session = passwordChanged
      ? await issueAuthSession(app, reply, row, existing.organization?.name)
      : buildSession(row, existing.organization?.name)

    return {
      user: {
        id:        row.id,
        username:  row.username || row.email,
        email:     row.email,
        name:      row.name || row.username || row.email,
        avatarUrl: row.avatarUrl || null,
        role:      row.role,
      },
      session,
    }
  })
}
