import { useState, useMemo } from 'react'
import {
  X, Play, PlayCircle, CheckCircle2, XCircle, Zap,
  ChevronRight, ChevronDown, AlertTriangle, Loader2,
  GitBranch, List, SkipForward,
} from 'lucide-react'
import { buildVisiblePages } from '@/utils/visibilityEngine'

// ═══════════════════════════════════════════════════════════════════════════
// BRANCH ANALYSIS
// Scans survey items and returns all detectable paths through the survey.
// ═══════════════════════════════════════════════════════════════════════════
function analyzeBranches(items) {
  const questions = items.filter(i => i.itemType === 'question')
  const blocks    = items.filter(i => i.itemType === 'termination_block')

  // Index question numbers
  const qIndex = {}
  questions.forEach((q, i) => { qIndex[q.id] = i + 1 })

  const branches = []

  // ── 1. Clean completion ─────────────────────────────────────────────────
  branches.push({
    id:          'complete',
    type:        'complete',
    icon:        'complete',
    label:       'Clean completion',
    description: 'Navigate every page without triggering any screen-out.',
    triggerDesc: null,
  })

  // ── 2. Per-option instant terminates ────────────────────────────────────
  questions.forEach(q => {
    const termOpts = (q.options || []).filter(o => o.terminates)
    termOpts.forEach(opt => {
      branches.push({
        id:               `opt-${q.id}-${opt.id}`,
        type:             'terminate-option',
        icon:             'option',
        label:            `Screen-out · Q${qIndex[q.id]}: "${clip(opt.text)}"`,
        description:      `Select the instantly-terminating option "${clip(opt.text)}" on Q${qIndex[q.id]}.`,
        triggerQuestionId: q.id,
        triggerOptionId:   opt.id,
        triggerDesc:      `Option: "${clip(opt.text)}"`,
      })
    })
  })

  // ── 3. terminationRules (if_any) ────────────────────────────────────────
  questions.forEach(q => {
    const rules = (q.terminationRules || []).filter(r =>
      (r.ruleType === 'choice' ? r.optionIds?.length : r.textValue) && r
    )
    if (!rules.length || q.terminationLogic !== 'if_any') return

    const rule = rules[0]
    branches.push({
      id:               `rule-${q.id}`,
      type:             'terminate-rule-any',
      icon:             'rule',
      label:            `Rule screen-out · Q${qIndex[q.id]}`,
      description:      `Satisfy the IF ANY termination rule on Q${qIndex[q.id]} "${clip(q.text)}".`,
      triggerQuestionId: q.id,
      triggerRuleId:    rule.id,
      triggerDesc:      ruleDesc(rule, q),
    })
  })

  // ── 4. terminationRules (if_none — qualifying fails) ────────────────────
  questions.forEach(q => {
    const rules = (q.terminationRules || []).filter(r => r.optionIds?.length || r.textValue)
    if (!rules.length || q.terminationLogic !== 'if_none') return

    branches.push({
      id:               `ifnone-${q.id}`,
      type:             'terminate-rule-none',
      icon:             'rule',
      label:            `Non-qualifying · Q${qIndex[q.id]}`,
      description:      `Answer Q${qIndex[q.id]} "${clip(q.text)}" without satisfying any qualifying condition.`,
      triggerQuestionId: q.id,
      triggerDesc:      'None of the qualifying conditions met',
    })
  })

  // ── 5. Termination blocks ────────────────────────────────────────────────
  blocks.forEach((block, bi) => {
    const conds = block.conditions || []
    if (!conds.length) return

    branches.push({
      id:            `block-${block.id}`,
      type:          'terminate-block',
      icon:          'block',
      label:         `Block · "${block.title || `Termination Block ${bi + 1}`}"`,
      description:   `Satisfy all conditions in "${block.title || 'Termination Block'}" to trigger this screen-out.`,
      triggerBlockId: block.id,
      triggerDesc:   `${conds.length} condition${conds.length !== 1 ? 's' : ''}`,
    })
  })

  // ── 6. Conditional visibility paths ──────────────────────────────────────
  items.forEach((item, idx) => {
    const vis = item.visibility
    if (!vis?.enabled || !vis.conditions?.length) return
    const label = item.itemType === 'question'
      ? `Q${qIndex[item.id]}: "${clip(item.text)}"`
      : item.itemType === 'group'
      ? `Group: "${clip(item.title || 'unnamed group')}"`
      : `Page break (page ${item.title || ''})`
    const modeLabel = vis.mode === 'hide_if' ? 'hidden' : 'visible'

    branches.push({
      id:          `vis-trigger-${item.id}`,
      type:        'visibility-trigger',
      icon:        'complete',
      label:       `Show ${modeLabel}: ${label}`,
      description: `Satisfy the visibility conditions so "${label}" is ${modeLabel}.`,
      triggerDesc: `${vis.conditions.length} condition${vis.conditions.length !== 1 ? 's' : ''} · ${vis.mode}`,
      visItemId:   item.id,
      visMode:     vis.mode,
    })
  })

  return branches
}

function clip(str, n = 40) {
  if (!str) return '(untitled)'
  return str.length > n ? str.slice(0, n) + '…' : str
}

function ruleDesc(rule, q) {
  if (rule.ruleType === 'text') {
    return `Answer ${rule.textOperator?.replace(/_/g, ' ')} "${rule.textValue}"`
  }
  const labels = (rule.optionIds || []).map(id =>
    q.options?.find(o => o.id === id)?.text || '?'
  )
  return `${rule.matchMode === 'all' ? 'ALL' : 'ANY'} of: ${labels.join(', ')}`
}

// ═══════════════════════════════════════════════════════════════════════════
// ANSWER GENERATION
// Produces a response map for the entire question set for a given branch.
// ═══════════════════════════════════════════════════════════════════════════
function safeAnswer(q, items) {
  switch (q.questionType) {
    case 'single_select':
    case 'dropdown': {
      const safe = (q.options || []).find(o => !o.terminates)
      return safe?.id || q.options?.[0]?.id || null
    }
    case 'multi_select': {
      const safe = (q.options || []).filter(o => !o.terminates)
      return (safe.length ? [safe[0].id] : [q.options?.[0]?.id]).filter(Boolean)
    }
    case 'open_text':    return 'Test response'
    case 'date':         return new Date().toISOString().split('T')[0]
    case 'slider': {
      const cfg = q.sliderConfig
      return cfg.defaultValue ?? cfg.min
    }
    case 'constant_sum': {
      const cfg  = q.constantSumConfig
      const n    = cfg.items.length
      const base = Math.floor(cfg.targetSum / n)
      const rem  = cfg.targetSum - base * n
      return Object.fromEntries(
        cfg.items.map((item, i) => [item.id, String(base + (i === 0 ? rem : 0))])
      )
    }
    case 'matrix': {
      const cfg = q.matrixConfig
      if (cfg.subType === 'single')
        return Object.fromEntries(cfg.rows.map(r => [r.id, cfg.columns[0]?.id]))
      return Object.fromEntries(cfg.rows.map(r => [r.id, [cfg.columns[0]?.id].filter(Boolean)]))
    }
    case 'bipolar_matrix': {
      const cfg = q.bipolarConfig
      return Object.fromEntries(cfg.rows.map(r => [r.id, {
        left:   cfg.leftColumns[0]?.id  || null,
        center: null,
        right:  cfg.rightColumns[0]?.id || null,
      }]))
    }
    case 'maxdiff': {
      const cfg   = q.maxDiffConfig
      const items = cfg.items || []
      if (items.length < 2) return {}
      const numTrials = cfg.trialsPerRespondent || Math.max(3, Math.ceil(2 * items.length / (cfg.itemsPerTrial || 4)))
      const ans = {}
      for (let t = 0; t < numTrials; t++) {
        const k     = Math.min(cfg.itemsPerTrial || 4, items.length)
        const slice = items.slice(t % items.length, t % items.length + k)
        ans[t] = { best: slice[0]?.id || null, worst: slice[slice.length - 1]?.id || null }
      }
      return ans
    }
    case 'card_sort': {
      const cfg     = q.cardSortConfig
      const firstCat = cfg.categories[0]?.id
      return {
        assignment: {
          uncategorized: [],
          ...Object.fromEntries(cfg.categories.map((c, ci) => [
            c.id, ci === 0 ? cfg.cards.map(cd => cd.id) : [],
          ])),
        },
      }
    }
    default: return null
  }
}

function triggerAnswer(q, branch, items) {
  switch (branch.type) {
    case 'terminate-option': {
      if (q.questionType === 'multi_select') return [branch.triggerOptionId]
      return branch.triggerOptionId
    }
    case 'terminate-rule-any': {
      const rule = (q.terminationRules || []).find(r => r.id === branch.triggerRuleId)
      if (!rule) return safeAnswer(q, items)
      if (rule.ruleType === 'text') {
        switch (rule.textOperator) {
          case 'contains':
          case 'equals':     return rule.textValue
          case 'not_contains': return 'completely unrelated answer'
          case 'not_equals': return `not ${rule.textValue}`
          case 'greater_than': return String(parseFloat(rule.textValue) + 1)
          case 'less_than':    return String(parseFloat(rule.textValue) - 1)
          default: return rule.textValue
        }
      }
      // choice rule
      if (rule.matchMode === 'all') {
        if (q.questionType === 'multi_select') return rule.optionIds
        return rule.optionIds[0] || safeAnswer(q, items)
      }
      if (q.questionType === 'multi_select') return [rule.optionIds[0]]
      return rule.optionIds[0] || safeAnswer(q, items)
    }
    case 'terminate-rule-none': {
      // Answer must match NONE of the qualifying rules
      const rules  = q.terminationRules || []
      const qualIds = new Set(rules.flatMap(r => r.optionIds || []))
      const nonQual = (q.options || []).find(o => !qualIds.has(o.id))
      if (q.questionType === 'multi_select')
        return nonQual ? [nonQual.id] : []
      return nonQual?.id || q.options?.[0]?.id || null
    }
    default: return safeAnswer(q, items)
  }
}

function blockTriggerAnswers(block, items) {
  const overrides = {}
  const conds = block.conditions || []

  // Group conditions by their AND/OR groups (OR splits)
  // To trigger the block we need to satisfy ONE complete OR-group.
  // We satisfy the first group (all AND-connected conditions in it).
  const firstGroup = []
  for (const c of conds) {
    if (c.join === 'OR' && firstGroup.length > 0) break
    firstGroup.push(c)
  }

  firstGroup.forEach(cond => {
    const q = items.find(i => i.id === cond.questionId)
    if (!q) return
    const isSingle = ['single_select', 'dropdown'].includes(q.questionType)
    const isMulti  = q.questionType === 'multi_select'
    const isText   = q.questionType === 'open_text'

    if (isSingle || isMulti) {
      if (cond.conditionType === 'any_of') {
        overrides[q.id] = isMulti ? [cond.optionIds[0]] : cond.optionIds[0]
      } else if (cond.conditionType === 'all_of') {
        overrides[q.id] = isMulti ? cond.optionIds : cond.optionIds[0]
      } else if (cond.conditionType === 'none_of') {
        const safe = q.options.find(o => !cond.optionIds.includes(o.id))
        overrides[q.id] = isMulti ? (safe ? [safe.id] : []) : safe?.id || null
      }
    } else if (isText) {
      switch (cond.textOperator) {
        case 'contains':
        case 'equals':       overrides[q.id] = cond.textValue; break
        case 'not_contains': overrides[q.id] = 'unrelated answer'; break
        case 'not_equals':   overrides[q.id] = `not ${cond.textValue}`; break
        case 'greater_than': overrides[q.id] = String(parseFloat(cond.textValue) + 1); break
        case 'less_than':    overrides[q.id] = String(parseFloat(cond.textValue) - 1); break
        default:             overrides[q.id] = cond.textValue
      }
    }
  })

  return overrides
}

function buildResponses(items, branch) {
  const questions = items.filter(i => i.itemType === 'question')

  // For block branch, get the overrides first
  const blockOverrides = branch.type === 'terminate-block'
    ? blockTriggerAnswers(
        items.find(i => i.id === branch.triggerBlockId),
        items
      )
    : {}

  const responses = {}
  questions.forEach(q => {
    if (blockOverrides[q.id] !== undefined) {
      responses[q.id] = blockOverrides[q.id]
    } else if (branch.triggerQuestionId === q.id) {
      responses[q.id] = triggerAnswer(q, branch, items)
    } else {
      responses[q.id] = safeAnswer(q, items)
    }
  })
  return responses
}

// ═══════════════════════════════════════════════════════════════════════════
// TERMINATION EVALUATORS  (mirror of SurveyPreview logic)
// ═══════════════════════════════════════════════════════════════════════════
function evalCond(cond, responses, items) {
  const q      = items.find(i => i.id === cond.questionId)
  const answer = responses[cond.questionId]
  if (!q || answer == null || answer === '') return false

  const isChoice = ['single_select', 'multi_select', 'dropdown'].includes(q.questionType)
  if (isChoice) {
    const sel = Array.isArray(answer) ? answer : [answer]
    const ids = cond.optionIds || []
    if (cond.conditionType === 'any_of') return ids.some(id => sel.includes(id))
    if (cond.conditionType === 'none_of') return ids.length > 0 && !ids.some(id => sel.includes(id))
    if (cond.conditionType === 'all_of')  return ids.length > 0 && ids.every(id => sel.includes(id))
    return false
  }

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

function evalBlock(block, responses, items) {
  const conds = block.conditions || []
  if (!conds.length) return false
  const orGroups = [[]]
  for (const c of conds) {
    if (c.join === 'OR') orGroups.push([c])
    else orGroups[orGroups.length - 1].push(c)
  }
  return orGroups.some(g => g.length > 0 && g.every(c => evalCond(c, responses, items)))
}

function checkQTermination(q, answer) {
  const opts = q.options || []

  // Per-option instant terminate
  if (['single_select', 'dropdown'].includes(q.questionType) && answer) {
    const opt = opts.find(o => o.id === answer)
    if (opt?.terminates) return { terminated: true, reason: `Option "${clip(opt.text)}" is marked instant screen-out` }
  }
  if (q.questionType === 'multi_select' && Array.isArray(answer)) {
    const termOpt = opts.find(o => answer.includes(o.id) && o.terminates)
    if (termOpt) return { terminated: true, reason: `Option "${clip(termOpt.text)}" is marked instant screen-out` }
  }

  // terminationRules
  const rules = q.terminationRules || []
  if (!rules.length) return { terminated: false }

  const logic   = q.terminationLogic || 'if_any'
  const results = rules.map(r => evalRuleQ(r, q, answer))

  if (logic === 'if_any') {
    const idx = results.findIndex(r => r)
    if (idx === -1) return { terminated: false }
    return { terminated: true, reason: `IF ANY rule fired: ${ruleDesc(rules[idx], q)}` }
  } else {
    if (results.every(r => !r)) {
      return { terminated: true, reason: `IF NONE: no qualifying condition met` }
    }
    return { terminated: false }
  }
}

function evalRuleQ(rule, q, answer) {
  if (rule.ruleType === 'text') {
    if (!answer) return false
    const hay    = String(answer).toLowerCase()
    const needle = String(rule.textValue || '').toLowerCase()
    switch (rule.textOperator) {
      case 'contains':     return hay.includes(needle)
      case 'not_contains': return !hay.includes(needle)
      case 'equals':       return hay === needle
      case 'not_equals':   return hay !== needle
      case 'greater_than': return parseFloat(answer) > parseFloat(rule.textValue)
      case 'less_than':    return parseFloat(answer) < parseFloat(rule.textValue)
      default: return false
    }
  }
  const sel = Array.isArray(answer) ? answer : (answer ? [answer] : [])
  const ids = rule.optionIds || []
  if (rule.matchMode === 'all') return ids.length > 0 && ids.every(id => sel.includes(id))
  return ids.some(id => sel.includes(id))
}

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION ENGINE
// Walks page-by-page, logging every decision and checking termination.
// ═══════════════════════════════════════════════════════════════════════════
function runSimulation(items, survey, branch) {
  const responses = buildResponses(items, branch)
  const log       = []

  // Build pages exactly as the respondent would see them — fully respecting
  // conditional show/hide logic on questions, page breaks, and groups.
  const { pages, blocksByPage: blockMap } = buildVisiblePages(items, responses)

  const allQuestions = items.filter(i => i.itemType === 'question')
  const getQNum      = id => allQuestions.findIndex(q => q.id === id) + 1

  // How many questions are hidden by visibility rules
  const visibleQIds = new Set(pages.flatMap(p => p.filter(i => i.itemType === 'question').map(i => i.id)))
  const hiddenQCount = allQuestions.filter(q => !visibleQIds.has(q.id)).length
  if (hiddenQCount > 0) {
    log.push({ type: 'nav', label: `${hiddenQCount} question${hiddenQCount !== 1 ? 's' : ''} hidden by conditional visibility rules` })
  }

  let outcome = null

  for (let p = 0; p < pages.length; p++) {
    const pageQ     = pages[p].filter(i => i.itemType === 'question')
    const pageBlocks = blockMap[p] || []
    const pageLabel  = pages.length > 1 ? `Page ${p + 1}` : 'Survey'

    // Log answers on this page
    if (pageQ.length > 0) {
      log.push({
        type:  'page',
        label: pageLabel,
        items: pageQ.map(q => ({
          qNum:    getQNum(q.id),
          text:    clip(q.text) || '(untitled)',
          answer:  formatAnswer(q, responses[q.id]),
          qType:   q.questionType,
        })),
      })
    }

    // Check per-question termination
    for (const q of pageQ) {
      const result = checkQTermination(q, responses[q.id])
      if (result.terminated) {
        log.push({ type: 'terminate', source: `Q${getQNum(q.id)}: "${clip(q.text)}"`, reason: result.reason })
        outcome = { type: 'terminated', source: `Q${getQNum(q.id)}`, reason: result.reason }
        return { outcome, log, responses }
      }
    }

    // Check termination blocks
    for (const block of pageBlocks) {
      if (block.conditions?.length && evalBlock(block, responses, items)) {
        const reason = `Conditions satisfied in "${block.title || 'Termination Block'}"`
        log.push({ type: 'terminate', source: `Block: ${block.title || 'Termination Block'}`, reason })
        outcome = { type: 'terminated', source: `Block`, reason }
        return { outcome, log, responses }
      } else if (block.conditions?.length) {
        log.push({ type: 'block-pass', label: block.title || 'Termination Block' })
      }
    }

    if (p < pages.length - 1) {
      log.push({ type: 'nav', label: `Advanced to page ${p + 2}` })
    }
  }

  outcome = { type: 'complete' }
  log.push({ type: 'complete', label: 'Survey completed successfully' })
  return { outcome, log, responses }
}

function formatAnswer(q, answer) {
  if (answer === null || answer === undefined) return '(no answer)'
  switch (q.questionType) {
    case 'single_select':
    case 'dropdown': {
      const opt = q.options?.find(o => o.id === answer)
      return opt?.text ? `"${clip(opt.text, 30)}"` : String(answer)
    }
    case 'multi_select': {
      const labels = (Array.isArray(answer) ? answer : []).map(id =>
        `"${clip(q.options?.find(o => o.id === id)?.text || id, 20)}"`
      )
      return labels.join(', ') || '(none)'
    }
    case 'open_text': return `"${clip(String(answer), 40)}"`
    case 'slider':    return String(answer)
    case 'date':      return answer
    case 'constant_sum': {
      const cfg = q.constantSumConfig
      const parts = (cfg?.items || []).map(i => `${clip(i.label, 15)}: ${answer[i.id] || 0}`)
      return parts.join(' · ')
    }
    case 'maxdiff': {
      const keys = Object.keys(answer || {})
      return `${keys.length} trial${keys.length !== 1 ? 's' : ''} answered`
    }
    case 'card_sort': return 'Cards assigned'
    case 'matrix':    return `${Object.keys(answer || {}).length} rows answered`
    case 'bipolar_matrix': return `${Object.keys(answer || {}).length} rows answered`
    default: return String(answer)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function BranchIcon({ type, size = 16 }) {
  if (type === 'complete')     return <CheckCircle2 size={size} className="text-emerald-500" />
  if (type === 'block')        return <Zap size={size} className="text-rose-500" />
  if (type.startsWith('terminate')) return <XCircle size={size} className="text-rose-400" />
  return <GitBranch size={size} className="text-ink-400" />
}

function LogEntry({ entry }) {
  switch (entry.type) {
    case 'page':
      return (
        <div className="mb-3">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <SkipForward size={11} /> {entry.label}
          </p>
          <div className="space-y-1 ml-4">
            {entry.items.map((item, i) => (
              <div key={i} className="flex items-baseline gap-2 text-xs">
                <span className="shrink-0 text-ink-400 font-mono w-6">Q{item.qNum}</span>
                <span className="text-ink-600 truncate max-w-[160px]">{item.text}</span>
                <ChevronRight size={10} className="text-ink-300 shrink-0" />
                <span className="text-brand-700 font-medium flex-1">{item.answer}</span>
              </div>
            ))}
          </div>
        </div>
      )
    case 'nav':
      return (
        <p className="text-xs text-ink-400 flex items-center gap-1.5 my-2">
          <ChevronDown size={11} /> {entry.label}
        </p>
      )
    case 'block-pass':
      return (
        <p className="text-xs text-emerald-600 flex items-center gap-1.5 my-1">
          <CheckCircle2 size={11} /> Block "{entry.label}" — conditions not met, continuing
        </p>
      )
    case 'terminate':
      return (
        <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
          <p className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
            <XCircle size={14} /> Screen-out triggered
          </p>
          <p className="text-xs text-rose-600 mt-1">At: {entry.source}</p>
          <p className="text-xs text-rose-500 mt-0.5 italic">{entry.reason}</p>
        </div>
      )
    case 'complete':
      return (
        <div className="mt-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Survey completed
          </p>
          <p className="text-xs text-emerald-600 mt-1">All pages answered, no termination triggered.</p>
        </div>
      )
    default: return null
  }
}

function AllResultsTable({ results }) {
  return (
    <div>
      <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">All branches — results</p>
      <div className="space-y-2">
        {results.map(({ branch, outcome }) => (
          <div key={branch.id}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              outcome.type === 'complete'    ? 'border-emerald-200 bg-emerald-50' :
              outcome.type === 'terminated'  ? 'border-rose-200 bg-rose-50' :
                                              'border-ink-200 bg-ink-50'
            }`}
          >
            <BranchIcon type={outcome.type === 'complete' ? 'complete' : 'terminate-option'} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-700 truncate">{branch.label}</p>
              <p className="text-xs text-ink-500">{outcome.reason || (outcome.type === 'complete' ? 'Completed ✓' : '—')}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              outcome.type === 'complete' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {outcome.type === 'complete' ? 'Complete' : 'Screen-out'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export function SurveyTestRunner({ survey, items, onClose }) {
  const branches = useMemo(() => analyzeBranches(items), [items])
  const [selectedId, setSelectedId]       = useState(branches[0]?.id)
  const [result, setResult]               = useState(null)
  const [isRunning, setIsRunning]         = useState(false)
  const [showAllResults, setShowAllResults] = useState(false)

  const selectedBranch = branches.find(b => b.id === selectedId)
  const questionCount  = items.filter(i => i.itemType === 'question').length
  const pageCount      = items.filter(i => i.itemType === 'page_break').length + 1

  const runBranch = (branch) => {
    setIsRunning(true)
    setShowAllResults(false)
    setTimeout(() => {
      const sim = runSimulation(items, survey, branch)
      setResult(sim)
      setIsRunning(false)
    }, 300)
  }

  const runAll = () => {
    setIsRunning(true)
    setShowAllResults(false)
    setTimeout(() => {
      const results = branches.map(b => ({ branch: b, ...runSimulation(items, survey, b) }))
      setResult({ allResults: results })
      setShowAllResults(true)
      setIsRunning(false)
    }, 400)
  }

  const noBranches = branches.length <= 1

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <PlayCircle size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-ink-800">Survey Test Runner</h2>
            <p className="text-xs text-ink-400">
              {survey.title || 'Untitled Survey'} · {questionCount} question{questionCount !== 1 ? 's' : ''} · {pageCount} page{pageCount !== 1 ? 's' : ''} · {branches.length} branch{branches.length !== 1 ? 'es' : ''} detected
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-100 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* ── Left: Branch selector ─────────────────────────────────── */}
          <div className="w-72 shrink-0 border-r border-ink-100 flex flex-col">
            <div className="px-4 py-3 border-b border-ink-100">
              <p className="text-xs font-bold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch size={11} /> Detected branches
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {noBranches && (
                <div className="p-3 text-xs text-ink-400 italic">
                  No conditional logic found. Only the clean completion path is available.
                  Add termination rules or termination blocks to see more branches.
                </div>
              )}
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedId(b.id); setResult(null) }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border ${
                    selectedId === b.id
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-transparent hover:bg-ink-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0"><BranchIcon type={b.icon} size={14} /></div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${selectedId === b.id ? 'text-brand-700' : 'text-ink-700'}`}>
                        {b.label}
                      </p>
                      <p className="text-xs text-ink-400 leading-snug mt-0.5 line-clamp-2">{b.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* ── Actions ───────────────────────────────────────────── */}
            <div className="p-3 border-t border-ink-100 space-y-2 shrink-0">
              <button
                onClick={() => selectedBranch && runBranch(selectedBranch)}
                disabled={isRunning || !selectedBranch}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
              >
                {isRunning ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                Run selected branch
              </button>
              <button
                onClick={runAll}
                disabled={isRunning}
                className="w-full flex items-center justify-center gap-2 border border-ink-200 hover:bg-ink-50 disabled:opacity-50 text-ink-600 text-sm font-medium px-4 py-2 rounded-xl transition-all"
              >
                <List size={14} />
                Run all {branches.length} branches
              </button>
            </div>
          </div>

          {/* ── Right: Simulation log ─────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-5 min-h-0">
            {/* Branch detail header */}
            {selectedBranch && !showAllResults && (
              <div className={`flex items-start gap-3 p-4 rounded-xl border mb-4 ${
                selectedBranch.type === 'complete'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}>
                <BranchIcon type={selectedBranch.icon} size={18} />
                <div>
                  <p className="text-sm font-bold text-ink-800">{selectedBranch.label}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{selectedBranch.description}</p>
                  {selectedBranch.triggerDesc && (
                    <p className="text-xs font-mono bg-white/70 rounded px-2 py-0.5 mt-1.5 inline-block text-ink-600 border border-black/10">
                      Trigger: {selectedBranch.triggerDesc}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!result && !isRunning && (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <PlayCircle size={36} className="text-ink-200 mb-3" />
                <p className="text-sm font-semibold text-ink-500">Select a branch and click Run</p>
                <p className="text-xs text-ink-400 mt-1">The engine will auto-fill answers and walk through the survey</p>
              </div>
            )}

            {/* Loading */}
            {isRunning && (
              <div className="flex flex-col items-center justify-center h-48">
                <Loader2 size={28} className="text-brand-400 animate-spin mb-3" />
                <p className="text-sm text-ink-500">Simulating survey flow…</p>
              </div>
            )}

            {/* All results */}
            {!isRunning && showAllResults && result?.allResults && (
              <AllResultsTable results={result.allResults} />
            )}

            {/* Single run log */}
            {!isRunning && result && !showAllResults && (
              <div>
                {/* Outcome banner */}
                {result.outcome?.type === 'complete' && (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    <div>
                      <p className="text-sm font-bold text-emerald-700">Outcome: Completed ✓</p>
                      <p className="text-xs text-emerald-600">Respondent reached the end of the survey.</p>
                    </div>
                  </div>
                )}
                {result.outcome?.type === 'terminated' && (
                  <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl mb-4">
                    <XCircle size={20} className="text-rose-500" />
                    <div>
                      <p className="text-sm font-bold text-rose-700">Outcome: Screen-out ✗</p>
                      <p className="text-xs text-rose-500 mt-0.5">{result.outcome.reason}</p>
                    </div>
                  </div>
                )}

                {/* Step-by-step log */}
                <div className="border border-ink-100 rounded-xl p-4 bg-ink-50/40">
                  <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3">Step-by-step log</p>
                  {result.log?.map((entry, i) => (
                    <LogEntry key={i} entry={entry} />
                  ))}
                </div>

                {/* Generated responses reference */}
                <details className="mt-4">
                  <summary className="text-xs text-ink-400 cursor-pointer hover:text-ink-600 font-medium">
                    View all auto-generated answers ({Object.keys(result.responses || {}).length} questions)
                  </summary>
                  <div className="mt-2 text-xs font-mono bg-ink-900 text-ink-100 rounded-xl p-4 overflow-x-auto max-h-64 overflow-y-auto">
                    <pre>{JSON.stringify(result.responses, null, 2)}</pre>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
