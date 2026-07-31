// ─── Condition Engine ───────────────────────────────────────────────────────
// Single source of truth for evaluating survey conditions (visibility,
// termination blocks, and any future rule types). AND binds tighter than OR:
// A AND B OR C = (A AND B) OR C

import { isChoiceType } from '@/utils/questionHelpers'

/**
 * Match a text/numeric answer against an operator.
 * Used by visibility conditions, termination blocks, and per-question rules.
 */
export function evalTextOperator(answer, operator, textValue) {
  const hay    = String(answer).toLowerCase().trim()
  const needle = String(textValue || '').toLowerCase().trim()
  switch (operator) {
    case 'contains':     return hay.includes(needle)
    case 'not_contains': return !hay.includes(needle)
    case 'equals':       return hay === needle
    case 'not_equals':   return hay !== needle
    case 'greater_than': { const n = parseFloat(answer); return !isNaN(n) && n > parseFloat(textValue) }
    case 'less_than':    { const n = parseFloat(answer); return !isNaN(n) && n < parseFloat(textValue) }
    default: return false
  }
}

/**
 * Evaluate a single visibility/termination condition against current responses.
 */
function evalCondition(cond, responses, allItems) {
  const q      = allItems.find(i => i.id === cond.questionId)
  const answer = responses[cond.questionId]
  if (!q || answer === undefined || answer === null || answer === '') return false

  if (isChoiceType(q.questionType)) {
    const selected = Array.isArray(answer) ? answer : [answer]
    const ids = cond.optionIds || []
    switch (cond.conditionType) {
      case 'any_of':  return ids.some(id => selected.includes(id))
      case 'none_of': return ids.length > 0 && !ids.some(id => selected.includes(id))
      case 'all_of':  return ids.length > 0 && ids.every(id => selected.includes(id))
      default: return false
    }
  }

  return evalTextOperator(answer, cond.textOperator, cond.textValue)
}

/**
 * Evaluate a set of conditions combined with AND/OR precedence.
 */
export function evalConditionSet(conditions, responses, allItems) {
  if (!conditions || !conditions.length) return false
  const orGroups = [[]]
  for (const c of conditions) {
    if (c.join === 'OR') orGroups.push([c])
    else orGroups[orGroups.length - 1].push(c)
  }
  return orGroups.some(g => g.length > 0 && g.every(c => evalCondition(c, responses, allItems)))
}
