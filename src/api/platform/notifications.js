import { apiFetch } from '../client'

export async function fetchResponseNotifications() {
  return apiFetch('/api/notifications/responses')
}
