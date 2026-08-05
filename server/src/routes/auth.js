import { verifyPassword, hashPassword } from '../lib/password.js'
import { seedPlatformLists } from '../lib/seed.js'
import { provisionOrgBilling } from '../lib/billingDefaults.js'

function buildSession(user, organizationName = null) {
  return {
    userId:           user.id,
    organizationId:   user.organizationId,
    organizationName: organizationName,
    username:         user.username || user.email,
    name:             user.name || user.username || user.email,
    role:             user.role,
    loginAt:          new Date().toISOString(),
  }
}

function signToken(app, session) {
  return app.jwt.sign({
    userId:           session.userId,
    organizationId:   session.organizationId,
    organizationName: session.organizationName,
    username:         session.username,
    name:             session.name,
    role:             session.role,
  })
}

export async function registerAuthRoutes(app) {
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
      : `${uname.toLowerCase()}@surveyforge.local`

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

    // Create org, seed its lists, and create the admin atomically so a failure
    // never leaves an orphan organization behind.
    const { org, user } = await app.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: organizationName.trim(), settings: {} },
      })
      await seedPlatformLists(tx, org.id)
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
    return {
      session: {
        userId,
        organizationId,
        organizationName: org?.name ?? null,
        username:         user.username || user.email,
        name:             user.name || user.username || user.email,
        role,
      },
    }
  })
}
