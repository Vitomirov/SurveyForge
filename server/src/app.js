import Fastify from 'fastify'
import cors from '@fastify/cors'
import { registerPrisma } from './plugins/prisma.js'
import { registerOrgScope } from './plugins/orgScope.js'
import { registerSurveyRoutes } from './routes/surveys.js'
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
  await registerOrgScope(app)

  app.get('/health', async () => ({
    ok: true,
    service: 'surveyforge-api',
    timestamp: new Date().toISOString(),
  }))

  await registerSurveyRoutes(app)
  await registerMigrateRoutes(app, { isDev: config.isDev })

  return app
}
