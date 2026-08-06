import { upsertResponse } from './responses.js'
import { clientDomainFromRequest, findPublicSurvey } from '../lib/surveyPublicPath.js'

async function dncEmailsForSurvey(prisma, surveyRow) {
  const rows = await prisma.dncEntry.findMany({
    where: { surveyId: surveyRow.id },
    orderBy: { email: 'asc' },
  })
  return rows.map(r => r.email)
}

async function loadLivePublicSurvey(app, id, reply) {
  const row = await app.prisma.survey.findUnique({ where: { id } })
  if (!row || row.survey?.status !== 'live') {
    reply.code(404).send({ error: 'Survey not found' })
    return null
  }
  return row
}

export async function registerPublicRoutes(app) {
  app.get('/api/public/s/:publicPath', async (request, reply) => {
    const clientDomain = clientDomainFromRequest(request)
    const row = await findPublicSurvey(app.prisma, request.params.publicPath, clientDomain)
    if (!row) return reply.code(404).send({ error: 'Survey not found' })

    return {
      survey: row.survey,
      items:  row.items,
    }
  })

  app.get('/api/public/surveys/:id', async (request, reply) => {
    const row = await loadLivePublicSurvey(app, request.params.id, reply)
    if (!row) return

    return {
      survey: row.survey,
      items:  row.items,
    }
  })

  app.get('/api/public/surveys/:id/dnc', async (request, reply) => {
    const row = await loadLivePublicSurvey(app, request.params.id, reply)
    if (!row) return

    return { emails: await dncEmailsForSurvey(app.prisma, row) }
  })

  app.post('/api/public/surveys/:id/responses', async (request, reply) => {
    const row = await loadLivePublicSurvey(app, request.params.id, reply)
    if (!row) return

    const entry = request.body
    if (!entry?.id) {
      return reply.code(400).send({ error: 'Response entry must include id' })
    }

    await upsertResponse(app, {
      surveyId: row.id,
      organizationId: row.organizationId,
      entry,
      surveyItems: row.items || [],
    })

    return { ok: true, id: entry.id }
  })
}
