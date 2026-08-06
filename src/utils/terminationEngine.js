// ─── Termination Engine ─────────────────────────────────────────────────────
// Screen-out logic for the survey taker: per-question rules, instant option
// terminates, and termination blocks. Condition matching delegates to
// conditionEngine so visibility and termination share identical evaluators.

import { isChoiceType } from '@/utils/questionHelpers'
import { evalConditionSet, evalTextOperator } from '@/utils/conditionEngine'
import { evalMatrixSelection } from '@/utils/matrixHelpers'
import { getEffectiveOptions, resolveOptionLabel } from '@/utils/questionOptions'

/** Evaluate a termination block's conditions (AND/OR). */
export function evalBlock(block, responses, allItems) {
  return evalConditionSet(block.conditions, responses, allItems)
}

function resolveOptions(question, answer, responses, allItems) {
  if (question.pipedOptionsConfig?.enabled && allItems?.length) {
    return getEffectiveOptions(question, responses, allItems)
  }
  return question.options || []
}

// ─── Per-question termination rule ──────────────────────────────────────────
function evaluateRule(rule, question, answer, responses, allItems) {
  const ruleType = rule.ruleType || 'choice'

  if (ruleType === 'matrix') {
    return evalMatrixSelection(rule, question, answer)
  }

  if (ruleType === 'text') {
    if (answer === null || answer === undefined || answer === '') return false
    return evalTextOperator(answer, rule.textOperator, rule.textValue)
  }

  const qType = question.questionType
  const isPipedChoice = question.pipedOptionsConfig?.enabled

  if (qType === 'single_select' || qType === 'dropdown' || isPipedChoice) {
    if (!answer) return false
    return rule.optionIds.includes(answer)
  }
  if (qType === 'multi_select') {
    const selected = Array.isArray(answer) ? answer : []
    if (!selected.length) return false
    if (rule.matchMode === 'all') {
      return rule.optionIds.length > 0 && rule.optionIds.every(id => selected.includes(id))
    }
    return rule.optionIds.some(id => selected.includes(id))
  }
  return false
}

/** Returns { terminated: boolean, cause?: string } */
export function checkTermination(question, answer, responses = {}, allItems = []) {
  const qType = question.questionType
  const opts  = resolveOptions(question, answer, responses, allItems)
  const isPipedChoice = question.pipedOptionsConfig?.enabled

  // ── 1. Per-option instant terminate ─────────────────────────────────────
  if (isChoiceType(qType) || isPipedChoice) {
    if (qType === 'single_select' || qType === 'dropdown' || isPipedChoice) {
      if (answer) {
        const opt = opts.find(o => o.id === answer)
        if (opt?.terminates) return { terminated: true, cause: opt.text }
      }
    } else if (qType === 'multi_select') {
      const selected = Array.isArray(answer) ? answer : []
      const termOpt  = opts.find(o => selected.includes(o.id) && o.terminates)
      if (termOpt) return { terminated: true, cause: termOpt.text }
    }
  }

  // ── 2. terminationRules evaluated with terminationLogic ─────────────────
  const rules = question.terminationRules || []
  if (!rules.length) return { terminated: false }

  const logic   = question.terminationLogic || 'if_any'
  const results = rules.map(r => evaluateRule(r, question, answer, responses, allItems))

  if (logic === 'if_any') {
    const idx = results.findIndex(r => r)
    if (idx === -1) return { terminated: false }
    const firedRule = rules[idx]
    if (firedRule.ruleType === 'matrix') {
      const row = question.matrixConfig?.rows?.find(r => r.id === firedRule.matrixRowId)
      const cols = (firedRule.matrixColumnIds || []).map(id =>
        question.matrixConfig?.columns?.find(c => c.id === id)?.text || '?'
      )
      return {
        terminated: true,
        cause: firedRule.note || `${row?.text || 'Row'}: ${cols.join(', ')}`,
      }
    }
    return {
      terminated: true,
      cause: firedRule.note || (
        firedRule.ruleType === 'text'
          ? `Answer ${firedRule.textOperator?.replace(/_/g,' ')} "${firedRule.textValue}"`
          : `Rule ${idx + 1} matched`
      ),
    }
  } else {
    if (results.every(r => !r)) {
      return { terminated: true, cause: 'No qualifying condition met' }
    }
    return { terminated: false }
  }
}

/** Build readable cause string from a fired termination block. */
export function buildBlockCause(block, responses, allItems) {
  const conds = block.conditions || []
  return conds.map((c, i) => {
    const q = allItems.find(item => item.id === c.questionId)
    if (!q) return null
    const qLabel = q.text ? `"${q.text.slice(0, 40)}…"` : 'a question'
    let condStr
    if (q.questionType === 'matrix') {
      const rowLabel = q.matrixConfig?.rows?.find(r => r.id === c.matrixRowId)?.text || 'row'
      const colLabels = (c.matrixColumnIds || []).map(id =>
        q.matrixConfig?.columns?.find(col => col.id === id)?.text || '?'
      )
      condStr = `${qLabel} row "${rowLabel}" ${c.conditionType?.replace(/_/g, ' ') || ''} [${colLabels.join(', ')}]`
    } else if (isChoiceType(q.questionType) || q.pipedOptionsConfig?.enabled) {
      const labels = (c.optionIds || []).map(id => resolveOptionLabel(q, id, allItems))
      condStr = `${qLabel} ${c.conditionType?.replace(/_/g, ' ') || ''} [${labels.join(', ')}]`
    } else {
      condStr = `${qLabel} ${c.textOperator?.replace(/_/g, ' ') || ''} "${c.textValue}"`
    }
    return i === 0 ? condStr : `${c.join} ${condStr}`
  }).filter(Boolean).join(' ')
}
