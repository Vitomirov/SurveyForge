/** Ensure a default organization exists (dev / pre-auth B1). Replaced by JWT scope in B2. */
export async function getDefaultOrganization(prisma) {
  let org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Default Organization', settings: {} },
    })
  }
  return org
}
