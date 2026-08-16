import { verifyPassword, hashPassword } from '../lib/auth/password.js'
import { provisionOrgBilling } from '../lib/billing/billingDefaults.js'
import { createRouteLimiters, sendIfRateLimited } from '../lib/survey/rateLimit.js'
import { loadConfig } from '../config.js'

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

function signToken(app, session) {
  // Keep JWT lean — never embed avatarUrl (base64 images blow up Authorization headers).
  return app.jwt.sign({
    userId:           session.userId,
    organizationId:   session.organizationId,
    organizationName: session.organizationName,
    username:         session.username,
    name:             session.name,
    role:             session.role,
  })
}

const MAX_AVATAR_BYTES = 512 * 1024

function normalizeUsername(raw) {
  return raw?.trim() || ''
}

function emailForUsername(username) {
  const uname = normalizeUsername(username)
  return uname.includes('@') ? uname.toLowerCase() : `${uname.toLowerCase()}@rescopesurveys.local`
}

async function assertUsernameAvailable(prisma, username, excludeUserId = null) {
  const uname = normalizeUsername(username)
  if (!uname) return { ok: false, error: 'Username is required.' }

  const email = emailForUsername(uname)
  const clash = await prisma.user.findFirst({
    where: {
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      OR: [
        { username: { equals: uname, mode: 'insensitive' } },
        { email: { equals: email, mode: 'insensitive' } },
      ],
    },
  })
  if (clash) return { ok: false, error: 'That username is already taken.' }
  return { ok: true, username: uname, email }
}

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
    const { organizationName, name, username, password } = request.body ?? {}

    if (!organizationName?.trim()) {
      return reply.code(400).send({ error: 'Organization name is required.' })
    }
    if (!name?.trim() || !username?.trim() || !password) {
      return reply.code(400).send({ error: 'Name, username, and password are required.' })
    }
    if (password.length < 8) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters.' })
    }

    const uname = username.trim()
    const email = uname.includes('@')
      ? uname.toLowerCase()
      : `${uname.toLowerCase()}@rescopesurveys.local`

    // Login resolves users by username/email across all orgs, so both must be
    // globally unique for authentication to stay unambiguous.
    const clash = await app.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: uname, mode: 'insensitive' } },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
    })
    if (clash) {
      return reply.code(409).send({ error: 'That username or email is already taken.' })
    }

    const passwordHash = await hashPassword(password)

    // Create org and admin atomically so a failure never leaves an orphan org behind.
    const { org, user } = await app.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: organizationName.trim(), settings: {} },
      })
      await provisionOrgBilling(tx, org.id)
      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          username:       uname,
          email,
          passwordHash,
          name:           name.trim(),
          role:           'admin',
        },
      })
      return { org, user }
    })

    const session = buildSession(user, org.name)
    return reply.code(201).send({ token: signToken(app, session), session })
  })

  app.post('/api/auth/login', async (request, reply) => {
    const limited = sendIfRateLimited(limits.login, request, reply, 'login')
    if (limited) return limited

    const { username, password } = request.body ?? {}
    if (!username?.trim() || !password) {
      return reply.code(400).send({ error: 'Username and password are required.' })
    }

    const normalized = username.trim().toLowerCase()
    const user = await app.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: normalized, mode: 'insensitive' } },
          { email: { equals: normalized, mode: 'insensitive' } },
        ],
      },
      include: { organization: true },
    })

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid username or password.' })
    }

    const session = buildSession(user, user.organization?.name)
    return { token: signToken(app, session), session }
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
    return { session, token: signToken(app, session) }
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
      const check = await assertUsernameAvailable(app.prisma, username, userId)
      if (!check.ok) return reply.code(409).send({ error: check.error })
      data.username = check.username
      data.email = check.email
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
    }

    if (!Object.keys(data).length) {
      return reply.code(400).send({ error: 'No changes to save.' })
    }

    const row = await app.prisma.user.update({ where: { id: userId }, data })
    const session = buildSession(row, existing.organization?.name)
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
      token: signToken(app, session),
    }
  })
}
