import { resolveClientRecord, resolveTopicRecord } from '../lib/platformIds.js'

function surveyMeta(row, questionCount = 0, { clients = [], topics = [] } = {}) {
  const survey = row.survey
  const clientId = survey?.clientId ?? ''
  const topicId = survey?.topicId ?? ''
  const client = resolveClientRecord(clientId, clients)
  const topic = resolveTopicRecord(topicId, topics)
  return {
    id:           row.id,
    title:        survey?.title ?? 'Untitled Survey',
    status:       survey?.status ?? 'draft',
    updatedAt:    row.updatedAt.toISOString(),
    internalName: survey?.internalName ?? '',
    surveyCode:   survey?.surveyCode ?? '',
    clientId:     client?.id ?? clientId,
    topicId:      topic?.id ?? topicId,
    clientName:   client?.name ?? '',
    topicName:    topic?.name ?? '',
    surveyType:   survey?.surveyType ?? '',
    questionCount,
  }
}

function emptyStats() {
  return { total: 0, complete: 0, terminated: 0, partial: 0 }
}

function buildStatsMap(groups) {
  const bySurvey = {}
  for (const row of groups) {
    if (!bySurvey[row.surveyId]) bySurvey[row.surveyId] = emptyStats()
    const s = bySurvey[row.surveyId]
    s[row.status] = (s[row.status] ?? 0) + row._count
    s.total += row._count
  }
  return bySurvey
}

export async function registerDashboardRoutes(app) {
  app.get('/api/dashboard', async (request) => {
    const orgId = request.organizationId

    const [rows, countRows, clients, topics] = await Promise.all([
      app.prisma.survey.findMany({
        where: { organizationId: orgId },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, survey: true, updatedAt: true },
      }),
      app.prisma.$queryRaw`
        SELECT s.id,
          COALESCE((
            SELECT COUNT(*)::int
            FROM jsonb_array_elements(s.survey_items) AS elem
            WHERE elem->>'itemType' = 'question'
          ), 0) AS "questionCount"
        FROM surveys s
        WHERE s.organization_id = ${orgId}
      `,
      app.prisma.client.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
      }),
      app.prisma.topic.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
      }),
    ])

    const questionCountById = Object.fromEntries(
      countRows.map(r => [r.id, Number(r.questionCount) || 0])
    )

    const groups = await app.prisma.response.groupBy({
      by: ['surveyId', 'status'],
      where: { organizationId: orgId },
      _count: { _all: true },
    })

    const statsMap = buildStatsMap(groups.map(g => ({
      surveyId: g.surveyId,
      status: g.status,
      _count: g._count._all,
    })))

    return {
      surveys: rows.map(row => ({
        ...surveyMeta(row, questionCountById[row.id] ?? 0, { clients, topics }),
        stats: statsMap[row.id] || emptyStats(),
      })),
    }
  })
}
