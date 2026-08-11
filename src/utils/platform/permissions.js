/** Client-side role checks — mirror server rules for UI gating. */

export const ROLES = {
  ADMIN:          'admin',
  EDITOR:         'editor',
  PLATFORM_OWNER: 'platform_owner',
}

export function isAdmin(session) {
  return session?.role === ROLES.ADMIN
}

export function isEditor(session) {
  return session?.role === ROLES.EDITOR
}

export function isPlatformOwner(session) {
  return session?.role === ROLES.PLATFORM_OWNER
}

/** Org admin (CEO) — full survey visibility and platform management. */
export function canSeeAllSurveys(session) {
  return isAdmin(session)
}

/** Settings modal, user CRUD, client/topic writes. */
export function canManagePlatform(session) {
  return isAdmin(session)
}

export function canManageUsers(session) {
  return isAdmin(session)
}

/** Org admin read-only billing + support for their organization. */
export function canViewBilling(session) {
  return isAdmin(session)
}

/** Vendor console — manage subscriptions/invoices across all orgs. */
export function canManageBilling(session) {
  return isPlatformOwner(session)
}

/** Human label for a stored role value (editor → "User"). */
export function roleLabel(role) {
  if (role === ROLES.ADMIN) return 'Admin'
  if (role === ROLES.EDITOR) return 'User'
  if (role === ROLES.PLATFORM_OWNER) return 'Platform owner'
  return role || ''
}

/**
 * Local-mode survey list filter (API mode is filtered server-side).
 * Surveys without an ownerId are treated as admin-only legacy data.
 */
export function filterSurveysForSession(entries, session) {
  if (!session || canSeeAllSurveys(session)) return entries
  return entries.filter(e => e.ownerId === session.userId)
}
