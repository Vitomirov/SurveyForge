// ─── Termination Engine ─────────────────────────────────────────────────────
// Single source of truth for all screen-out logic used by the survey taker:
//  - termination blocks (page-level, multi-condition AND/OR)
//  - per-question termination rules + per-option instant terminates
//  - human-readable cause strings shown on the screen-out page
// Kept in utils (not the component) so the builder, preview and public
// taker all evaluate identical rules.

import { isChoiceType } from '@/utils/questionHelpers'

// ─── Termination block: single condition ────────────────────────────────────
function evalCondition(cond, responses, allItems) {
  const q      = allItems.find(i => i.id === cond.questionId)
  const answer = responses[cond.questionId]
  if (!q || answer === undefined || answer === null || answer === '') return false

  if (isChoiceType(q.questionType)) {
    const selected = Array.isArray(answer) ? answer : [answer]
    const ids = cond.optionIds || []
    switch (cond.conditionType) {
      case 'any_of': return ids.some(id => selected.includes(id))
      case 'none_of': return ids.length > 0 && !ids.some(id => selected.includes(id))
      case 'all_of':  return ids.length > 0 && ids.every(id => selected.includes(id))
      default: return false
    }
  }

  // text-based
  const hay    = String(answer).toLowerCase().trim()
  const needle = String(cond.textValue || '').toLowerCase().trim()
  switch (cond.textOperator) {
    case 'contains':     return hay.includes(needle)
    case 'not_contains': return !hay.includes(needle)
    case 'equals':       return hay === needle
    case 'not_equals':   return hay !== needle
    case 'greater_than': { const n = parseFloat(answer); return !isNaN(n) && n > parseFloat(cond.textValue) }
    case 'less_than':    { const n = parseFloat(answer); return !isNaN(n) && n < parseFloat(cond.textValue) }
    default: return false
  }
}

// AND has higher precedence than OR: A AND B OR C = (A AND B) OR C
export function evalBlock(block, responses, allItems) {
  const conds = block.conditions || []
  if (!conds.length) return false

  // Split into OR-separated groups (each group is AND-connected)
  const orGroups = [[]]
  for (const c of conds) {
    if (c.join === 'OR') orGroups.push([c])
    else orGroups[orGroups.length - 1].push(c)
  }
  return orGroups.some(g => g.length > 0 && g.every(c => evalCondition(c, responses, allItems)))
}

// ─── Per-question termination rule ──────────────────────────────────────────
function evaluateRule(rule, question, answer) {
  const ruleType = rule.ruleType || 'choice'

  if (ruleType === 'text') {
    if (answer === null || answer === undefined || answer === '') return false
    const haystack = String(answer).toLowerCase().trim()
    const needle   = String(rule.textValue || '').toLowerCase().trim()
    switch (rule.textOperator) {
      case 'contains':     return haystack.includes(needle)
      case 'not_contains': return !haystack.includes(needle)
      case 'equals':       return haystack === needle
      case 'not_equals':   return haystack !== needle
      case 'greater_than': { const n = parseFloat(answer); return !isNaN(n) && n > parseFloat(rule.textValue) }
      case 'less_than':    { const n = parseFloat(answer); return !isNaN(n) && n < parseFloat(rule.textValue) }
      default: return false
    }
  }

  // choice rule
  const qType = question.questionType
  if (qType === 'single_select' || qType === 'dropdown') {
    if (!answer) return false
    // matchMode 'any' = fire if selected option is among optionIds
    // matchMode 'all' is the same for single (only 1 selection possible)
    return rule.optionIds.includes(answer)
  }
  if (qType === 'multi_select') {
    const selected = Array.isArray(answer) ? answer : []
    if (!selected.length) return false
    if (rule.matchMode === 'all') {
      return rule.optionIds.length > 0 && rule.optionIds.every(id => selected.includes(id))
    }
    // 'any': fire if at least one of optionIds is selected
    return rule.optionIds.some(id => selected.includes(id))
  }
  return false
}

// Returns { terminated: boolean, cause?: string }
export function checkTermination(question, answer) {
  const qType  = question.questionType
  const opts   = question.options || []

  // ── 1. Per-option instant terminate (always if_any semantics, fires immediately) ──
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

  // ── 2. terminationRules evaluated with terminationLogic ──────────────────
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
    // if_none: terminate when no rule fires (respondent doesn't qualify)
    if (results.every(r => !r)) {
      return { terminated: true, cause: 'No qualifying condition met' }
    }
    return { terminated: false }
  }
}

// ─── Build readable cause string from a fired block ─────────────────────────
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
