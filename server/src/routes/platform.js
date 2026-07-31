import { hashPassword } from '../lib/password.js'

const newId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

function userResponse(user) {
  return {
    id:       user.id,
    username: user.username || user.email,
    email:    user.email,
    name:     user.name || user.username || user.email,
    role:     user.role,
  }
}

export async function registerPlatformRoutes(app) {
  // ─── Clients ───────────────────────────────────────────────────────────
  app.get('/api/platform/clients', async (request) => {
    const rows = await app.prisma.client.findMany({
      where: { organizationId: request.organizationId },
      orderBy: { name: 'asc' },
    })
    return { clients: rows.map(r => ({ id: r.id, name: r.name })) }
  })

  app.post('/api/platform/clients', async (request, reply) => {
    const { name } = request.body ?? {}
    if (!name?.trim()) return reply.code(400).send({ error: 'Name is required' })

    const row = await app.prisma.client.create({
      data: {
        id: newId('c'),
        organizationId: request.organizationId,
        name: name.trim(),
      },
    })
    return { client: { id: row.id, name: row.name } }
  })

  app.patch('/api/platform/clients/:id', async (request, reply) => {
    const { name } = request.body ?? {}
    if (!name?.trim()) return reply.code(400).send({ error: 'Name is required' })

    const existing = await app.prisma.client.findFirst({
      where: { id: request.params.id, organizationId: request.organizationId },
    })
    if (!existing) return reply.code(404).send({ error: 'Client not found' })

    const row = await app.prisma.client.update({
      where: { id: existing.id },
      data: { name: name.trim() },
    })
    return { client: { id: row.id, name: row.name } }
  })

  app.delete('/api/platform/clients/:id', async (request, reply) => {
    const existing = await app.prisma.client.findFirst({
      where: { id: request.params.id, organizationId: request.organizationId },
    })
    if (!existing) return reply.code(404).send({ error: 'Client not found' })

    await app.prisma.client.delete({ where: { id: existing.id } })
    return { ok: true }
  })

  // ─── Topics ────────────────────────────────────────────────────────────
  app.get('/api/platform/topics', async (request) => {
    const rows = await app.prisma.topic.findMany({
      where: { organizationId: request.organizationId },
      orderBy: { name: 'asc' },
    })
    return { topics: rows.map(r => ({ id: r.id, name: r.name })) }
  })

  app.post('/api/platform/topics', async (request, reply) => {
    const { name } = request.body ?? {}
    if (!name?.trim()) return reply.code(400).send({ error: 'Name is required' })

    const row = await app.prisma.topic.create({
      data: {
        id: newId('t'),
        organizationId: request.organizationId,
        name: name.trim(),
      },
    })
    return { topic: { id: row.id, name: row.name } }
  })

  app.patch('/api/platform/topics/:id', async (request, reply) => {
    const { name } = request.body ?? {}
    if (!name?.trim()) return reply.code(400).send({ error: 'Name is required' })

    const existing = await app.prisma.topic.findFirst({
      where: { id: request.params.id, organizationId: request.organizationId },
    })
    if (!existing) return reply.code(404).send({ error: 'Topic not found' })

    const row = await app.prisma.topic.update({
      where: { id: existing.id },
      data: { name: name.trim() },
    })
    return { topic: { id: row.id, name: row.name } }
  })

  app.delete('/api/platform/topics/:id', async (request, reply) => {
    const existing = await app.prisma.topic.findFirst({
      where: { id: request.params.id, organizationId: request.organizationId },
    })
    if (!existing) return reply.code(404).send({ error: 'Topic not found' })

    await app.prisma.topic.delete({ where: { id: existing.id } })
    return { ok: true }
  })

  // ─── Users ─────────────────────────────────────────────────────────────
  app.get('/api/platform/users', async (request) => {
    const rows = await app.prisma.user.findMany({
      where: { organizationId: request.organizationId },
      orderBy: { name: 'asc' },
    })
    return { users: rows.map(userResponse) }
  })

  app.post('/api/platform/users', async (request, reply) => {
    const { username, password, name, role = 'editor' } = request.body ?? {}
    if (!username?.trim() || !name?.trim() || !password) {
      return reply.code(400).send({ error: 'Username, name, and password are required.' })
    }

    const uname = username.trim()
    const email = uname.includes('@') ? uname.toLowerCase() : `${uname.toLowerCase()}@surveyforge.local`

    const dup = await app.prisma.user.findFirst({
      where: { organizationId: request.organizationId, email },
    })
    if (dup) return reply.code(409).send({ error: 'Username already exists.' })

    const row = await app.prisma.user.create({
      data: {
        organizationId: request.organizationId,
        username:       uname,
        email,
        passwordHash:   await hashPassword(password),
        name:           name.trim(),
        role,
      },
    })
    return { user: userResponse(row) }
  })

  app.patch('/api/platform/users/:id', async (request, reply) => {
    const { name, password, role } = request.body ?? {}
    const existing = await app.prisma.user.findFirst({
      where: { id: request.params.id, organizationId: request.organizationId },
    })
    if (!existing) return reply.code(404).send({ error: 'User not found' })

    const data = {}
    if (name?.trim()) data.name = name.trim()
    if (role) data.role = role
    if (password) {
      data.passwordHash = await hashPassword(password)
    }

    const row = await app.prisma.user.update({ where: { id: existing.id }, data })
    return { user: userResponse(row) }
  })

  app.delete('/api/platform/users/:id', async (request, reply) => {
    const count = await app.prisma.user.count({
      where: { organizationId: request.organizationId },
    })
    if (count <= 1) {
      return reply.code(400).send({ error: 'Cannot delete the last user.' })
    }

    const existing = await app.prisma.user.findFirst({
      where: { id: request.params.id, organizationId: request.organizationId },
    })
    if (!existing) return reply.code(404).send({ error: 'User not found' })

    await app.prisma.user.delete({ where: { id: existing.id } })
    return { ok: true }
  })
}
