import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'
import { migratePlatformLists } from '../src/lib/platform/migratePlatformLists.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()

try {
  await migratePlatformLists(prisma)
  console.log('Platform list migration complete.')
} finally {
  await prisma.$disconnect()
}
