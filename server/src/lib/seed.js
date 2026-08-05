import { hashPassword } from './password.js'
import { CANONICAL_CLIENTS, CANONICAL_TOPICS } from './platformIds.js'

const DEFAULT_ORG_NAME = 'Default Organization'
const ADMIN_USERNAME   = 'admin'
const ADMIN_EMAIL      = 'admin@surveyforge.local'
const ADMIN_PASSWORD   = 'admin123'

export async function seedPlatformLists(prisma, organizationId) {
  const clientCount = await prisma.client.count({ where: { organizationId } })
  if (clientCount === 0) {
    await prisma.client.createMany({
      data: CANONICAL_CLIENTS.map(({ name }) => ({
        id: `c_${organizationId.slice(0, 8)}_${name.toLowerCase()}`,
        name,
        organizationId,
      })),
    })
  }

  const topicCount = await prisma.topic.count({ where: { organizationId } })
  if (topicCount === 0) {
    await prisma.topic.createMany({
      data: CANONICAL_TOPICS.map(({ name }) => ({
        id: `t_${organizationId.slice(0, 8)}_${name.toLowerCase().replace(/\s+/g, '')}`,
        name,
        organizationId,
      })),
    })
  }
}

/** Ensure default org + admin user exist (idempotent). */
export async function seedDefaultAdmin(prisma) {
  let org = await prisma.organization.findFirst({
    where: { name: DEFAULT_ORG_NAME },
    orderBy: { createdAt: 'asc' },
  })
  if (!org) {
    org = await prisma.organization.create({
      data: { name: DEFAULT_ORG_NAME, settings: {} },
    })
  }

  await seedPlatformLists(prisma, org.id)

  const existing = await prisma.user.findFirst({
    where: {
      organizationId: org.id,
      OR: [
        { username: ADMIN_USERNAME },
        { email: ADMIN_EMAIL },
      ],
    },
  })
  if (existing) return { org, user: existing }

  const passwordHash = await hashPassword(ADMIN_PASSWORD)
  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      username:       ADMIN_USERNAME,
      email:          ADMIN_EMAIL,
      passwordHash,
      name:           'Admin',
      role:           'admin',
    },
  })

  return { org, user }
}
