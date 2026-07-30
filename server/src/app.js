import Fastify from 'fastify'
import cors from '@fastify/cors'
import { registerPrisma } from './plugins/prisma.js'
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

  app.get('/health', async () => ({
    ok: true,
    service: 'surveyforge-api',
    timestamp: new Date().toISOString(),
  }))

  return app
}
