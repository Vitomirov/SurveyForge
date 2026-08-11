import { isAdminRole, isPlatformOwnerRole, ROLES } from './roles.js'

/** True when the authenticated caller is an org admin (CEO). */
export function isAdmin(request) {
  return isAdminRole(request.auth?.role)
}

/** True when the authenticated caller is the SaaS vendor (cross-org). */
export function isPlatformOwner(request) {
  return isPlatformOwnerRole(request.auth?.role)
}

/**
 * Fastify preHandler — allow only callers whose live DB role is in `roles`.
 * Use on individual routes; do not attach globally in onRequest.
 */
export function requireRole(...roles) {
  const allowed = new Set(roles)
  return async (request, reply) => {
    const role = request.auth?.role
    if (!role || !allowed.has(role)) {
      return reply.code(403).send({ error: 'Forbidden', code: 'FORBIDDEN' })
    }
  }
}

export const requirePlatformOwner = requireRole(ROLES.PLATFORM_OWNER)

/**
 * Prisma `where` fragment for survey queries.
 * Admins see the whole org; editors see only surveys they created.
 */
export function surveyScope(request) {
  const { organizationId, userId, role } = request.auth
  if (isAdminRole(role)) {
    return { organizationId }
  }
  return { organizationId, createdById: userId }
}
