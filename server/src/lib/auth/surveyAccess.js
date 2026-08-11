import { surveyScope } from './authz.js'

/**
 * Load a survey the caller may access. Returns 404 when missing or out of scope
 * (no 403 — avoids leaking whether another user's survey exists).
 */
export async function findAccessibleSurvey(prisma, request, surveyId, reply) {
  const row = await prisma.survey.findFirst({
    where: { id: surveyId, ...surveyScope(request) },
  })
  if (!row) {
    reply.code(404).send({ error: 'Survey not found' })
    return null
  }
  return row
}
