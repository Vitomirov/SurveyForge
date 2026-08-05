import { useApi } from '@/config/api'
import { getAuthToken, clearAuthToken } from '@/api/token'
import { notifyAuthInvalidated } from '@/api/authEvents'
import { AUTH_ERRORS } from '@/constants/authCopy'

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function apiFetch(path, options = {}) {
  const headers = { ...options.headers }
  if (options.body != null && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const token = useApi ? getAuthToken() : null
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(path, {
    ...options,
    headers,
  })

  let body = null
  const text = await res.text()
  if (text) {
    try { body = JSON.parse(text) } catch { body = text }
  }

  if (res.status === 401 && useApi) {
    clearAuthToken()
    try { sessionStorage.removeItem('sf_session') } catch { /* noop */ }
    notifyAuthInvalidated(body?.code || 'UNAUTHORIZED')
  }

  if (!res.ok) {
    const message = body?.error || res.statusText || 'Request failed'
    if (res.status === 403 && body?.code === 'FORBIDDEN') {
      throw new ApiError(message || AUTH_ERRORS.forbidden, { status: res.status, body })
    }
    throw new ApiError(message, {
      status: res.status,
      body,
    })
  }

  return body
}
