/**
 * Development database seeding.
 * Idempotently creates default admin and platform-owner organizations with
 * billing rows and credentials for local development (controlled by config).
 */
import { hashPassword } from '../auth/password.js'
import { provisionOrgBilling } from '../billing/billingDefaults.js'
import { ROLES } from '../auth/roles.js'

// Dev-only legacy accounts — .local emails are not used for new signups.
const DEFAULT_ORG_NAME = 'Default Organization'
const PLATFORM_ORG_NAME = 'Rescope Surveys Platform'
const ADMIN_USERNAME   = 'admin'
const ADMIN_EMAIL      = 'admin@rescopesurveys.local'
const ADMIN_PASSWORD   = 'admin123'

const VENDOR_USERNAME = process.env.PLATFORM_OWNER_USERNAME || 'vendor'
const VENDOR_EMAIL    = process.env.PLATFORM_OWNER_EMAIL || 'vendor@rescopesurveys.local'
const VENDOR_PASSWORD = process.env.PLATFORM_OWNER_PASSWORD || 'vendor123'

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

  await provisionOrgBilling(prisma, org.id)

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

/** Ensure vendor org + platform owner account exist (idempotent). */
export async function seedPlatformOwner(prisma) {
  let org = await prisma.organization.findFirst({
    where: { name: PLATFORM_ORG_NAME },
    orderBy: { createdAt: 'asc' },
  })
  if (!org) {
    org = await prisma.organization.create({
      data: { name: PLATFORM_ORG_NAME, settings: {} },
    })
  }

  await provisionOrgBilling(prisma, org.id)

  const existing = await prisma.user.findFirst({
    where: {
      organizationId: org.id,
      OR: [
        { username: VENDOR_USERNAME },
        { email: VENDOR_EMAIL },
      ],
    },
  })
  if (existing) return { org, user: existing }

  const passwordHash = await hashPassword(VENDOR_PASSWORD)
  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      username:       VENDOR_USERNAME,
      email:          VENDOR_EMAIL,
      passwordHash,
      name:           'Platform Owner',
      role:           ROLES.PLATFORM_OWNER,
    },
  })

  return { org, user }
}
