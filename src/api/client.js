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

  const rawBody = options.body
  const requestBody = rawBody != null
    && typeof rawBody === 'object'
    && !(rawBody instanceof FormData)
    && !(rawBody instanceof URLSearchParams)
    && !(rawBody instanceof Blob)
    ? JSON.stringify(rawBody)
    : rawBody

  const res = await fetch(path, {
    ...options,
    body: requestBody,
    headers,
  })

  let data = null
  const text = await res.text()
  if (text) {
    try { data = JSON.parse(text) } catch { data = text }
  }

  if (res.status === 401 && useApi) {
    clearAuthToken()
    try { sessionStorage.removeItem('sf_session') } catch { /* noop */ }
    notifyAuthInvalidated(data?.code || 'UNAUTHORIZED')
  }

  if (!res.ok) {
    const message = data?.error || res.statusText || 'Request failed'
    if (res.status === 403 && data?.code === 'FORBIDDEN') {
      throw new ApiError(message || AUTH_ERRORS.forbidden, { status: res.status, body: data })
    }
    throw new ApiError(message, {
      status: res.status,
      body: data,
    })
  }

  return data
}
