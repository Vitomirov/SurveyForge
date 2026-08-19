/**
 * Survey response routes (authenticated).
 * Lists, creates, and deletes response entries for surveys the caller can
 * access. Exports `upsertResponse()` shared by the public response endpoint.
 */
import { findAccessibleSurvey } from '../lib/auth/surveyAccess.js'
import { resolveDncStatus } from '../lib/survey/dncCheck.js'
import { normalizeResponseEntry } from '../lib/survey/responseNormalization.js'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const ALLOWED_RESPONSE_STATUSES = new Set(['partial', 'complete', 'terminated', 'dnc'])

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
      answerSchemaVersion: entry.answerSchemaVersion ?? 2,
    },
  }
}

export async function upsertResponse(app, { surveyId, organizationId, entry, surveyItems = [] }) {
  const normalized = normalizeResponseEntry(entry, surveyItems)
  const data = entryToDbFields(normalized, surveyId, organizationId)
  if (!data) return null
  if (!ALLOWED_RESPONSE_STATUSES.has(data.status)) {
    return { invalidStatus: true }
  }

  const existing = await app.prisma.response.findUnique({
    where: { id: data.id },
    select: { surveyId: true, organizationId: true },
  })
  if (existing && (existing.surveyId !== surveyId || existing.organizationId !== organizationId)) {
    return { conflict: true }
  }

  data.status = await resolveDncStatus(app.prisma, {
    surveyId,
    entry: normalized,
    surveyItems,
    status: data.status,
  })

  const row = await app.prisma.response.upsert({
    where: { id: data.id },
    create: data,
    update: {
      status:    data.status,
      timestamp: data.timestamp,
      payload:   data.payload,
    },
  })
  return { row }
}

export async function registerResponseRoutes(app) {
  app.get('/api/surveys/:id/responses/stats', async (request, reply) => {
    const survey = await findAccessibleSurvey(
      app.prisma, request, request.params.id, reply, { id: true }
    )
    if (!survey) return

    const cached = app.cache.getStats(survey.id)
    if (cached) return cached

    const stats = await app.cache.loadOnce(`stats:${survey.id}`, async () => {
      const hit = app.cache.getStats(survey.id)
      if (hit) return hit

      const groups = await app.prisma.response.groupBy({
        by: ['status'],
        where: { surveyId: survey.id, organizationId: request.organizationId },
        _count: { _all: true },
      })

      const next = { total: 0, complete: 0, terminated: 0, partial: 0, dnc: 0 }
      for (const row of groups) {
        const count = row._count._all
        if (next[row.status] !== undefined) next[row.status] = count
        next.total += count
      }
      app.cache.setStats(survey.id, next)
      return next
    })
    return stats
  })

  app.get('/api/surveys/:id/responses', async (request, reply) => {
    const survey = await findAccessibleSurvey(
      app.prisma, request, request.params.id, reply, { id: true }
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
    const survey = await findAccessibleSurvey(
      app.prisma, request, request.params.id, reply, { id: true, items: true }
    )
    if (!survey) return

    const entry = request.body
    if (!entry?.id) {
      return reply.code(400).send({ error: 'Response entry must include id' })
    }

    const result = await upsertResponse(app, {
      surveyId: survey.id,
      organizationId: request.organizationId,
      entry,
      surveyItems: survey.items || [],
    })
    if (!result) {
      return reply.code(400).send({ error: 'Response entry must include id and status' })
    }
    if (result.conflict) {
      return reply.code(409).send({ error: 'Response id belongs to another survey' })
    }
    if (result.invalidStatus) {
      return reply.code(400).send({ error: 'Invalid response status' })
    }

    return { ok: true, id: result.row.id }
  })

  app.delete('/api/surveys/:id/responses/:responseId', async (request, reply) => {
    const survey = await findAccessibleSurvey(
      app.prisma, request, request.params.id, reply, { id: true }
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
    const survey = await findAccessibleSurvey(
      app.prisma, request, request.params.id, reply, { id: true }
    )
    if (!survey) return

    await app.prisma.response.deleteMany({
      where: { surveyId: survey.id, organizationId: request.organizationId },
    })
    return { ok: true }
  })
}
