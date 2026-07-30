import { apiFetch } from './client'

export async function getDashboard() {
  return apiFetch('/api/dashboard')
}
