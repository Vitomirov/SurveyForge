/**
 * Branch + external redirect rule evaluation tests
 * Run: node --test scripts/question-rule-target.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveQuestionRuleTarget } from '../src/utils/resolveQuestionRuleTarget.js'
import { resolveExternalRedirectUrl } from '../src/utils/externalRedirectEngine.js'

const optA = 'opt_a'
const optB = 'opt_b'

const question = {
  id: 'q1',
  itemType: 'question',
  questionType: 'single_select',
  options: [
    { id: optA, text: 'Yes' },
    { id: optB, text: 'No' },
  ],
}

test('if_any returns first matching rule target', () => {
  const rules = [
    { id: 'r1', ruleType: 'choice', optionIds: [optB], matchMode: 'any' },
    { id: 'r2', ruleType: 'choice', optionIds: [optA], matchMode: 'any' },
  ]
  const result = resolveQuestionRuleTarget({
    rules,
    logic: 'if_any',
    question,
    answer: optA,
    responses: { q1: optA },
    allItems: [question],
    getRuleTarget: (rule) => rule.id,
    getFallbackTarget: () => 'fallback',
  })
  assert.equal(result, 'r2')
})

test('if_none returns null when a rule matches', () => {
  const rules = [
    { id: 'r1', ruleType: 'choice', optionIds: [optB], matchMode: 'any' },
  ]
  const result = resolveQuestionRuleTarget({
    rules,
    logic: 'if_none',
    question,
    answer: optB,
    responses: { q1: optB },
    allItems: [question],
    getRuleTarget: (rule) => rule.externalUrl,
    getFallbackTarget: () => 'https://fallback.example.com',
  })
  assert.equal(result, null)
})

test('if_none returns fallback when no rules match (negative case)', () => {
  const rules = [
    { id: 'r1', ruleType: 'choice', optionIds: [optA], matchMode: 'any' },
  ]
  const result = resolveQuestionRuleTarget({
    rules,
    logic: 'if_none',
    question,
    answer: optB,
    responses: { q1: optB },
    allItems: [question],
    getRuleTarget: () => null,
    getFallbackTarget: () => 'https://fallback.example.com',
  })
  assert.equal(result, 'https://fallback.example.com')
})

test('external redirect if_any uses first matching rule URL', () => {
  const q = {
    ...question,
    externalRedirectRules: [
      { id: 'r1', ruleType: 'choice', optionIds: [optB], matchMode: 'any', externalUrl: 'https://no.example.com' },
      { id: 'r2', ruleType: 'choice', optionIds: [optA], matchMode: 'any', externalUrl: 'https://yes.example.com' },
    ],
    externalRedirectLogic: 'if_any',
  }
  assert.equal(
    resolveExternalRedirectUrl(q, optA, { q1: optA }, [q]),
    'https://yes.example.com',
  )
})

test('external redirect if_none uses fallback URL when no rules match', () => {
  const q = {
    ...question,
    externalRedirectRules: [
      { id: 'r1', ruleType: 'choice', optionIds: [optA], matchMode: 'any', externalUrl: 'https://unused.example.com' },
    ],
    externalRedirectLogic: 'if_none',
    externalRedirectNoneUrl: 'https://fallback.example.com',
  }
  assert.equal(
    resolveExternalRedirectUrl(q, optB, { q1: optB }, [q]),
    'https://fallback.example.com',
  )
  assert.equal(
    resolveExternalRedirectUrl(q, optA, { q1: optA }, [q]),
    null,
  )
})
