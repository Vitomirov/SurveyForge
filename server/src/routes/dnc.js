import { findAccessibleSurvey } from '../lib/surveyAccess.js'

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim()
}

export async function registerDncRoutes(app) {
  app.get('/api/surveys/:id/dnc', async (request, reply) => {
    const survey = await findAccessibleSurvey(
      app.prisma, request, request.params.id, reply
    )
    if (!survey) return

    const rows = await app.prisma.dncEntry.findMany({
      where: { surveyId: survey.id },
      orderBy: { email: 'asc' },
    })
    return { emails: rows.map(r => r.email) }
  })

  app.post('/api/surveys/:id/dnc', async (request, reply) => {
    const survey = await findAccessibleSurvey(
      app.prisma, request, request.params.id, reply
    )
    if (!survey) return

    const { emails } = request.body ?? {}
    if (!Array.isArray(emails)) {
      return reply.code(400).send({ error: 'Body must include emails array' })
    }

    const normalized = [...new Set(
      emails.map(normalizeEmail).filter(e => e.includes('@'))
    )]

    if (normalized.length) {
      await app.prisma.dncEntry.createMany({
        data: normalized.map(email => ({ surveyId: survey.id, email })),
        skipDuplicates: true,
      })
    }

    const count = await app.prisma.dncEntry.count({ where: { surveyId: survey.id } })
    return { ok: true, count }
  })

  app.delete('/api/surveys/:id/dnc', async (request, reply) => {
    const survey = await findAccessibleSurvey(
      app.prisma, request, request.params.id, reply
    )
    if (!survey) return

    await app.prisma.dncEntry.deleteMany({ where: { surveyId: survey.id } })
    return { ok: true }
  })

  app.delete('/api/surveys/:id/dnc/:email', async (request, reply) => {
    const survey = await findAccessibleSurvey(
      app.prisma, request, request.params.id, reply
    )
    if (!survey) return

    const email = normalizeEmail(decodeURIComponent(request.params.email))
    await app.prisma.dncEntry.deleteMany({
      where: { surveyId: survey.id, email },
    })
    return { ok: true }
  })
}
