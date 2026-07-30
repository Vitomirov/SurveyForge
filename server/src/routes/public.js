import { upsertResponse } from './responses.js'

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

  app.post('/api/public/surveys/:id/responses', async (request, reply) => {
    const row = await app.prisma.survey.findUnique({
      where: { id: request.params.id },
    })
    if (!row || row.survey?.status !== 'live') {
      return reply.code(404).send({ error: 'Survey not found' })
    }

    const entry = request.body
    if (!entry?.id) {
      return reply.code(400).send({ error: 'Response entry must include id' })
    }

    await upsertResponse(app, {
      surveyId: row.id,
      organizationId: row.organizationId,
      entry,
    })

    return { ok: true, id: entry.id }
  })
}
