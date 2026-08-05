/** Canonical role strings stored in `users.user_role`. */
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
