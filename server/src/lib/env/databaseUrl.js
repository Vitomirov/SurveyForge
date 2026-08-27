/**
 * Resolve DATABASE_URL for local npm dev.
 * Builds from POSTGRES_* when unset, or when DATABASE_URL still uses the
 * default dev password but POSTGRES_PASSWORD was customized (common drift
 * between root .env and server/.env).
 */
const DEFAULT_DEV_PASSWORD = 'rescopesurveys'

function buildDatabaseUrl(env) {
  const user = env.POSTGRES_USER || 'rescopesurveys'
  const password = env.POSTGRES_PASSWORD ?? DEFAULT_DEV_PASSWORD
  const db = env.POSTGRES_DB || 'rescopesurveys'
  const host = env.POSTGRES_HOST || 'localhost'
  const port = env.POSTGRES_HOST_PORT || env.POSTGRES_PORT || '5433'
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${db}`
}

export function resolveDatabaseUrl(env = process.env) {
  const password = env.POSTGRES_PASSWORD ?? DEFAULT_DEV_PASSWORD
  const hasCustomPassword = password !== DEFAULT_DEV_PASSWORD
  const usesDefaultPasswordInUrl = env.DATABASE_URL
    && /:rescopesurveys@/.test(env.DATABASE_URL)

  if (env.DATABASE_URL && !(hasCustomPassword && usesDefaultPasswordInUrl)) {
    return env.DATABASE_URL
  }

  return buildDatabaseUrl(env)
}
