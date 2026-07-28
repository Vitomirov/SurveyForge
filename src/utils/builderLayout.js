/**
 * Single-pass layout helpers for SurveyBuilder.
 * Precomputes per-item metadata used when rendering the item list.
 */

/**
 * @param {Array} items
 * @returns {Array<{ pageNum: number, questionNumber: number|null, currentGroupId: string|null, hidden: boolean }>}
 */
export function buildItemMeta(items) {
  let pageNum = 1
  let qNum = 0
  let currentGroupId = null

  const collapsedGroups = new Set(
    items.filter(i => i.itemType === 'group' && i.collapsed).map(i => i.id)
  )

  return items.map(item => {
    if (item.itemType === 'page_break') {
      pageNum++
      currentGroupId = null
      return { pageNum, questionNumber: null, currentGroupId, hidden: false }
    }
    if (item.itemType === 'group') {
      currentGroupId = item.id
      return { pageNum, questionNumber: null, currentGroupId: item.id, hidden: false }
    }
    qNum++
    const hidden = currentGroupId ? collapsedGroups.has(currentGroupId) : false
    return { pageNum, questionNumber: qNum, currentGroupId, hidden }
  })
}

/**
 * Questions appearing before each item index (for visibility / piping editors).
 * One O(n²) pass upfront instead of slice+filter per row on every render.
 *
 * @param {Array} items
 * @returns {Array<Array>}
 */
export function buildAvailableQuestionsByIndex(items) {
  const result = new Array(items.length)
  const questionsSoFar = []

  for (let i = 0; i < items.length; i++) {
    result[i] = questionsSoFar.slice()
    if (items[i].itemType === 'question') {
      questionsSoFar.push(items[i])
    }
  }

  return result
}

/**
 * @param {Array} items
 * @param {Array} itemMeta
 * @returns {Record<string, number>}
 */
export function buildGroupQuestionCounts(items, itemMeta) {
  const counts = {}
  items.forEach((item, i) => {
    if (item.itemType !== 'question') return
    const gid = itemMeta[i]?.currentGroupId
    if (gid) counts[gid] = (counts[gid] || 0) + 1
  })
  return counts
}
