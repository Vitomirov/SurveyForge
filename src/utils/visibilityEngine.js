// ─── Visibility Evaluator ───────────────────────────────────────────────────
// Uses conditionEngine for all condition matching — same logic as termination
// blocks, so survey creators only need one mental model for AND/OR rules.

import { isChoiceType } from '@/utils/questionHelpers'
import { evalConditionSet } from '@/utils/conditionEngine'

/**
 * Returns true if `item` (a question, page_break, or group) should be
 * visible given the current `responses`. Items with no visibility config,
 * or visibility disabled, are always visible.
 */
export function isItemVisible(item, responses, allItems) {
  const vis = item?.visibility
  if (!vis || !vis.enabled || !vis.conditions?.length) return true

  const matched = evalConditionSet(vis.conditions, responses, allItems)
  return vis.mode === 'hide_if' ? !matched : matched
}

/**
 * Walks the flat `items` array and builds the respondent-facing page
 * structure, fully respecting:
 *  - page_break visibility (a hidden break merges its two pages into one)
 *  - group visibility (hides every question that belongs to a hidden group)
 *  - per-question visibility
 *
 * Returns { pages, blocksByPage } where `pages` is an array of question
 * arrays (one per page) and `blocksByPage[i]` is the termination blocks
 * that should be evaluated when the respondent leaves page i.
 *
 * Must be recomputed whenever `responses` changes, since visibility can
 * depend on answers given earlier in the survey.
 */
export function buildVisiblePages(items, responses) {
  // Pass 1: resolve visibility for every group, keyed by group id.
  const groupVisibility = {}
  items.forEach(item => {
    if (item.itemType === 'group') {
      groupVisibility[item.id] = isItemVisible(item, responses, items)
    }
  })

  const pagesArr  = [[]]
  const blocksArr = [[]]
  let currentGroupId = null

  for (const item of items) {
    if (item.itemType === 'group') {
      currentGroupId = item.id
      continue
    }

    if (item.itemType === 'page_break') {
      if (!isItemVisible(item, responses, items)) continue // merges into current page
      currentGroupId = null
      pagesArr.push([])
      blocksArr.push([])
      continue
    }

    if (item.itemType === 'termination_block') {
      blocksArr[blocksArr.length - 1].push(item)
      continue
    }

    // text_block — visible/hidden by same logic as questions
    if (item.itemType === 'text_block') {
      if (!isItemVisible(item, responses, items)) continue
      pagesArr[pagesArr.length - 1].push(item)
      continue
    }

    // question
    if (currentGroupId && groupVisibility[currentGroupId] === false) continue
    if (!isItemVisible(item, responses, items)) continue

    pagesArr[pagesArr.length - 1].push(item)
  }

  const filtered = pagesArr
    .map((p, i) => ({ p, b: blocksArr[i] || [] }))
    .filter(x => x.p.length > 0)

  return {
    pages:        filtered.map(x => x.p),
    blocksByPage: filtered.map(x => x.b),
  }
}

export function visibilitySummary(vis, allItems) {
  if (!vis?.enabled || !vis.conditions?.length) return null
  const verb = vis.mode === 'hide_if' ? 'Hidden if' : 'Shown only if'
  const parts = vis.conditions.map((c, i) => {
    const q = allItems.find(item => item.id === c.questionId)
    const qLabel = q ? `Q${allItems.filter(it => it.itemType === 'question').indexOf(q) + 1}` : '?'
    let condStr
    if (q && isChoiceType(q.questionType)) {
      const labels = (c.optionIds || []).map(id => q.options?.find(o => o.id === id)?.text || '?')
      condStr = `${qLabel} ${c.conditionType?.replace(/_/g, ' ')} [${labels.join(', ')}]`
    } else {
      condStr = `${qLabel} ${c.textOperator?.replace(/_/g, ' ') || ''} "${c.textValue || ''}"`
    }
    return i === 0 ? condStr : `${c.join} ${condStr}`
  })
  return `${verb}: ${parts.join(' ')}`
}
