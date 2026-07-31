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

export async function fetchUsers() {
  const data = await apiFetch('/api/platform/users')
  return data.users
}

export async function createUser(body) {
  const data = await apiFetch('/api/platform/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data.user
}

export async function updateUserApi(id, body) {
  const data = await apiFetch(`/api/platform/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return data.user
}

export async function deleteUserApi(id) {
  return apiFetch(`/api/platform/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
