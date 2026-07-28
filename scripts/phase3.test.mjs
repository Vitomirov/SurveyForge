/**
 * Phase 3 smoke tests — run with: npm run test:phase3
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildQuestionNumberById } from '../src/utils/questionHelpers.js'
import { resolvePipingTokens } from '../src/utils/piping.js'

test('buildQuestionNumberById assigns sequential numbers to questions only', () => {
  const items = [
    { id: 'q1', itemType: 'question' },
    { id: 'pb', itemType: 'page_break' },
    { id: 'q2', itemType: 'question' },
  ]
  const map = buildQuestionNumberById(items)
  assert.deepEqual(map, { q1: 1, q2: 2 })
})

test('resolvePipingTokens replaces answered question tokens', () => {
  const items = [
    {
      id: 'q1',
      itemType: 'question',
      questionType: 'open_text',
    },
  ]
  const text = 'Hello {{qid:q1}}!'
  const out = resolvePipingTokens(text, { q1: 'World' }, items)
  assert.equal(out, 'Hello World!')
})
