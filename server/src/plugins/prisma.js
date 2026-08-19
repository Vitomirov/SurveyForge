/**
 * Prisma database plugin.
 * Attaches a shared PrismaClient to the Fastify instance as `app.prisma` and
 * disconnects cleanly when the server shuts down.
 *
 * Caps the connection pool so a multi-core host does not open tens of
 * sessions against a small Postgres (and so a 2-CPU container does not
 * default to a 5-connection pool that queues under concurrent takers).
 */
import { PrismaClient } from '@prisma/client'

const DEFAULT_CONNECTION_LIMIT = 16
const DEFAULT_POOL_TIMEOUT = 10

export function withPrismaPoolParams(databaseUrl, env = process.env) {
  if (!databaseUrl || /[?&]connection_limit=/.test(databaseUrl)) return databaseUrl
  const limit = env.PRISMA_CONNECTION_LIMIT || String(DEFAULT_CONNECTION_LIMIT)
  const timeout = env.PRISMA_POOL_TIMEOUT || String(DEFAULT_POOL_TIMEOUT)
  const sep = databaseUrl.includes('?') ? '&' : '?'
  return `${databaseUrl}${sep}connection_limit=${limit}&pool_timeout=${timeout}`
}

export async function registerPrisma(fastify) {
  const prisma = new PrismaClient({
    datasourceUrl: withPrismaPoolParams(process.env.DATABASE_URL),
  })

  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}
