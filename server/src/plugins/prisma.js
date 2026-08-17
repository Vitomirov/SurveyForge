/**
 * Prisma database plugin.
 * Attaches a shared PrismaClient to the Fastify instance as `app.prisma` and
 * disconnects cleanly when the server shuts down.
 */
import { PrismaClient } from '@prisma/client'

export async function registerPrisma(fastify) {
  const prisma = new PrismaClient()

  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}
