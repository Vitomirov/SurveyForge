const DEFAULT_PORT = 3001

export function loadConfig() {
  const port = Number(process.env.PORT) || DEFAULT_PORT
  const databaseUrl = process.env.DATABASE_URL
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me'
  const nodeEnv = process.env.NODE_ENV || 'development'

  return {
    port,
    databaseUrl,
    jwtSecret,
    nodeEnv,
    isDev: nodeEnv !== 'production',
  }
}
