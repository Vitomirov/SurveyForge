/**
 * Phase 4 smoke tests — run with: npm run test:phase4
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  updateItemById,
  patchItem,
  mapById,
  withItems,
} from '../src/store/reducerHelpers.js'

const baseState = {
  items: [],
  isDirty: false,
}

test('updateItemById keeps references for unchanged items', () => {
  const q1 = { id: 'q1', itemType: 'question', options: [{ id: 'o1', text: 'A' }] }
  const q2 = { id: 'q2', itemType: 'question', text: 'Other' }
  const items = [q1, q2]

  const next = updateItemById(items, 'q1', item => ({
    ...item,
    options: mapById(item.options, 'o1', o => patchItem(o, { text: 'B' })),
  }))

  assert.notEqual(next, items)
  assert.notEqual(next[0], q1)
  assert.equal(next[1], q2)
})

test('noop nested patch keeps top-level items reference', () => {
  const q1 = {
    id: 'q1',
    itemType: 'question',
    options: [{ id: 'o1', text: 'Same' }],
  }
  const q2 = { id: 'q2', itemType: 'question', text: 'Other' }
  const items = [q1, q2]

  const nextItems = updateItemById(items, 'q1', item => {
    const options = mapById(item.options, 'o1', o => patchItem(o, { text: 'Same' }))
    return options === item.options ? item : { ...item, options }
  })

  assert.equal(nextItems, items)
  assert.equal(nextItems[1], q2)
})

test('withItems skips update when items unchanged', () => {
  const state = { ...baseState, items: [] }
  assert.equal(withItems(state, state.items), state)
})

test('patchItem returns same object when values unchanged', () => {
  const option = { id: 'o1', text: 'Label' }
  assert.equal(patchItem(option, { text: 'Label' }), option)
})
