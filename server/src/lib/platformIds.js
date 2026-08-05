/** Canonical platform lists — IDs must match src/utils/platformStore.js defaults. */
export const CANONICAL_CLIENTS = [
  { id: 'c_dmr', name: 'DMR' },
  { id: 'c_fsi', name: 'FSI' },
  { id: 'c_apg', name: 'APG' },
]

export const CANONICAL_TOPICS = [
  { id: 't_beauty',     name: 'Beauty' },
  { id: 't_education',  name: 'Education' },
  { id: 't_healthcare', name: 'Healthcare' },
  { id: 't_gaming',     name: 'Gaming' },
  { id: 't_pets',       name: 'Pets' },
]

const LEGACY_CLIENT_NAMES = Object.fromEntries(
  CANONICAL_CLIENTS.map(c => [c.id, c.name])
)

const LEGACY_TOPIC_NAMES = Object.fromEntries(
  CANONICAL_TOPICS.map(t => [t.id, t.name])
)

export function resolveClientRecord(clientId, clients) {
  if (!clientId) return null
  const direct = clients.find(c => c.id === clientId)
  if (direct) return direct
  const legacyName = LEGACY_CLIENT_NAMES[clientId]
  if (legacyName) return clients.find(c => c.name === legacyName) ?? null
  return null
}

export function resolveTopicRecord(topicId, topics) {
  if (!topicId) return null
  const direct = topics.find(t => t.id === topicId)
  if (direct) return direct
  const legacyName = LEGACY_TOPIC_NAMES[topicId]
  if (legacyName) return topics.find(t => t.name === legacyName) ?? null
  return null
}

/** Remap legacy client/topic IDs to current org records before persisting. */
export function normalizeSurveyPlatformIds(survey, clients, topics) {
  if (!survey || typeof survey !== 'object') return survey
  const next = { ...survey }
  if (next.clientId) {
    const client = resolveClientRecord(next.clientId, clients)
    if (client) next.clientId = client.id
  }
  if (next.topicId) {
    const topic = resolveTopicRecord(next.topicId, topics)
    if (topic) next.topicId = topic.id
  }
  return next
}
