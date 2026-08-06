// ─── Multi-survey library (all surveys for this install) ──────────────────
import { newSurveyId } from '@/store/id'
import {
  clientDomainFromName,
  displayPublicPath,
  ensureUniquePublicPath,
  isPublicPathLocked,
  previewPublicPath,
} from '@shared/surveyUrl.js'
import { loadClients } from '@/utils/platformStore'

const LIBRARY_KEY = 'sf_survey_library'

export function loadLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveLibrary(surveys) {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(surveys)) } catch { /* noop */ }
}

function pathTakenLocally(candidate, surveyId, lib) {
  return lib.some(s => s.survey?.publicPath === candidate && s.survey?.id !== surveyId)
}

function assignLocalPublicPath(survey, lib) {
  if (isPublicPathLocked(survey)) return survey.publicPath
  const base = previewPublicPath(survey)
  return ensureUniquePublicPath(
    base,
    (candidate, surveyId) => pathTakenLocally(candidate, surveyId, lib),
    survey.id,
  )
}

/** Save or update a survey in the library. Returns the updated library. */
export function upsertSurvey(surveySnapshot) {
  const lib     = loadLibrary()
  const without = lib.filter(s => s.id !== surveySnapshot.id)
  const publicPath = assignLocalPublicPath(surveySnapshot.survey, without)
  const survey  = { ...surveySnapshot.survey, publicPath }
  const updated = [{ ...surveySnapshot, survey }, ...without]
  updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  saveLibrary(updated)
  return updated
}

/** Load a single survey snapshot by ID. Returns null if not found. */
export function loadSurvey(id) {
  return loadLibrary().find(s => s.id === id) || null
}

/** Delete a survey from the library permanently. */
export function deleteSurvey(id) {
  const updated = loadLibrary().filter(s => s.id !== id)
  saveLibrary(updated)
  return updated
}

/** Load a live survey by white-label public path. */
export function loadSurveyByPublicPath(publicPath, clientDomain = null) {
  const match = loadLibrary().find(entry => {
    if (entry.survey?.publicPath !== publicPath) return false
    if (entry.survey?.status !== 'live') return false
    if (!clientDomain) return true
    const client = loadClients().find(c => c.id === entry.survey?.clientId)
    return client && clientDomainFromName(client.name) === clientDomain
  })
  return match || null
}

/** Build a cloned survey object with a new ID and draft status. */
export function buildClonedSurvey(originalSurvey) {
  const now = new Date().toISOString()
  const name = (originalSurvey.internalName || originalSurvey.title) + ' (copy)'
  const clone = {
    ...JSON.parse(JSON.stringify(originalSurvey)),
    id: newSurveyId(),
    internalName: name,
    surveyCode: originalSurvey.surveyCode ? originalSurvey.surveyCode + '_COPY' : '',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
  delete clone.publicPath
  return clone
}

/** Duplicate a survey — deep clone with a new ID and code suffix. */
export function duplicateSurvey(id) {
  const original = loadSurvey(id)
  if (!original) return null
  const now = new Date().toISOString()
  const clone = {
    ...JSON.parse(JSON.stringify(original)),
    survey: buildClonedSurvey(original.survey),
  }
  clone.id       = clone.survey.id
  clone.savedAt  = now
  const updated = upsertSurvey(clone)
  return updated.find(s => s.id === clone.id) || clone
}

/** Check if a survey code already exists (for uniqueness validation). */
export function isSurveyCodeTaken(code, excludeId = null) {
  if (!code) return false
  return loadLibrary().some(s =>
    s.survey?.surveyCode?.toLowerCase() === code.toLowerCase() &&
    s.survey?.id !== excludeId
  )
}
