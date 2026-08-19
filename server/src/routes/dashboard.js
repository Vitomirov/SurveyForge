/**
 * Dashboard listing route.
 * Returns all surveys visible to the caller with metadata (client, topic,
 * type names), per-survey response stats, and question counts for the home
 * dashboard view.
 */
import { Prisma } from '@prisma/client'
import { resolveClientRecord, resolveTopicRecord, resolveSurveyTypeRecord } from '../lib/platform/platformIds.js'
import { ownerFromSurvey } from '../lib/auth/surveyOwner.js'
import { isAdmin } from '../lib/auth/authz.js'

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

function listingFromSql(row) {
  return {
    id: row.id,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
    createdById: row.createdById,
    survey: {
      title: row.title,
      status: row.status,
      internalName: row.internalName,
      surveyCode: row.surveyCode,
      clientId: row.clientId,
      topicId: row.topicId,
      surveyType: row.surveyType,
    },
    createdBy: row.creatorId
      ? {
        id: row.creatorId,
        name: row.creatorName,
        username: row.creatorUsername,
        email: row.creatorEmail,
      }
      : null,
    questionCount: row.questionCount ?? 0,
  }
}

export async function registerDashboardRoutes(app) {
  app.get('/api/dashboard', async (request) => {
    const orgId = request.organizationId
    const userId = request.auth.userId

    const cached = app.cache.getDashboard(orgId, userId)
    if (cached) return cached

    return app.cache.loadOnce(`dashboard:${orgId}:${userId}`, async () => {
      const hit = app.cache.getDashboard(orgId, userId)
      if (hit) return hit

    const editorFilter = isAdmin(request)
      ? Prisma.empty
      : Prisma.sql`AND s.survey_created_by_id = ${userId}`

    const sqlRows = await app.prisma.$queryRaw`
      SELECT
        s.id,
        s.survey_updated_at AS "updatedAt",
        s.survey_created_by_id AS "createdById",
        s.survey_data->>'title' AS title,
        COALESCE(s.survey_data->>'status', 'draft') AS status,
        COALESCE(s.survey_data->>'internalName', '') AS "internalName",
        COALESCE(s.survey_data->>'surveyCode', '') AS "surveyCode",
        COALESCE(s.survey_data->>'clientId', '') AS "clientId",
        COALESCE(s.survey_data->>'topicId', '') AS "topicId",
        COALESCE(s.survey_data->>'surveyType', '') AS "surveyType",
        COALESCE((
          SELECT COUNT(*)::int
          FROM jsonb_array_elements(s.survey_items) AS elem
          WHERE elem->>'itemType' = 'question'
        ), 0) AS "questionCount",
        u.id AS "creatorId",
        u.user_name AS "creatorName",
        u.user_username AS "creatorUsername",
        u.user_email AS "creatorEmail"
      FROM surveys s
      LEFT JOIN users u ON u.id = s.survey_created_by_id
      WHERE s.organization_id = ${orgId}
        ${editorFilter}
      ORDER BY s.survey_updated_at DESC
    `

    const rows = sqlRows.map(listingFromSql)
    const surveyIds = rows.map(r => r.id)

    const [clients, topics, surveyTypes, groups] = await Promise.all([
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
    ])

    const statsMap = buildStatsMap(groups.map(g => ({
      surveyId: g.surveyId,
      status: g.status,
      _count: g._count._all,
    })))

    const payload = {
      surveys: rows.map(row => ({
        ...surveyMeta(row, row.questionCount ?? 0, { clients, topics, surveyTypes }),
        stats: statsMap[row.id] || emptyStats(),
      })),
    }
    app.cache.setDashboard(orgId, userId, payload)
    return payload
    })
  })
}
