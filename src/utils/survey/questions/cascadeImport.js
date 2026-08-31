/** Split clipboard / textarea text into non-empty trimmed lines. */
export function parsePasteLines(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

/** Collect an item id and all descendant ids (up to 3 levels). */
export function collectDescendantIds(items, rootId) {
  const toDelete = new Set([rootId])
  for (let pass = 0; pass < 2; pass++) {
    items.forEach(i => {
      if (toDelete.has(i.parentId)) toDelete.add(i.id)
    })
  }
  return toDelete
}

/** Remove items at a level under a parent; level-1 removals include descendants. */
export function removeLevelItems(items, level, parentId) {
  if (level === 0) {
    const toDelete = new Set()
    items.filter(i => i.level === 0).forEach(i => {
      collectDescendantIds(items, i.id).forEach(id => toDelete.add(id))
    })
    return items.filter(i => !toDelete.has(i.id))
  }

  if (level === 1) {
    const toDelete = new Set()
    items.filter(i => i.level === 1 && i.parentId === parentId).forEach(i => {
      collectDescendantIds(items, i.id).forEach(id => toDelete.add(id))
    })
    return items.filter(i => !toDelete.has(i.id))
  }

  return items.filter(i => !(i.level === 2 && i.parentId === parentId))
}

/**
 * Add pasted labels at a single cascade level.
 * @param {Function} makeItem - (label, level, parentId) => item
 */
export function bulkAddLevelItems(existingItems, labels, level, parentId, replaceExisting, makeItem) {
  let items = [...existingItems]
  if (replaceExisting) items = removeLevelItems(items, level, parentId)
  const newItems = labels.map(label => makeItem(label, level, parentId))
  return [...items, ...newItems]
}

/** Parse spreadsheet-style rows: tab- or comma-separated L1, L2, L3. */
export function parseTreePaste(text) {
  return parsePasteLines(text).map(line => {
    const sep = line.includes('\t') ? '\t' : ','
    const parts = line.split(sep).map(p => p.trim())
    return { l1: parts[0] || '', l2: parts[1] || '', l3: parts[2] || '' }
  })
}

/**
 * Build a full cascade tree from spreadsheet rows.
 * Deduplicates L1/L2 by label within parent; always appends new L3 labels.
 */
export function buildTreeFromRows(rows, makeItem, existingItems = [], replaceExisting = false) {
  let items = replaceExisting ? [] : [...existingItems]

  const l1ByLabel = new Map()
  const l2ByKey = new Map()

  if (!replaceExisting) {
    items.filter(i => i.level === 0).forEach(i => l1ByLabel.set(i.label.toLowerCase(), i.id))
    items.filter(i => i.level === 1).forEach(i => {
      const parent = items.find(p => p.id === i.parentId)
      if (parent) l2ByKey.set(`${parent.id}|${i.label.toLowerCase()}`, i.id)
    })
  }

  for (const { l1, l2, l3 } of rows) {
    if (!l1) continue

    let l1Id = l1ByLabel.get(l1.toLowerCase())
    if (!l1Id) {
      const item = makeItem(l1, 0, null)
      items.push(item)
      l1Id = item.id
      l1ByLabel.set(l1.toLowerCase(), l1Id)
    }

    if (!l2) continue

    const l2Key = `${l1Id}|${l2.toLowerCase()}`
    let l2Id = l2ByKey.get(l2Key)
    if (!l2Id) {
      const item = makeItem(l2, 1, l1Id)
      items.push(item)
      l2Id = item.id
      l2ByKey.set(l2Key, l2Id)
    }

    if (!l3) continue

    const exists = items.some(
      i => i.level === 2 && i.parentId === l2Id && i.label.toLowerCase() === l3.toLowerCase()
    )
    if (!exists) items.push(makeItem(l3, 2, l2Id))
  }

  return items
}
