import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../../.env') })

import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { seedDefaultAdmin } from './lib/seed.js'
import { migratePlatformLists } from './lib/migratePlatformLists.js'

const config = loadConfig()

const app = await buildApp()
await seedDefaultAdmin(app.prisma)
await migratePlatformLists(app.prisma)

try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
  app.log.info(`SurveyForge API listening on http://127.0.0.1:${config.port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
