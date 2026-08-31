import { apiFetch } from '../client'

export async function fetchLastExport(surveyId) {
  return apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}/exports/last`)
}

export async function recordExportApi(surveyId, { rowCount, filters } = {}) {
  return apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}/exports`, {
    method: 'POST',
    body: { rowCount, filters },
  })
}
