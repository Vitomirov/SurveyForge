import { hashPassword } from './password.js'

const DEFAULT_ORG_NAME = 'Default Organization'
const ADMIN_USERNAME   = 'admin'
const ADMIN_EMAIL      = 'admin@surveyforge.local'
const ADMIN_PASSWORD   = 'admin123'

const DEFAULT_CLIENTS = [
  { id: 'c_dmr', name: 'DMR' },
  { id: 'c_fsi', name: 'FSI' },
  { id: 'c_apg', name: 'APG' },
]

const DEFAULT_TOPICS = [
  { id: 't_beauty',     name: 'Beauty' },
  { id: 't_education',  name: 'Education' },
  { id: 't_healthcare', name: 'Healthcare' },
  { id: 't_gaming',     name: 'Gaming' },
  { id: 't_pets',       name: 'Pets' },
]

async function seedPlatformLists(prisma, organizationId) {
  const clientCount = await prisma.client.count({ where: { organizationId } })
  if (clientCount === 0) {
    await prisma.client.createMany({
      data: DEFAULT_CLIENTS.map(c => ({ ...c, organizationId })),
      skipDuplicates: true,
    })
  }

  const topicCount = await prisma.topic.count({ where: { organizationId } })
  if (topicCount === 0) {
    await prisma.topic.createMany({
      data: DEFAULT_TOPICS.map(t => ({ ...t, organizationId })),
      skipDuplicates: true,
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
