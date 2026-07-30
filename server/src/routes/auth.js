import { verifyPassword } from '../lib/password.js'

export async function registerAuthRoutes(app) {
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
    })

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid username or password.' })
    }

    const session = {
      userId:         user.id,
      organizationId: user.organizationId,
      username:       user.username || user.email,
      name:           user.name || user.username || user.email,
      role:           user.role,
      loginAt:        new Date().toISOString(),
    }

    const token = app.jwt.sign({
      userId:         session.userId,
      organizationId: session.organizationId,
      username:       session.username,
      name:           session.name,
      role:           session.role,
    })

    return { token, session }
  })
}
