const DEFAULT_PORT = 3003
const DEFAULT_ACCESS_TOKEN_EXPIRES_IN = '15m'
const DEFAULT_REFRESH_TOKEN_EXPIRES_IN = '30d'
const DEFAULT_DEV_CORS_ORIGIN = 'http://localhost:5173'
const MIN_JWT_SECRET_LENGTH = 32

const UNIT_MS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }

const WEAK_JWT_SECRETS = new Set([
  'dev-secret-change-me',
  'change-me-in-production',
])

function parseBool(value, defaultValue) {
  if (value === undefined || value === '') return defaultValue
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') return true
  if (normalized === 'false' || normalized === '0') return false
  return defaultValue
}

export function durationToMs(value, fallbackMs) {
  const match = String(value ?? '').trim().match(/^(\d+)\s*(ms|s|m|h|d)$/i)
  if (!match) return fallbackMs
  return Number(match[1]) * UNIT_MS[match[2].toLowerCase()]
}

export function validateJwtSecret(secret, { minLength = MIN_JWT_SECRET_LENGTH } = {}) {
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    throw new Error(
      'JWT_SECRET is required. Set a strong random value (32+ characters).',
    )
  }
  if (WEAK_JWT_SECRETS.has(secret)) {
    throw new Error(
      'JWT_SECRET must not use a default or placeholder value.',
    )
  }
  if (secret.length < minLength) {
    throw new Error(
      `JWT_SECRET must be at least ${minLength} characters.`,
    )
  }
}

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development'
  const isDev = nodeEnv !== 'production'

  const seedDefaultAccounts = parseBool(env.SEED_DEFAULT_ACCOUNTS, isDev)
  const runPlatformListMigration = parseBool(env.RUN_PLATFORM_LIST_MIGRATION, isDev)
  const requireStrongJwt = parseBool(env.REQUIRE_STRONG_JWT, !isDev)
  const rateLimitRelaxed = parseBool(env.RATE_LIMIT_RELAXED, isDev)
  const cookieSecure = parseBool(env.COOKIE_SECURE, !isDev)
  const authAllowBearer = parseBool(env.AUTH_ALLOW_BEARER, isDev)

  let jwtSecret = env.JWT_SECRET
  if (!jwtSecret) {
    jwtSecret = isDev ? 'dev-secret-change-me' : ''
  }

  if (requireStrongJwt) {
    validateJwtSecret(jwtSecret)
  }

  const port = Number(env.PORT) || DEFAULT_PORT
  const accessTokenExpiresIn = env.ACCESS_TOKEN_EXPIRES_IN || DEFAULT_ACCESS_TOKEN_EXPIRES_IN
  const refreshTokenExpiresIn = env.REFRESH_TOKEN_EXPIRES_IN || DEFAULT_REFRESH_TOKEN_EXPIRES_IN
  // Alias: access tokens used to be signed with jwtExpiresIn / JWT_EXPIRES_IN.
  const jwtExpiresIn = accessTokenExpiresIn
  const corsOrigin = env.CORS_ORIGIN || (isDev ? DEFAULT_DEV_CORS_ORIGIN : true)

  return {
    port,
    jwtSecret,
    jwtExpiresIn,
    accessTokenExpiresIn,
    refreshTokenExpiresIn,
    cookieSecure,
    corsOrigin,
    authAllowBearer,
    nodeEnv,
    isDev,
    seedDefaultAccounts,
    runPlatformListMigration,
    requireStrongJwt,
    rateLimitRelaxed,
  }
}
