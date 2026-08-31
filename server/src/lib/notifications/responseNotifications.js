/**
 * API-mode new-since-export counts.
 * Same semantics as shared/responseNotifications.js: timestamp > last export
 * (or all responses when a survey has never been exported).
 */
import { Prisma } from '@prisma/client'
import { buildNotificationsPayload } from '../../../../shared/responseNotifications.js'

export { buildNotificationsPayload }

export async function lastExportAtForSurvey(prisma, surveyId) {
  const row = await prisma.surveyExport.findFirst({
    where: { surveyId },
    orderBy: { exportedAt: 'desc' },
    select: { exportedAt: true, rowCount: true, id: true },
  })
  return row
}

export async function recordSurveyExport(prisma, {
  surveyId,
  organizationId,
  exportedById = null,
  rowCount,
  filters = null,
}) {
  return prisma.surveyExport.create({
    data: {
      surveyId,
      organizationId,
      exportedById,
      rowCount,
      filters: filters ?? undefined,
    },
  })
}

/**
 * Batch count new responses per survey.
 * @returns {Promise<Record<string, { newCount: number, latestAt: string|null }>>}
 */
export async function countNewForSurveysDb(prisma, { organizationId, surveyIds }) {
  const empty = {}
  for (const id of surveyIds) empty[id] = { newCount: 0, latestAt: null }
  if (!surveyIds.length) return empty

  const rows = await prisma.$queryRaw`
    SELECT
      r.survey_id AS "surveyId",
      COUNT(*)::int AS "newCount",
      MAX(r.response_timestamp) AS "latestAt"
    FROM responses r
    LEFT JOIN (
      SELECT se.survey_id, MAX(se.exported_at) AS last_export
      FROM survey_exports se
      WHERE se.survey_id IN (${Prisma.join(surveyIds)})
      GROUP BY se.survey_id
    ) e ON e.survey_id = r.survey_id
    WHERE r.organization_id = ${organizationId}
      AND r.survey_id IN (${Prisma.join(surveyIds)})
      AND (e.last_export IS NULL OR r.response_timestamp > e.last_export)
    GROUP BY r.survey_id
  `

  const result = { ...empty }
  for (const row of rows) {
    result[row.surveyId] = {
      newCount: row.newCount ?? 0,
      latestAt: row.latestAt ? new Date(row.latestAt).toISOString() : null,
    }
  }
  return result
}

export async function buildNotificationsForSurveys(prisma, {
  organizationId,
  surveys,
}) {
  const surveyIds = surveys.map(s => s.id)
  const newBySurvey = await countNewForSurveysDb(prisma, { organizationId, surveyIds })
  return buildNotificationsPayload(surveys, { newBySurvey })
}
