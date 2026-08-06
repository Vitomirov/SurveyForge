// ─── Response payload normalization ─────────────────────────────────────────
// Matrix answers are stored as structured objects: { [rowId]: columnId | columnId[] }.
// Coerces legacy string values and validates shape before persisting to JSONB.

import { normalizeMatrixAnswer } from '../../../shared/matrixAnswer.js'

/**
 * Normalize answer shapes in a response entry before DB persistence.
 * @param {object} entry - Client response entry
 * @param {object[]} surveyItems - Survey definition items for type-aware normalization
 */
export function normalizeResponseEntry(entry, surveyItems = []) {
  if (!entry || typeof entry !== 'object') return entry

  const itemsById = {}
  for (const item of surveyItems) {
    if (item?.itemType === 'question') itemsById[item.id] = item
  }

  const responses = { ...(entry.responses || {}) }
  for (const [qId, answer] of Object.entries(responses)) {
    const q = itemsById[qId]
    if (q?.questionType === 'matrix') {
      responses[qId] = normalizeMatrixAnswer(answer)
    }
  }

  return {
    ...entry,
    responses,
    answerSchemaVersion: 2,
  }
}
