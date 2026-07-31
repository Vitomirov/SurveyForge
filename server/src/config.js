const DEFAULT_PORT = 3003

export function loadConfig() {
  const port = Number(process.env.PORT) || DEFAULT_PORT
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me'
  const nodeEnv = process.env.NODE_ENV || 'development'

  return {
    port,
    jwtSecret,
    nodeEnv,
    isDev: nodeEnv !== 'production',
  }
}
