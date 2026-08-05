import { apiFetch } from './client'

export async function fetchVendorOrganizations() {
  const data = await apiFetch('/api/vendor/organizations')
  return data.organizations
}

export async function fetchVendorNotifications() {
  return apiFetch('/api/vendor/notifications')
}

export async function markVendorThreadSeen(orgId) {
  return apiFetch(`/api/vendor/notifications/seen/${encodeURIComponent(orgId)}`, {
    method: 'POST',
  })
}

export async function fetchVendorOrganization(orgId) {
  return apiFetch(`/api/vendor/organizations/${encodeURIComponent(orgId)}`)
}

export async function updateVendorSubscription(orgId, patch) {
  return apiFetch(`/api/vendor/organizations/${encodeURIComponent(orgId)}/subscription`, {
    method: 'PATCH',
    body: patch,
  })
}

export async function createVendorInvoice(orgId, body) {
  return apiFetch(`/api/vendor/organizations/${encodeURIComponent(orgId)}/invoices`, {
    method: 'POST',
    body,
  })
}

export async function updateVendorInvoice(invoiceId, patch) {
  return apiFetch(`/api/vendor/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'PATCH',
    body: patch,
  })
}

export async function fetchVendorSupportThreads() {
  const data = await apiFetch('/api/vendor/support/threads')
  return data.threads
}

export async function fetchVendorSupportThread(orgId) {
  return apiFetch(`/api/vendor/support/threads/${encodeURIComponent(orgId)}`)
}

export async function postVendorSupportMessage(orgId, body) {
  return apiFetch(`/api/vendor/support/threads/${encodeURIComponent(orgId)}/messages`, {
    method: 'POST',
    body: { body },
  })
}
