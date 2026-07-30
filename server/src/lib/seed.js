import { hashPassword } from './password.js'

const DEFAULT_ORG_NAME = 'Default Organization'
const ADMIN_USERNAME   = 'admin'
const ADMIN_EMAIL      = 'admin@surveyforge.local'
const ADMIN_PASSWORD   = 'admin123'

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
