// ─── Piping utilities ───────────────────────────────────────────────────────
// Two features share this module:
//   1. Text piping   — {{qid:ID}} or {{qid:ID:ROW_ID}} tokens in question/block text
//   2. Option piping — dynamic option list built from a source question's selections

import {
  formatMatrixAnswer,
  formatMatrixRowAnswer,
} from '@/utils/matrixHelpers'

function resolveMatrixPipeMode(cfg) {
  return cfg.matrixPipeMode || (cfg.matrixRowId ? 'columns' : 'rows')
}

/**
 * Static catalog of options a piped question will expose (builder-time).
 * IDs match runtime piped options so rules bind correctly.
 */
export function getPipedOptionCatalog(sourceQ, pipeCfg) {
  if (!sourceQ) return []

  if (sourceQ.questionType === 'matrix') {
    const mode = resolveMatrixPipeMode(pipeCfg)
    if (mode === 'rows') {
      return (sourceQ.matrixConfig?.rows || []).map(row => ({
        id: row.id,
        text: row.text,
        terminates: false,
      }))
    }
    return (sourceQ.matrixConfig?.columns || []).map(col => ({
      id: col.id,
      text: col.text,
      terminates: false,
    }))
  }

  if (sourceQ.questionType === 'image_choice_single' || sourceQ.questionType === 'image_choice_multi') {
    return (sourceQ.imageChoiceConfig?.imageOptions || []).map(o => ({
      id: o.id,
      text: o.text,
      terminates: o.terminates || false,
    }))
  }

  return sourceQ.options || []
}

// ─── Format a single answer for display in piped text ─────────────────────
function formatPipedAnswer(question, answer) {
  if (answer == null || answer === '') return '[not yet answered]'

  switch (question?.questionType) {
    case 'single_select':
    case 'dropdown': {
      const opt = question.options?.find(o => o.id === answer)
      return opt?.text || String(answer)
    }
    case 'multi_select': {
      const sel    = Array.isArray(answer) ? answer : [answer]
      const labels = sel
        .map(id => question.options?.find(o => o.id === id)?.text)
        .filter(Boolean)
      return labels.length ? labels.join(', ') : String(answer)
    }
    case 'open_text':
    case 'nps':
    case 'slider':
    case 'star_rating':  return String(answer)
    case 'ranking': {
      const cfg   = question.rankingConfig
      const order = Array.isArray(answer) ? answer : []
      return order
        .map((id, i) => {
          const item = cfg?.items?.find(it => it.id === id)
          return item?.text ? `${i + 1}. ${item.text}` : null
        })
        .filter(Boolean)
        .join(', ')
    }
    case 'constant_sum': {
      const cfg  = question.constantSumConfig
      const vals = answer || {}
      return (cfg?.items || [])
        .map(item => `${item.label}: ${vals[item.id] || 0}`)
        .join(', ')
    }
    case 'matrix':
      return formatMatrixAnswer(question, answer)
    default:
      if (typeof answer === 'object') return JSON.stringify(answer)
      return String(answer)
  }
}

// ─── Resolve all piping tokens in a text string ───────────────────────────
export function resolvePipingTokens(text, responses, items) {
  if (!text || !text.includes('{{qid:')) return text
  return text.replace(/\{\{qid:([^}:]+)(?::([^}]+))?\}\}/g, (match, questionId, rowId) => {
    const question = items.find(i => i.id === questionId && i.itemType === 'question')
    if (!question) return match
    const answer = responses[questionId]
    if (rowId && question.questionType === 'matrix') {
      return formatMatrixRowAnswer(question, answer, rowId)
    }
    return formatPipedAnswer(question, answer)
  })
}

export function makeToken(questionId, rowId = null) {
  return rowId ? `{{qid:${questionId}:${rowId}}}` : `{{qid:${questionId}}}`
}

// ─── Option piping: build dynamic options from source question's answers ──
export function buildPipedOptions(question, responses, items) {
  const cfg = question.pipedOptionsConfig
  if (!cfg?.enabled || !cfg.sourceQuestionId) return question.options || []

  const sourceQ = items.find(i => i.id === cfg.sourceQuestionId && i.itemType === 'question')
  if (!sourceQ) return []

  if (sourceQ.questionType === 'matrix') {
    const mode = resolveMatrixPipeMode(cfg)

    // Pipe matrix rows (e.g. Modul A, Modul B) as downstream options
    if (mode === 'rows') {
      return getPipedOptionCatalog(sourceQ, cfg)
    }

    // Pipe column selections from a specific matrix row
    const rowId = cfg.matrixRowId
    if (!rowId) return getPipedOptionCatalog(sourceQ, { ...cfg, matrixPipeMode: 'rows' })

    const answer = responses[cfg.sourceQuestionId]
    if (!answer) return []

    const rowAnswer = answer[rowId]
    if (rowAnswer === null || rowAnswer === undefined) return []

    const colIds = Array.isArray(rowAnswer) ? rowAnswer : [rowAnswer]
    return colIds
      .map(id => {
        const col = sourceQ.matrixConfig?.columns?.find(c => c.id === id)
        return col ? { id: col.id, text: col.text, terminates: false } : null
      })
      .filter(Boolean)
  }

  const answer = responses[cfg.sourceQuestionId]
  if (!answer) return []

  const selectedIds = Array.isArray(answer) ? answer : [answer]

  return selectedIds
    .map(id => sourceQ.options?.find(o => o.id === id))
    .filter(Boolean)
}

const PIPEABLE_SOURCE_TYPES = [
  'single_select',
  'multi_select',
  'dropdown',
  'image_choice_single',
  'image_choice_multi',
  'matrix',
]

export function isPipeableSource(questionType) {
  return PIPEABLE_SOURCE_TYPES.includes(questionType)
}

export function isMatrixPipeSource(sourceQ) {
  return sourceQ?.questionType === 'matrix'
}

export function getMatrixPipeModeLabel(mode) {
  return mode === 'columns' ? 'column selections from a row' : 'matrix rows'
}
