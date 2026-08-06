// ─── Visibility Evaluator ───────────────────────────────────────────────────
// Uses conditionEngine for all condition matching — same logic as termination
// blocks, so survey creators only need one mental model for AND/OR rules.

import { isChoiceType, buildQuestionNumberById } from '@/utils/questionHelpers'
import { evalConditionSet } from '@/utils/conditionEngine'
import {
  formatConditionPhraseBlockStyle,
  joinConditionPhrasesInline,
} from '@/utils/conditionSummary'

/**
 * Returns true if `item` (a question, page_break, or group) should be
 * visible given the current `responses`. Items with no visibility config,
 * or visibility disabled, are always visible.
 */
function isItemVisible(item, responses, allItems) {
  const vis = item?.visibility
  if (!vis || !vis.enabled || !vis.conditions?.length) return true

  const matched = evalConditionSet(vis.conditions, responses, allItems)
  return vis.mode === 'hide_if' ? !matched : matched
}

/**
 * Termination blocks evaluate when the respondent leaves the page that holds
 * the questions they reference — not an empty page created by a page break
 * placed between the questions and the block.
 */
function terminationBlockTargetIndex(pagesArr) {
  for (let i = pagesArr.length - 1; i >= 0; i--) {
    if (pagesArr[i].some(it => it.itemType === 'question')) return i
  }
  return Math.max(0, pagesArr.length - 1)
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
      const targetIdx = terminationBlockTargetIndex(pagesArr)
      blocksArr[targetIdx].push(item)
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

  const qNumById = buildQuestionNumberById(allItems)
  const itemById = {}
  for (const item of allItems) itemById[item.id] = item

  const verb = vis.mode === 'hide_if' ? 'Hidden if' : 'Shown only if'
  const phrases = vis.conditions.map(c => {
    const q = itemById[c.questionId]
    const qLabel = q ? `Q${qNumById[q.id] ?? '?'}` : '?'
    return formatConditionPhraseBlockStyle(c, q, allItems, qLabel)
  })
  const parts = joinConditionPhrasesInline(vis.conditions, phrases)
  return `${verb}: ${parts}`
}

/** Visible page index for content after `targetPageBreakId` (`__start__` → 0). */
export function findPageIndexForBreak(items, responses, targetPageBreakId, pages) {
  if (!targetPageBreakId || targetPageBreakId === '__start__') return 0
  if (!pages?.length) return null

  const groupVisibility = {}
  items.forEach(item => {
    if (item.itemType === 'group') {
      groupVisibility[item.id] = isItemVisible(item, responses, items)
    }
  })

  let afterTarget = false
  let currentGroupId = null

  for (const item of items) {
    if (item.itemType === 'group') {
      currentGroupId = item.id
      continue
    }

    if (item.itemType === 'page_break') {
      if (!isItemVisible(item, responses, items)) continue
      if (item.id === targetPageBreakId) {
        afterTarget = true
        currentGroupId = null
        continue
      }
      if (afterTarget) break
      currentGroupId = null
      continue
    }

    if (!afterTarget) continue
    if (item.itemType === 'termination_block') continue

    if (item.itemType === 'text_block') {
      if (!isItemVisible(item, responses, items)) continue
      const idx = pages.findIndex(page => page.some(p => p.id === item.id))
      return idx >= 0 ? idx : null
    }

    if (item.itemType === 'question') {
      if (currentGroupId && groupVisibility[currentGroupId] === false) continue
      if (!isItemVisible(item, responses, items)) continue
      const idx = pages.findIndex(page => page.some(p => p.id === item.id))
      return idx >= 0 ? idx : null
    }
  }

  return null
}
