import { useApi } from '@/config/api'
import { notifyAuthInvalidated } from '@/api/auth/authEvents'
import { AUTH_ERRORS } from '@/constants/authCopy'

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

const AUTH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/refresh',
  '/api/auth/logout',
])

let refreshInFlight = null

function pathOnly(path) {
  return String(path || '').split('?')[0]
}

async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then(async (res) => {
      if (!res.ok) {
        const err = new Error('refresh failed')
        err.status = res.status
        throw err
      }
      return res.json().catch(() => ({}))
    }).finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

function invalidateSession(code) {
  try { sessionStorage.removeItem('sf_session') } catch { /* noop */ }
  notifyAuthInvalidated(code || 'UNAUTHORIZED')
}

export async function apiFetch(path, options = {}) {
  const { skipAuthInvalidate = false, skipRefresh = false, _retry = false, ...fetchOptions } = options
  const headers = { ...fetchOptions.headers }
  if (fetchOptions.body != null && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const rawBody = fetchOptions.body
  const requestBody = rawBody != null
    && typeof rawBody === 'object'
    && !(rawBody instanceof FormData)
    && !(rawBody instanceof URLSearchParams)
    && !(rawBody instanceof Blob)
    ? JSON.stringify(rawBody)
    : rawBody

  const res = await fetch(path, {
    ...fetchOptions,
    body: requestBody,
    headers,
    ...(useApi ? { credentials: 'include' } : {}),
  })

  let data = null
  const text = await res.text()
  if (text) {
    try { data = JSON.parse(text) } catch { data = text }
  }

  const isAuthPath = AUTH_PATHS.has(pathOnly(path))
  const canRefresh = useApi
    && res.status === 401
    && !_retry
    && !skipRefresh
    && !isAuthPath
    && data?.code === 'TOKEN_EXPIRED'

  if (canRefresh) {
    try {
      await refreshAccessToken()
      return apiFetch(path, { ...options, _retry: true })
    } catch {
      if (!skipAuthInvalidate) invalidateSession(data?.code || 'TOKEN_EXPIRED')
    }
  } else if (res.status === 401 && useApi && !skipAuthInvalidate && !isAuthPath) {
    invalidateSession(data?.code || 'UNAUTHORIZED')
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
