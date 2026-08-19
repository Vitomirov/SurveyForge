/**
 * Role-scoped survey lookup.
 * Loads a survey only when it falls within the caller's `surveyScope`, returning
 * 404 (not 403) when missing to avoid leaking existence of other users' surveys.
 */
import { surveyScope } from './authz.js'

/**
 * Load a survey the caller may access. Returns 404 when missing or out of scope
 * (no 403 — avoids leaking whether another user's survey exists).
 * Pass `select` to avoid loading full survey JSONB when only `id` is needed.
 */
export async function findAccessibleSurvey(prisma, request, surveyId, reply, select) {
  const row = await prisma.survey.findFirst({
    where: { id: surveyId, ...surveyScope(request) },
    ...(select ? { select } : {}),
  })
  if (!row) {
    reply.code(404).send({ error: 'Survey not found' })
    return null
  }
  return row
}
