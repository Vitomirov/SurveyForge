import { durationToMs, loadConfig } from '../../config.js'

export const ACCESS_COOKIE = 'rs_access'
export const REFRESH_COOKIE = 'rs_refresh'

function cookieBase() {
  const { cookieSecure } = loadConfig()
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: cookieSecure,
  }
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
    maxAge: Math.floor(durationToMs(refreshTokenExpiresIn, 30 * 24 * 60 * 60 * 1000) / 1000),
  })
}

export function clearAuthCookies(reply) {
  const base = cookieBase()
  reply.clearCookie(ACCESS_COOKIE, base)
  reply.clearCookie(REFRESH_COOKIE, base)
}

export function readRefreshToken(request) {
  return request.cookies?.[REFRESH_COOKIE]
    || request.body?.refreshToken
    || null
}
