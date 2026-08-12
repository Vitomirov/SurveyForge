import { apiFetch } from '../client'

export async function fetchMe() {
  return apiFetch('/api/auth/me')
}

export async function updateProfile(body) {
  return apiFetch('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
