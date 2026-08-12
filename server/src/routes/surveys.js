import { normalizeSurveyPlatformIds } from '../lib/platform/platformIds.js'
import { ownerFromSurvey, CREATOR_SELECT } from '../lib/auth/surveyOwner.js'
import { surveyScope } from '../lib/auth/authz.js'
import { findAccessibleSurvey } from '../lib/auth/surveyAccess.js'
import { assignPublicPath } from '../lib/survey/surveyPublicPath.js'
import { enforceSurveyBranding, loadOrgPlanContext } from '../lib/branding/brandEnforcement.js'
import { assertCanCreateSurvey } from '../lib/billing/planEnforcement.js'

async function loadPlatformLists(prisma, organizationId) {
  const [clients, topics, surveyTypes] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    }),
    prisma.topic.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    }),
    prisma.surveyType.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    }),
  ])
  return { clients, topics, surveyTypes }
}

export async function registerSurveyRoutes(app) {
  app.get('/api/surveys/:id', async (request, reply) => {
    const row = await app.prisma.survey.findFirst({
      where: { id: request.params.id, ...surveyScope(request) },
      include: { createdBy: { select: CREATOR_SELECT } },
    })
    if (!row) return reply.code(404).send({ error: 'Survey not found' })

    return {
      survey:   row.survey,
      items:    row.items,
      revision: row.revision,
      ...ownerFromSurvey(row),
    }
  })

  app.patch('/api/surveys/:id', async (request, reply) => {
    const { id } = request.params
    const { survey, items, revision } = request.body ?? {}

    if (survey === undefined && items === undefined) {
      return reply.code(400).send({ error: 'Body must include survey object and/or items array' })
    }
    if (survey !== undefined && typeof survey !== 'object') {
      return reply.code(400).send({ error: 'survey must be an object when provided' })
    }
    if (items !== undefined && !Array.isArray(items)) {
      return reply.code(400).send({ error: 'items must be an array when provided' })
    }
    if (survey?.id && survey.id !== id) {
      return reply.code(400).send({ error: 'Survey id in body must match URL' })
    }

    const existing = await app.prisma.survey.findFirst({
      where: { id, ...surveyScope(request) },
    })

    if (existing) {
      if (revision != null && revision !== existing.revision) {
        return reply.code(409).send({
          error: 'Revision conflict',
          revision: existing.revision,
          updatedAt: existing.updatedAt.toISOString(),
        })
      }

      const needsPublicPath = !existing.publicPath || !existing.survey?.publicPath
      const surveyUnchanged = survey === undefined
        || JSON.stringify(survey) === JSON.stringify(existing.survey)
      const itemsUnchanged = items === undefined
        || JSON.stringify(items) === JSON.stringify(existing.items)

      if (surveyUnchanged && itemsUnchanged && !needsPublicPath) {
        return {
          id:         existing.id,
          revision:   existing.revision,
          updatedAt:  existing.updatedAt.toISOString(),
          publicPath: existing.publicPath,
        }
      }

      const { clients, topics, surveyTypes } = await loadPlatformLists(app.prisma, request.organizationId)

      const { planId } = await loadOrgPlanContext(app.prisma, request.organizationId)
      const rawSurvey = survey !== undefined
        ? enforceSurveyBranding(
          { ...survey, id, updatedAt: new Date().toISOString() },
          planId,
        )
        : { ...existing.survey, id }
      const { survey: withPath, publicPath } = await assignPublicPath(app.prisma, rawSurvey)

      const surveyData = (survey !== undefined || needsPublicPath)
        ? normalizeSurveyPlatformIds(withPath, clients, topics, surveyTypes)
        : undefined

      const updated = await app.prisma.survey.update({
        where: { id },
        data: {
          ...(surveyData !== undefined ? { survey: surveyData, publicPath } : {}),
          ...(items !== undefined ? { items } : {}),
          revision: existing.revision + 1,
        },
      })

      return {
        id:         updated.id,
        revision:   updated.revision,
        updatedAt:  updated.updatedAt.toISOString(),
        publicPath: updated.publicPath,
      }
    }

    const foreign = await app.prisma.survey.findFirst({
      where: { id, organizationId: request.organizationId },
    })
    if (foreign) {
      return reply.code(404).send({ error: 'Survey not found' })
    }

    if (!survey || !Array.isArray(items)) {
      return reply.code(400).send({ error: 'New surveys require survey object and items array' })
    }

    const surveyLimit = await assertCanCreateSurvey(app.prisma, request.organizationId)
    if (!surveyLimit.ok) {
      return reply.code(403).send({ error: surveyLimit.error, code: surveyLimit.code })
    }

    const { clients, topics, surveyTypes } = await loadPlatformLists(app.prisma, request.organizationId)
    const { planId } = await loadOrgPlanContext(app.prisma, request.organizationId)

    const { survey: withPath, publicPath } = await assignPublicPath(
      app.prisma,
      enforceSurveyBranding(
        { ...survey, id, updatedAt: new Date().toISOString() },
        planId,
      ),
    )

    const surveyData = normalizeSurveyPlatformIds(withPath, clients, topics, surveyTypes)

    const created = await app.prisma.survey.create({
      data: {
        id,
        organizationId: request.organizationId,
        createdById:    request.auth.userId,
        publicPath,
        survey: surveyData,
        items,
        revision: 1,
      },
    })

    return reply.code(201).send({
      id:         created.id,
      revision:   created.revision,
      updatedAt:  created.updatedAt.toISOString(),
      publicPath: created.publicPath,
    })
  })

  app.delete('/api/surveys/:id', async (request, reply) => {
    const existing = await findAccessibleSurvey(
      app.prisma, request, request.params.id, reply
    )
    if (!existing) return

    await app.prisma.survey.delete({ where: { id: request.params.id } })
    return { ok: true }
  })
}
