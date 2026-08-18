import { apiFetch } from '../client'

export async function fetchDNCList(surveyId) {
  return apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}/dnc`)
}

/** Unauthenticated single-email check for live public take route. */
export async function checkPublicDNC(surveyId, email) {
  return apiFetch(`/api/public/surveys/${encodeURIComponent(surveyId)}/dnc/check`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function importDNC(surveyId, emails) {
  return apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}/dnc`, {
    method: 'POST',
    body: JSON.stringify({ emails }),
  })
}

export async function clearDNCApi(surveyId) {
  return apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}/dnc`, {
    method: 'DELETE',
  })
}

export async function removeDNCApi(surveyId, email) {
  return apiFetch(
    `/api/surveys/${encodeURIComponent(surveyId)}/dnc/${encodeURIComponent(email)}`,
    { method: 'DELETE' }
  )
}
