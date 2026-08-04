import { apiFetch } from './client'

export async function getSurvey(id) {
  return apiFetch(`/api/surveys/${encodeURIComponent(id)}`)
}

export async function patchSurvey(id, { survey, items, revision }) {
  const body = {}
  if (survey !== undefined) body.survey = survey
  if (items !== undefined) body.items = items
  if (revision != null) body.revision = revision
  return apiFetch(`/api/surveys/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteSurveyApi(id) {
  return apiFetch(`/api/surveys/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** One-time dev import of localStorage library into Postgres. */
export async function migrateLocalLibrary(surveys) {
  return apiFetch('/api/migrate/local', {
    method: 'POST',
    body: JSON.stringify({ surveys }),
  })
}

/** Public taker route — live surveys only, no auth. */
export async function getPublicSurvey(id) {
  return apiFetch(`/api/public/surveys/${encodeURIComponent(id)}`)
}

/** Map API list row → library entry shape (metadata only; items loaded on open). */
export function metaToLibraryEntry(meta) {
  return {
    id: meta.id,
    survey: {
      id:           meta.id,
      title:        meta.title,
      status:       meta.status,
      updatedAt:    meta.updatedAt,
      internalName: meta.internalName,
      surveyCode:   meta.surveyCode,
      clientId:     meta.clientId,
      topicId:      meta.topicId,
      clientName:   meta.clientName,
      topicName:    meta.topicName,
      surveyType:   meta.surveyType,
    },
    items: [],
    revision: null,
    questionCount: meta.questionCount ?? 0,
    stats: meta.stats ?? { total: 0, complete: 0, terminated: 0, partial: 0 },
  }
}

/** Map full API payload → library entry shape. */
export function payloadToLibraryEntry(id, payload) {
  return {
    id,
    survey: payload.survey,
    items:  payload.items || [],
    revision: payload.revision,
  }
}
