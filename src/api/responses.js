import { apiFetch } from './client'

export async function saveResponseApi(surveyId, entry) {
  return apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}/responses`, {
    method: 'POST',
    body: JSON.stringify(entry),
  })
}

export async function savePublicResponse(surveyId, entry) {
  return apiFetch(`/api/public/surveys/${encodeURIComponent(surveyId)}/responses`, {
    method: 'POST',
    body: JSON.stringify(entry),
  })
}

async function getResponses(surveyId, { page = 1, limit = 50 } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  return apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}/responses?${qs}`)
}

export async function fetchResponseStats(surveyId) {
  return apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}/responses/stats`)
}

/** Fetch a single page of responses (max 200 per page). */
export async function fetchResponsesPage(surveyId, page = 1, limit = 200) {
  return getResponses(surveyId, { page, limit })
}

/** Load all responses for export (paginated fetch). */
export async function fetchAllResponses(surveyId) {
  const limit = 200
  let page = 1
  const all = []
  let total = 0

  do {
    const data = await getResponses(surveyId, { page, limit })
    total = data.total
    all.push(...data.responses)
    if (data.responses.length === 0) break
    page++
  } while (all.length < total)

  return all
}

export async function deleteResponseApi(surveyId, responseId) {
  return apiFetch(
    `/api/surveys/${encodeURIComponent(surveyId)}/responses/${encodeURIComponent(responseId)}`,
    { method: 'DELETE' }
  )
}

export async function clearResponsesApi(surveyId) {
  return apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}/responses`, {
    method: 'DELETE',
  })
}
