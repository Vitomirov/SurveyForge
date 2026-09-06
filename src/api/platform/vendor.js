import { apiFetch } from '../client'

export async function fetchVendorOrganizations() {
  const data = await apiFetch('/api/vendor/organizations')
  return data.organizations
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

export async function deleteVendorOrganization(orgId, { confirmName }) {
  return apiFetch(`/api/vendor/organizations/${encodeURIComponent(orgId)}`, {
    method: 'DELETE',
    body: { confirmName },
  })
}
