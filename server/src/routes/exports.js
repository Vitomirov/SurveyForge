/**
 * Survey CSV export events — the baseline for "new responses since last export".
 * Recording an export resets the new-count for that survey (full reset even
 * when the CSV was filtered).
 */
import { findAccessibleSurvey } from '../lib/auth/surveyAccess.js'
import {
  lastExportAtForSurvey,
  recordSurveyExport,
} from '../lib/notifications/responseNotifications.js'

function serializeExport(row) {
  if (!row) return { timestamp: null }
  return {
    id: row.id,
    timestamp: row.exportedAt.toISOString(),
    rowCount: row.rowCount,
  }
}

export async function registerExportRoutes(app) {
  app.get('/api/surveys/:id/exports/last', async (request, reply) => {
    const survey = await findAccessibleSurvey(
      app.prisma, request, request.params.id, reply, { id: true },
    )
    if (!survey) return

    const row = await lastExportAtForSurvey(app.prisma, survey.id)
    return serializeExport(row)
  })

  app.post('/api/surveys/:id/exports', async (request, reply) => {
    const survey = await findAccessibleSurvey(
      app.prisma, request, request.params.id, reply,
      { id: true, organizationId: true },
    )
    if (!survey) return

    const { rowCount, filters } = request.body ?? {}
    if (!Number.isInteger(rowCount) || rowCount < 0) {
      return reply.code(400).send({ error: 'rowCount must be a non-negative integer' })
    }
    if (filters != null && (typeof filters !== 'object' || Array.isArray(filters))) {
      return reply.code(400).send({ error: 'filters must be an object' })
    }

    const row = await recordSurveyExport(app.prisma, {
      surveyId: survey.id,
      organizationId: survey.organizationId ?? request.organizationId,
      exportedById: request.auth.userId,
      rowCount,
      filters: filters ?? null,
    })

    app.cache.invalidateSurvey(survey.id, request.organizationId)
    return reply.code(201).send(serializeExport(row))
  })
}
