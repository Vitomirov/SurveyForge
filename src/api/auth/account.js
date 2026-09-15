import { apiFetch } from '../client'

/** One-time-link flows: the emailed token is the credential, so no session refresh/invalidation. */
const publicOpts = { skipAuthInvalidate: true, skipRefresh: true }

export function previewInvite(token) {
  return apiFetch('/api/auth/invites/preview', { ...publicOpts, method: 'POST', body: { token } })
}

export function acceptInvite({ token, name, password }) {
  return apiFetch('/api/auth/invites/accept', { ...publicOpts, method: 'POST', body: { token, name, password } })
}

export function forgotPassword(email) {
  return apiFetch('/api/auth/password/forgot', { ...publicOpts, method: 'POST', body: { email } })
}

export function resetPassword({ token, password }) {
  return apiFetch('/api/auth/password/reset', { ...publicOpts, method: 'POST', body: { token, password } })
}

export function verifyEmail(token) {
  return apiFetch('/api/auth/email/verify', { ...publicOpts, method: 'POST', body: { token } })
}

export function resendVerificationEmail() {
  return apiFetch('/api/auth/email/resend', { method: 'POST' })
}
