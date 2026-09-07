/**
 * HttpOnly authentication cookie helpers.
 * Sets, clears, and reads access/refresh token cookies with secure defaults
 * derived from server config (SameSite, Secure, TTL alignment with JWT expiry).
 */
import { durationToMs, loadConfig } from '../../config.js'
import { CSRF_COOKIE, generateCsrfToken } from '../security/csrf.js'

export const ACCESS_COOKIE = 'rs_access'
export const REFRESH_COOKIE = 'rs_refresh'
const REFRESH_COOKIE_PATH = '/api/auth'

function cookieBase() {
  const { cookieSecure } = loadConfig()
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: cookieSecure,
  }
}

function csrfCookieBase() {
  const { cookieSecure } = loadConfig()
  return {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    secure: cookieSecure,
  }
}

export function setCsrfCookie(reply, token = generateCsrfToken()) {
  reply.setCookie(CSRF_COOKIE, token, csrfCookieBase())
  return token
}

export function clearCsrfCookie(reply) {
  reply.clearCookie(CSRF_COOKIE, csrfCookieBase())
}

export function setAuthCookies(reply, { accessToken, refreshToken }) {
  const { accessTokenExpiresIn, refreshTokenExpiresIn } = loadConfig()
  const base = cookieBase()
  const accessTtlSec = Math.floor(durationToMs(accessTokenExpiresIn, 15 * 60 * 1000) / 1000)
  reply.setCookie(ACCESS_COOKIE, accessToken, {
    ...base,
    // Keep the cookie slightly longer than the JWT so an expired token is still
    // sent and can return TOKEN_EXPIRED (which triggers refresh) instead of vanishing.
    maxAge: accessTtlSec + 60,
  })
  reply.setCookie(REFRESH_COOKIE, refreshToken, {
    ...base,
    path: REFRESH_COOKIE_PATH,
    maxAge: Math.floor(durationToMs(refreshTokenExpiresIn, 30 * 24 * 60 * 60 * 1000) / 1000),
  })
  setCsrfCookie(reply)
}

export function clearAuthCookies(reply) {
  const base = cookieBase()
  reply.clearCookie(ACCESS_COOKIE, base)
  reply.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_COOKIE_PATH })
  clearCsrfCookie(reply)
}

export function readRefreshToken(request) {
  return request.cookies?.[REFRESH_COOKIE]
    || request.body?.refreshToken
    || null
}
