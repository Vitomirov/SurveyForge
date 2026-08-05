import { resolveClientRecord, resolveTopicRecord } from '../lib/platformIds.js'
import { ownerFromSurvey, CREATOR_SELECT } from '../lib/surveyOwner.js'
import { surveyScope } from '../lib/authz.js'

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
    ...ownerFromSurvey(row),
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

function countQuestions(items) {
  const list = Array.isArray(items) ? items : []
  return list.filter(i => i?.itemType === 'question').length
}

export async function registerDashboardRoutes(app) {
  app.get('/api/dashboard', async (request) => {
    const scope = surveyScope(request)
    const orgId = scope.organizationId

    const rows = await app.prisma.survey.findMany({
      where: scope,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        survey: true,
        items: true,
        updatedAt: true,
        createdById: true,
        createdBy: { select: CREATOR_SELECT },
      },
    })

    const surveyIds = rows.map(r => r.id)

    const [clients, topics, groups] = await Promise.all([
      app.prisma.client.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
      }),
      app.prisma.topic.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
      }),
      surveyIds.length
        ? app.prisma.response.groupBy({
          by: ['surveyId', 'status'],
          where: { organizationId: orgId, surveyId: { in: surveyIds } },
          _count: { _all: true },
        })
        : Promise.resolve([]),
    ])

    const statsMap = buildStatsMap(groups.map(g => ({
      surveyId: g.surveyId,
      status: g.status,
      _count: g._count._all,
    })))

    return {
      surveys: rows.map(row => ({
        ...surveyMeta(row, countQuestions(row.items), { clients, topics }),
        stats: statsMap[row.id] || emptyStats(),
      })),
    }
  })
}
