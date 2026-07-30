/** Dev-only: import localStorage library snapshots into Postgres. */
export async function registerMigrateRoutes(app, { isDev }) {
  if (!isDev) return

  app.post('/api/migrate/local', async (request, reply) => {
    const { surveys } = request.body ?? {}
    if (!Array.isArray(surveys)) {
      return reply.code(400).send({ error: 'Body must include surveys array' })
    }

    let imported = 0
    let skipped = 0

    for (const entry of surveys) {
      const id = entry?.id || entry?.survey?.id
      if (!id || !entry?.survey) { skipped++; continue }

      const surveyData = {
        ...entry.survey,
        id,
        updatedAt: entry.survey.updatedAt || new Date().toISOString(),
      }
      const items = Array.isArray(entry.items) ? entry.items : []

      await app.prisma.survey.upsert({
        where: { id },
        create: {
          id,
          organizationId: request.organizationId,
          survey: surveyData,
          items,
          revision: 1,
        },
        update: {
          survey: surveyData,
          items,
          revision: { increment: 1 },
        },
      })
      imported++
    }

    return { ok: true, imported, skipped }
  })
}
