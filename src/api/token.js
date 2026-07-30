const TOKEN_KEY = 'sf_token'

export function getAuthToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch { /* noop */ }
}

export function clearAuthToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch { /* noop */ }
}
