/**
 * Legacy platform list ID resolution.
 * Maps hardcoded pre-database client/topic/survey-type IDs and slugs to current
 * org-managed records for reads and writes of survey metadata.
 */
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

/** Legacy audience-type slugs stored in survey.surveyType before org-managed lists. */
const LEGACY_SURVEY_TYPE_NAMES = {
  consumer:  'Consumer',
  b2b:       'B2B',
  hcp:       'HCP',
  patient:   'Patient',
  caregiver: 'Caregiver',
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

export function resolveSurveyTypeRecord(surveyTypeId, surveyTypes) {
  if (!surveyTypeId) return null
  const direct = surveyTypes.find(t => t.id === surveyTypeId)
  if (direct) return direct
  const legacyName = LEGACY_SURVEY_TYPE_NAMES[surveyTypeId]
  if (legacyName) return surveyTypes.find(t => t.name === legacyName) ?? null
  return null
}

/** Remap legacy client/topic/type IDs to current org records before persisting. */
export function normalizeSurveyPlatformIds(survey, clients, topics, surveyTypes = []) {
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
  if (next.surveyType) {
    const type = resolveSurveyTypeRecord(next.surveyType, surveyTypes)
    if (type) next.surveyType = type.id
  }
  return next
}
