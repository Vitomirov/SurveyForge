// ─── Termination Engine ─────────────────────────────────────────────────────
// Screen-out logic for the survey taker: per-question rules, instant option
// terminates, and termination blocks. Condition matching delegates to
// conditionEngine so visibility and termination share identical evaluators.

import { isChoiceType } from '@/utils/questionHelpers'
import { evalConditionSet, evalTextOperator } from '@/utils/conditionEngine'

/** Evaluate a termination block's conditions (AND/OR). */
export function evalBlock(block, responses, allItems) {
  return evalConditionSet(block.conditions, responses, allItems)
}

// ─── Per-question termination rule ──────────────────────────────────────────
function evaluateRule(rule, question, answer) {
  const ruleType = rule.ruleType || 'choice'

  if (ruleType === 'text') {
    if (answer === null || answer === undefined || answer === '') return false
    return evalTextOperator(answer, rule.textOperator, rule.textValue)
  }

  // choice rule
  const qType = question.questionType
  if (qType === 'single_select' || qType === 'dropdown') {
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
export function checkTermination(question, answer) {
  const qType  = question.questionType
  const opts   = question.options || []

  // ── 1. Per-option instant terminate ─────────────────────────────────────
  if (isChoiceType(qType)) {
    if (qType === 'single_select' || qType === 'dropdown') {
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
  const results = rules.map(r => evaluateRule(r, question, answer))

  if (logic === 'if_any') {
    const idx = results.findIndex(r => r)
    if (idx === -1) return { terminated: false }
    const firedRule = rules[idx]
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
    if (isChoiceType(q.questionType)) {
      const labels = (c.optionIds || []).map(id => q.options?.find(o => o.id === id)?.text || '?')
      condStr = `${qLabel} ${c.conditionType?.replace(/_/g, ' ') || ''} [${labels.join(', ')}]`
    } else {
      condStr = `${qLabel} ${c.textOperator?.replace(/_/g, ' ') || ''} "${c.textValue}"`
    }
    return i === 0 ? condStr : `${c.join} ${condStr}`
  }).filter(Boolean).join(' ')
}
