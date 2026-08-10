import { apiFetch } from './client'

export async function fetchClients() {
  const data = await apiFetch('/api/platform/clients')
  return data.clients
}

export async function createClient(name) {
  const data = await apiFetch('/api/platform/clients', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return data.client
}

export async function updateClientApi(id, name) {
  const data = await apiFetch(`/api/platform/clients/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
  return data.client
}

export async function deleteClientApi(id) {
  return apiFetch(`/api/platform/clients/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function fetchTopics() {
  const data = await apiFetch('/api/platform/topics')
  return data.topics
}

export async function createTopic(name) {
  const data = await apiFetch('/api/platform/topics', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return data.topic
}

export async function updateTopicApi(id, name) {
  const data = await apiFetch(`/api/platform/topics/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
  return data.topic
}

export async function deleteTopicApi(id) {
  return apiFetch(`/api/platform/topics/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function fetchSurveyTypes() {
  const data = await apiFetch('/api/platform/survey-types')
  return data.surveyTypes
}

export async function createSurveyType(name) {
  const data = await apiFetch('/api/platform/survey-types', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return data.surveyType
}

export async function updateSurveyTypeApi(id, name) {
  const data = await apiFetch(`/api/platform/survey-types/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
  return data.surveyType
}

export async function deleteSurveyTypeApi(id) {
  return apiFetch(`/api/platform/survey-types/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function fetchUsers() {
  const data = await apiFetch('/api/platform/users')
  return data.users
}

export async function createUser(body) {
  return apiFetch('/api/platform/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateUserApi(id, body) {
  return apiFetch(`/api/platform/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteUserApi(id) {
  return apiFetch(`/api/platform/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
