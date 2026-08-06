// ─── Matrix answer helpers ────────────────────────────────────────────────────
// Matrix answers are stored as { [rowId]: columnId | columnId[] | null }.
// Used by condition evaluation, piping, validation, and export.

import { normalizeMatrixAnswer } from '../../shared/matrixAnswer.js'

export { normalizeMatrixAnswer }

/** True when the answer has no meaningful row selections. */
export function isMatrixAnswerEmpty(answer) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return true
  return !Object.values(answer).some(v => {
    if (v === null || v === undefined) return false
    if (Array.isArray(v)) return v.length > 0
    return true
  })
}

/** Normalize a single row's selection to an array of column IDs. */
export function getMatrixRowSelection(answer, rowId, subType = 'single') {
  if (!answer || typeof answer !== 'object') return []
  const rowAnswer = answer[rowId]
  if (rowAnswer === null || rowAnswer === undefined) return []
  if (subType === 'multi') {
    return Array.isArray(rowAnswer) ? rowAnswer : [rowAnswer]
  }
  return rowAnswer ? [rowAnswer] : []
}

/** Human-readable label for one matrix row's selection. */
export function formatMatrixRowAnswer(question, answer, rowId) {
  const cfg = question?.matrixConfig
  if (!cfg) return '[not yet answered]'

  const row = cfg.rows?.find(r => r.id === rowId)
  const selected = getMatrixRowSelection(answer, rowId, cfg.subType)
  if (!selected.length) return '[not yet answered]'

  const labels = selected
    .map(colId => cfg.columns?.find(c => c.id === colId)?.text)
    .filter(Boolean)

  if (!labels.length) return '[not yet answered]'
  const prefix = row?.text ? `${row.text}: ` : ''
  return prefix + labels.join(', ')
}

/** Human-readable summary of the full matrix answer. */
export function formatMatrixAnswer(question, answer) {
  const cfg = question?.matrixConfig
  if (!cfg?.rows?.length) return String(answer ?? '')

  if (typeof answer === 'string') return answer

  return cfg.rows
    .map(row => formatMatrixRowAnswer(question, answer, row.id))
    .filter(text => text !== '[not yet answered]')
    .join('; ') || '[not yet answered]'
}

/**
 * Evaluate whether a matrix row's selection matches column ID rules.
 * Used by visibility, termination blocks, and per-question matrix screen-out.
 *
 * @param {object} spec - { matrixRowId, matrixColumnIds, conditionType?, matchMode? }
 * conditionType: any_of | none_of | all_of (visibility/blocks)
 * matchMode: any | all (per-question rules, defaults to any)
 */
export function evalMatrixSelection(spec, question, answer) {
  const rowId = spec.matrixRowId
  if (!rowId || !question?.matrixConfig) return false

  const cfg      = question.matrixConfig
  const selected = getMatrixRowSelection(answer, rowId, cfg.subType || 'single')
  const colIds   = spec.matrixColumnIds || []
  if (!colIds.length) return false

  const mode = spec.conditionType
    || (spec.matchMode === 'all' ? 'all_of' : 'any_of')

  switch (mode) {
    case 'any_of':
    case 'any':
      return colIds.some(id => selected.includes(id))
    case 'none_of':
      return !colIds.some(id => selected.includes(id))
    case 'all_of':
    case 'all':
      return colIds.every(id => selected.includes(id))
    default:
      return false
  }
}
