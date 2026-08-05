const DEFAULT_PORT = 3003
const DEFAULT_JWT_EXPIRES_IN = '7d'

export function loadConfig() {
  const port = Number(process.env.PORT) || DEFAULT_PORT
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me'
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN
  const nodeEnv = process.env.NODE_ENV || 'development'

  return {
    port,
    jwtSecret,
    jwtExpiresIn,
    nodeEnv,
    isDev: nodeEnv !== 'production',
  }
}
