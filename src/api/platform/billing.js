import { apiFetch } from '../client'

export async function fetchBillingOverview() {
  return apiFetch('/api/billing/overview')
}

export async function fetchBrandKit() {
  return apiFetch('/api/billing/brand')
}

export async function patchBrandKit(body) {
  return apiFetch('/api/billing/brand', {
    method: 'PATCH',
    body,
  })
}

export async function fetchDomainVerification() {
  return apiFetch('/api/billing/domain-verification')
}

export async function fetchBillingPlans() {
  return apiFetch('/api/billing/plans')
}

export async function changeSubscriptionPlan(planId) {
  return apiFetch('/api/billing/subscription', {
    method: 'PATCH',
    body: { planId },
  })
}

export async function initDomainVerification() {
  return apiFetch('/api/billing/domain-verification/init', { method: 'POST' })
}

export async function checkDomainVerification(body = {}) {
  return apiFetch('/api/billing/domain-verification/check', {
    method: 'POST',
    body,
  })
}
