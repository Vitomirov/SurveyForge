import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../../.env') })

import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { seedDefaultAdmin, seedPlatformOwner } from './lib/platform/seed.js'
import { migratePlatformLists } from './lib/platform/migratePlatformLists.js'

let config
try {
  config = loadConfig()
} catch (err) {
  console.error(`[config] ${err.message}`)
  process.exit(1)
}

const app = await buildApp()

if (config.seedDefaultAccounts) {
  await seedDefaultAdmin(app.prisma)
  await seedPlatformOwner(app.prisma)
}

if (config.runPlatformListMigration) {
  await migratePlatformLists(app.prisma)
}

try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
  app.log.info(`Rescope Surveys API listening on http://127.0.0.1:${config.port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
