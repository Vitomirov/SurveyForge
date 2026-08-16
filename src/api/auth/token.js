import { useApi } from '@/config/api'

const TOKEN_KEY = 'sf_token'
/** JWTs with avatars embedded exceeded header limits (~431). Lean tokens are ~500 bytes. */
const MAX_TOKEN_LENGTH = 8192

export function getAuthToken() {
  if (useApi) return null
  try {
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (token && token.length > MAX_TOKEN_LENGTH) {
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem('sf_session')
      return null
    }
    return token
  } catch {
    return null
  }
}

export function setAuthToken(token) {
  if (useApi) return
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch { /* noop */ }
}

export function clearAuthToken() {
  if (useApi) return
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch { /* noop */ }
}
