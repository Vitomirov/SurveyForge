/**
 * Structural-sharing helpers for surveyReducer.
 * Reuse array/object references when nested updates produce no change.
 */

/** @returns {number} */
export function findItemIndex(items, id) {
  return items.findIndex(i => i.id === id)
}

/** Replace one slot; return the same array when unchanged. */
function replaceItemAt(items, index, nextItem) {
  if (items[index] === nextItem) return items
  const next = items.slice()
  next[index] = nextItem
  return next
}

/** Update one top-level item by id. */
export function updateItemById(items, id, updater) {
  const idx = findItemIndex(items, id)
  if (idx === -1) return items
  return replaceItemAt(items, idx, updater(items[idx]))
}

/** Shallow merge; return the same item when patch changes nothing. */
export function patchItem(item, patch) {
  for (const key of Object.keys(patch)) {
    if (item[key] !== patch[key]) return { ...item, ...patch }
  }
  return item
}

/** Update one nested array element by id. */
export function mapById(arr, id, updater) {
  const idx = arr.findIndex(x => x.id === id)
  if (idx === -1) return arr
  const next = updater(arr[idx])
  if (next === arr[idx]) return arr
  const out = arr.slice()
  out[idx] = next
  return out
}

/** Map nested array; reuse when no element changed. */
export function mapArray(arr, mapper) {
  let changed = false
  const out = arr.map((el, i) => {
    const next = mapper(el, i)
    if (next !== el) changed = true
    return next
  })
  return changed ? out : arr
}

/** Apply patch to a nested object; reuse when unchanged. */
export function patchNested(obj, patch) {
  if (!obj) return { ...patch }
  for (const key of Object.keys(patch)) {
    if (obj[key] !== patch[key]) return { ...obj, ...patch }
  }
  return obj
}

/** Return dirty state only when items reference changed. */
export function withItems(state, items, extra = {}) {
  if (items === state.items && Object.keys(extra).length === 0) return state
  return { ...state, ...extra, items, isDirty: true }
}
