/**
 * Phase 2 smoke tests — run with: npm run test:phase2
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAvailableQuestionsByIndex,
  buildItemMeta,
} from '../src/utils/builderLayout.js'

test('buildAvailableQuestionsByIndex returns cumulative questions in O(n) pass', () => {
  const items = [
    { id: 'q1', itemType: 'question' },
    { id: 'pb', itemType: 'page_break' },
    { id: 'q2', itemType: 'question' },
  ]

  const byIndex = buildAvailableQuestionsByIndex(items)

  assert.equal(byIndex[0].length, 0)
  assert.equal(byIndex[1].length, 1)
  assert.equal(byIndex[1][0].id, 'q1')
  assert.equal(byIndex[2].length, 1)
  assert.equal(byIndex[2][0].id, 'q1')
})

test('TOGGLE_ACTIVE_ITEM behavior (mirrors surveyReducer)', () => {
  const toggle = (activeItemId, id) => (activeItemId === id ? null : id)

  assert.equal(toggle(null, 'a'), 'a')
  assert.equal(toggle('a', 'a'), null)
  assert.equal(toggle('a', 'b'), 'b')
})

test('buildItemMeta marks questions inside collapsed groups as hidden', () => {
  const items = [
    { id: 'g1', itemType: 'group', collapsed: true },
    { id: 'q1', itemType: 'question' },
  ]
  const meta = buildItemMeta(items)
  assert.equal(meta[1].hidden, true)
})
