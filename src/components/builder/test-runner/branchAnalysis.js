// ═══════════════════════════════════════════════════════════════════════════
// BRANCH ANALYSIS
// Scans survey items and returns all detectable paths through the survey.
// ═══════════════════════════════════════════════════════════════════════════

export function clip(str, n = 40) {
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

export function analyzeBranches(items) {
  const questions = items.filter(i => i.itemType === 'question')
  const blocks    = items.filter(i => i.itemType === 'termination_block')

  const qIndex = {}
  questions.forEach((q, i) => { qIndex[q.id] = i + 1 })

  const branches = []

  branches.push({
    id:          'complete',
    type:        'complete',
    icon:        'complete',
    label:       'Clean completion',
    description: 'Navigate every page without triggering any screen-out.',
    triggerDesc: null,
  })

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

  items.forEach((item) => {
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
