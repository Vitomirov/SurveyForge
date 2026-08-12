/** Track survey IDs that were just created locally and are not in the API yet. */
const KEY = 'sf_new_drafts'

export function markNewSurveyDraft(id) {
  try {
    const list = JSON.parse(sessionStorage.getItem(KEY) || '[]')
    if (!list.includes(id)) {
      list.push(id)
      sessionStorage.setItem(KEY, JSON.stringify(list))
    }
  } catch { /* noop */ }
}

export function isNewSurveyDraft(id) {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '[]').includes(id)
  } catch {
    return false
  }
}

export function clearNewSurveyDraft(id) {
  try {
    const list = JSON.parse(sessionStorage.getItem(KEY) || '[]').filter(x => x !== id)
    sessionStorage.setItem(KEY, JSON.stringify(list))
  } catch { /* noop */ }
}
