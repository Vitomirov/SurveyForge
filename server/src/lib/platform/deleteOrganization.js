/**
 * Hard-delete a customer organization and all tenant data.
 * Prisma cascades remove users, surveys, responses, billing rows, and lists.
 * The platform owner's own organization cannot be deleted.
 */

export async function deleteOrganization(prisma, orgId, { confirmName, actorOrganizationId }) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      surveys: { select: { id: true } },
      users: { select: { id: true } },
      _count: {
        select: {
          users: true,
          surveys: true,
          responses: true,
          invoices: true,
          clients: true,
          topics: true,
          surveyTypes: true,
          surveyExports: true,
        },
      },
    },
  })

  if (!org) {
    return { ok: false, status: 404, error: 'Organization not found', code: 'ORG_NOT_FOUND' }
  }

  if (orgId === actorOrganizationId) {
    return {
      ok: false,
      status: 403,
      error: 'The platform owner organization cannot be deleted.',
      code: 'ORG_DELETE_FORBIDDEN',
    }
  }

  const trimmedConfirm = typeof confirmName === 'string' ? confirmName.trim() : ''
  if (!trimmedConfirm || trimmedConfirm !== org.name) {
    return {
      ok: false,
      status: 400,
      error: 'Organization name confirmation does not match.',
      code: 'CONFIRM_NAME_MISMATCH',
    }
  }

  const surveyIds = org.surveys.map(s => s.id)
  const userIds = org.users.map(u => u.id)
  const deleted = {
    organizationId: org.id,
    name: org.name,
    ...org._count,
  }

  await prisma.organization.delete({ where: { id: orgId } })

  return { ok: true, deleted, surveyIds, userIds }
}
