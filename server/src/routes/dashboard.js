/**
 * Dashboard listing route.
 * Returns all surveys visible to the caller with metadata (client, topic,
 * type names), per-survey response stats, and question counts for the home
 * dashboard view.
 */
import { Prisma } from '@prisma/client'
import { resolveClientRecord, resolveTopicRecord, resolveSurveyTypeRecord } from '../lib/platform/platformIds.js'
import { ownerFromSurvey, CREATOR_SELECT } from '../lib/auth/surveyOwner.js'
import { surveyScope } from '../lib/auth/authz.js'

function surveyMeta(row, questionCount = 0, { clients = [], topics = [], surveyTypes = [] } = {}) {
  const survey = row.survey
  const clientId = survey?.clientId ?? ''
  const topicId = survey?.topicId ?? ''
  const surveyTypeId = survey?.surveyType ?? ''
  const client = resolveClientRecord(clientId, clients)
  const topic = resolveTopicRecord(topicId, topics)
  const surveyType = resolveSurveyTypeRecord(surveyTypeId, surveyTypes)
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
    surveyType:   surveyType?.id ?? surveyTypeId,
    surveyTypeName: surveyType?.name ?? '',
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
        updatedAt: true,
        createdById: true,
        createdBy: { select: CREATOR_SELECT },
      },
    })

    const surveyIds = rows.map(r => r.id)

    const [clients, topics, surveyTypes, groups, questionCounts] = await Promise.all([
      app.prisma.client.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
      }),
      app.prisma.topic.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
      }),
      app.prisma.surveyType.findMany({
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
      surveyIds.length
        ? app.prisma.$queryRaw`
            SELECT s.id,
              COALESCE((
                SELECT COUNT(*)::int
                FROM jsonb_array_elements(s.survey_items) AS elem
                WHERE elem->>'itemType' = 'question'
              ), 0) AS "questionCount"
            FROM surveys s
            WHERE s.id IN (${Prisma.join(surveyIds)})
          `
        : Promise.resolve([]),
    ])

    const statsMap = buildStatsMap(groups.map(g => ({
      surveyId: g.surveyId,
      status: g.status,
      _count: g._count._all,
    })))
    const questionCountMap = Object.fromEntries(
      questionCounts.map(row => [row.id, row.questionCount]),
    )

    return {
      surveys: rows.map(row => ({
        ...surveyMeta(row, questionCountMap[row.id] ?? 0, { clients, topics, surveyTypes }),
        stats: statsMap[row.id] || emptyStats(),
      })),
    }
  })
}
