import { apiFetch } from '../client'

export async function fetchInvites() {
  const data = await apiFetch('/api/platform/invites')
  return data.invites
}

export async function createInvite({ email, role }) {
  const data = await apiFetch('/api/platform/invites', { method: 'POST', body: { email, role } })
  return data.invite
}

export async function resendInvite(id) {
  const data = await apiFetch(`/api/platform/invites/${encodeURIComponent(id)}/resend`, { method: 'POST' })
  return data.invite
}

export function revokeInvite(id) {
  return apiFetch(`/api/platform/invites/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
