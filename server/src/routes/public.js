export async function registerPublicRoutes(app) {
  app.get('/api/public/surveys/:id', async (request, reply) => {
    const row = await app.prisma.survey.findUnique({
      where: { id: request.params.id },
    })
    if (!row) return reply.code(404).send({ error: 'Survey not found' })

    const status = row.survey?.status
    if (status !== 'live') {
      return reply.code(404).send({ error: 'Survey not found' })
    }

    return {
      survey: row.survey,
      items:  row.items,
    }
  })
}
