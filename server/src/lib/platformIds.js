// Legacy localStorage IDs from frontend defaults — map to display names.
const LEGACY_CLIENT_NAMES = {
  c_dmr: 'DMR',
  c_fsi: 'FSI',
  c_apg: 'APG',
}

const LEGACY_TOPIC_NAMES = {
  t_beauty:     'Beauty',
  t_education:  'Education',
  t_healthcare: 'Healthcare',
  t_gaming:     'Gaming',
  t_pets:       'Pets',
}

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
