// ─── Multi-survey library (all surveys for this install) ──────────────────
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

/** Save or update a survey in the library. Returns the updated library. */
export function upsertSurvey(surveySnapshot) {
  const lib     = loadLibrary()
  const without = lib.filter(s => s.id !== surveySnapshot.id)
  const updated = [surveySnapshot, ...without]
  // Sort newest-first
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

/** Duplicate a survey — deep clone with a new ID and code suffix. */
export function duplicateSurvey(id) {
  const original = loadSurvey(id)
  if (!original) return null
  const now = new Date().toISOString()
  const clone = {
    ...JSON.parse(JSON.stringify(original)),
    survey: {
      ...original.survey,
      id:           newLibId(),
      internalName: (original.survey.internalName || original.survey.title) + ' (copy)',
      surveyCode:   original.survey.surveyCode ? original.survey.surveyCode + '_COPY' : '',
      status:       'draft',
      createdAt:    now,
      updatedAt:    now,
    },
  }
  clone.id       = clone.survey.id
  clone.savedAt  = now
  const updated = [clone, ...loadLibrary()]
  saveLibrary(updated)
  return clone
}

/** Check if a survey code already exists (for uniqueness validation). */
export function isSurveyCodeTaken(code, excludeId = null) {
  if (!code) return false
  return loadLibrary().some(s =>
    s.survey?.surveyCode?.toLowerCase() === code.toLowerCase() &&
    s.survey?.id !== excludeId
  )
}

const newLibId = () => crypto.randomUUID?.() ||
  `sv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
