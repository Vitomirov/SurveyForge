/**
 * User role constants and predicates.
 * Defines canonical role strings (admin, editor, platform_owner) stored in
 * `users.role` and helper functions to test role membership.
 */
export const ROLES = {
  ADMIN:           'admin',
  EDITOR:          'editor', // UI label: "User"
  PLATFORM_OWNER:  'platform_owner',
}

export const ROLE_VALUES = new Set(Object.values(ROLES))

export function isAdminRole(role) {
  return role === ROLES.ADMIN
}

export function isEditorRole(role) {
  return role === ROLES.EDITOR
}

export function isPlatformOwnerRole(role) {
  return role === ROLES.PLATFORM_OWNER
}
