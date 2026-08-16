const DEFAULT_PORT = 3003
const DEFAULT_JWT_EXPIRES_IN = '7d'
const MIN_JWT_SECRET_LENGTH = 32

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

  let jwtSecret = env.JWT_SECRET
  if (!jwtSecret) {
    jwtSecret = isDev ? 'dev-secret-change-me' : ''
  }

  if (requireStrongJwt) {
    validateJwtSecret(jwtSecret)
  }

  const port = Number(env.PORT) || DEFAULT_PORT
  const jwtExpiresIn = env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN

  return {
    port,
    jwtSecret,
    jwtExpiresIn,
    nodeEnv,
    isDev,
    seedDefaultAccounts,
    runPlatformListMigration,
    requireStrongJwt,
    rateLimitRelaxed,
  }
}
