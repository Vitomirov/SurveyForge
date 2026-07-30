import { PrismaClient } from '@prisma/client'

export async function registerPrisma(fastify) {
  const prisma = new PrismaClient()

  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}
