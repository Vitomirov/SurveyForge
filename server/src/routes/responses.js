const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function rowToEntry(row) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {}
  return {
    id:           row.id,
    surveyId:     row.surveyId,
    timestamp:    row.timestamp.toISOString(),
    status:       row.status,
    pageReached:  payload.pageReached ?? 0,
    responses:    payload.responses ?? {},
    companions:   payload.companions ?? {},
    terminatedBy: payload.terminatedBy ?? null,
    fingerprint:  payload.fingerprint ?? null,
  }
}

function entryToDbFields(entry, surveyId, organizationId) {
  const { id, status, timestamp, pageReached, responses, companions, terminatedBy, fingerprint } = entry
  if (!id || !status) return null

  return {
    id,
    surveyId,
    organizationId,
    status,
    timestamp: new Date(timestamp || Date.now()),
    payload: {
      pageReached:  pageReached ?? 0,
      responses:    responses ?? {},
      companions:   companions ?? {},
      terminatedBy: terminatedBy ?? null,
      fingerprint:  fingerprint ?? null,
    },
  }
}

async function assertSurveyInOrg(prisma, surveyId, organizationId, reply) {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, organizationId },
  })
  if (!survey) {
    reply.code(404).send({ error: 'Survey not found' })
    return null
  }
  return survey
}

export async function upsertResponse(app, { surveyId, organizationId, entry }) {
  const data = entryToDbFields(entry, surveyId, organizationId)
  if (!data) return null

  return app.prisma.response.upsert({
    where: { id: data.id },
    create: data,
    update: {
      status:    data.status,
      timestamp: data.timestamp,
      payload:   data.payload,
    },
  })
}

export async function registerResponseRoutes(app) {
  app.get('/api/surveys/:id/responses/stats', async (request, reply) => {
    const survey = await assertSurveyInOrg(
      app.prisma, request.params.id, request.organizationId, reply
    )
    if (!survey) return

    const groups = await app.prisma.response.groupBy({
      by: ['status'],
      where: { surveyId: survey.id, organizationId: request.organizationId },
      _count: { _all: true },
    })

    const stats = { total: 0, complete: 0, terminated: 0, partial: 0, dnc: 0 }
    for (const row of groups) {
      const count = row._count._all
      if (stats[row.status] !== undefined) stats[row.status] = count
      stats.total += count
    }

    return stats
  })

  app.get('/api/surveys/:id/responses', async (request, reply) => {
    const survey = await assertSurveyInOrg(
      app.prisma, request.params.id, request.organizationId, reply
    )
    if (!survey) return

    const page  = Math.max(1, Number(request.query.page) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(request.query.limit) || DEFAULT_LIMIT))
    const skip  = (page - 1) * limit

    const where = { surveyId: survey.id, organizationId: request.organizationId }

    const [total, rows] = await Promise.all([
      app.prisma.response.count({ where }),
      app.prisma.response.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
    ])

    return {
      responses: rows.map(rowToEntry),
      total,
      page,
      limit,
    }
  })

  app.post('/api/surveys/:id/responses', async (request, reply) => {
    const survey = await assertSurveyInOrg(
      app.prisma, request.params.id, request.organizationId, reply
    )
    if (!survey) return

    const entry = request.body
    if (!entry?.id) {
      return reply.code(400).send({ error: 'Response entry must include id' })
    }

    const row = await upsertResponse(app, {
      surveyId: survey.id,
      organizationId: request.organizationId,
      entry,
    })

    return { ok: true, id: row.id }
  })

  app.delete('/api/surveys/:id/responses/:responseId', async (request, reply) => {
    const survey = await assertSurveyInOrg(
      app.prisma, request.params.id, request.organizationId, reply
    )
    if (!survey) return

    const existing = await app.prisma.response.findFirst({
      where: {
        id: request.params.responseId,
        surveyId: survey.id,
        organizationId: request.organizationId,
      },
    })
    if (!existing) return reply.code(404).send({ error: 'Response not found' })

    await app.prisma.response.delete({ where: { id: existing.id } })
    return { ok: true }
  })

  app.delete('/api/surveys/:id/responses', async (request, reply) => {
    const survey = await assertSurveyInOrg(
      app.prisma, request.params.id, request.organizationId, reply
    )
    if (!survey) return

    await app.prisma.response.deleteMany({
      where: { surveyId: survey.id, organizationId: request.organizationId },
    })
    return { ok: true }
  })
}
