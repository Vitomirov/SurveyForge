import { apiFetch } from './client'

export async function fetchBillingOverview() {
  return apiFetch('/api/billing/overview')
}

export async function fetchBillingNotifications() {
  return apiFetch('/api/billing/notifications')
}

export async function markBillingSeen() {
  return apiFetch('/api/billing/notifications/seen', { method: 'POST' })
}

export async function fetchBillingSupport() {
  return apiFetch('/api/billing/support')
}

export async function postBillingSupportMessage(body) {
  return apiFetch('/api/billing/support/messages', {
    method: 'POST',
    body: { body },
  })
}
