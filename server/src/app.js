import Fastify from 'fastify'
import cors from '@fastify/cors'
import { registerPrisma } from './plugins/prisma.js'
import { registerAuth } from './plugins/auth.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerPublicRoutes } from './routes/public.js'
import { registerSurveyRoutes } from './routes/surveys.js'
import { registerDashboardRoutes } from './routes/dashboard.js'
import { registerResponseRoutes } from './routes/responses.js'
import { registerMigrateRoutes } from './routes/migrate.js'
import { loadConfig } from './config.js'

export async function buildApp() {
  const config = loadConfig()

  const app = Fastify({
    logger: config.isDev,
  })

  await app.register(cors, {
    origin: config.isDev,
    credentials: true,
  })

  await registerPrisma(app)
  await registerAuth(app, { jwtSecret: config.jwtSecret })

  app.get('/health', async () => ({
    ok: true,
    service: 'surveyforge-api',
    timestamp: new Date().toISOString(),
  }))

  await registerAuthRoutes(app)
  await registerPublicRoutes(app)
  await registerDashboardRoutes(app)
  await registerSurveyRoutes(app)
  await registerResponseRoutes(app)
  await registerMigrateRoutes(app, { isDev: config.isDev })

  return app
}
