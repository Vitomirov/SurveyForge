/** Resolve client/topic display names when survey stores legacy or mismatched IDs. */

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

function resolveRecord(id, list, legacyNames) {
  if (!id) return null
  const direct = list.find(item => item.id === id)
  if (direct) return direct
  const legacyName = legacyNames[id]
  if (legacyName) return list.find(item => item.name === legacyName) ?? null
  return null
}

export function resolveClientName(clientId, clients, fallback = '') {
  if (fallback) return fallback
  return resolveRecord(clientId, clients, LEGACY_CLIENT_NAMES)?.name ?? ''
}

export function resolveTopicName(topicId, topics, fallback = '') {
  if (fallback) return fallback
  return resolveRecord(topicId, topics, LEGACY_TOPIC_NAMES)?.name ?? ''
}
