function surveyMeta(row) {
  const survey = row.survey
  const items = Array.isArray(row.items) ? row.items : []
  return {
    id:           row.id,
    title:        survey?.title ?? 'Untitled Survey',
    status:       survey?.status ?? 'draft',
    updatedAt:    row.updatedAt.toISOString(),
    internalName: survey?.internalName ?? '',
    surveyCode:   survey?.surveyCode ?? '',
    clientId:     survey?.clientId ?? '',
    topicId:      survey?.topicId ?? '',
    surveyType:   survey?.surveyType ?? '',
    questionCount: items.filter(i => i?.itemType === 'question').length,
  }
}

export async function registerSurveyRoutes(app) {
  app.get('/api/surveys', async (request) => {
    const rows = await app.prisma.survey.findMany({
      where: { organizationId: request.organizationId },
      orderBy: { updatedAt: 'desc' },
    })
    return { surveys: rows.map(surveyMeta) }
  })

  app.get('/api/surveys/:id', async (request, reply) => {
    const row = await app.prisma.survey.findFirst({
      where: { id: request.params.id, organizationId: request.organizationId },
    })
    if (!row) return reply.code(404).send({ error: 'Survey not found' })

    return {
      survey:   row.survey,
      items:    row.items,
      revision: row.revision,
    }
  })

  app.patch('/api/surveys/:id', async (request, reply) => {
    const { id } = request.params
    const { survey, items, revision } = request.body ?? {}

    if (!survey || !Array.isArray(items)) {
      return reply.code(400).send({ error: 'Body must include survey object and items array' })
    }
    if (survey.id && survey.id !== id) {
      return reply.code(400).send({ error: 'Survey id in body must match URL' })
    }

    const surveyData = { ...survey, id, updatedAt: new Date().toISOString() }
    const existing = await app.prisma.survey.findFirst({
      where: { id, organizationId: request.organizationId },
    })

    if (existing) {
      if (revision != null && revision !== existing.revision) {
        return reply.code(409).send({
          error: 'Revision conflict',
          revision: existing.revision,
          updatedAt: existing.updatedAt.toISOString(),
        })
      }

      const updated = await app.prisma.survey.update({
        where: { id },
        data: {
          survey: surveyData,
          items,
          revision: existing.revision + 1,
        },
      })

      return {
        id:        updated.id,
        revision:  updated.revision,
        updatedAt: updated.updatedAt.toISOString(),
      }
    }

    const created = await app.prisma.survey.create({
      data: {
        id,
        organizationId: request.organizationId,
        survey: surveyData,
        items,
        revision: 1,
      },
    })

    return reply.code(201).send({
      id:        created.id,
      revision:  created.revision,
      updatedAt: created.updatedAt.toISOString(),
    })
  })

  app.delete('/api/surveys/:id', async (request, reply) => {
    const existing = await app.prisma.survey.findFirst({
      where: { id: request.params.id, organizationId: request.organizationId },
    })
    if (!existing) return reply.code(404).send({ error: 'Survey not found' })

    await app.prisma.survey.delete({ where: { id: request.params.id } })
    return { ok: true }
  })
}
