/**
 * Date condition operator tests
 * Run: node --test scripts/tests/unit/date-operators.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evalConditionSet } from '../../../src/utils/survey/engines/conditionEngine.js'
import { checkTermination } from '../../../src/utils/survey/engines/terminationEngine.js'
import { evalDateOperator } from '../../../src/utils/survey/conditions/dateOperators.js'

const dateQ = {
  id: 'q_dob',
  itemType: 'question',
  questionType: 'date',
  text: 'Date of birth',
  dateConfig: { format: 'inherit' },
}

const items = [dateQ]

test('is_answered / is_not_answered', () => {
  assert.equal(evalDateOperator('2020-01-01', 'is_answered'), true)
  assert.equal(evalDateOperator('', 'is_answered'), false)
  assert.equal(evalDateOperator('', 'is_not_answered'), true)
})

test('before / after comparisons', () => {
  assert.equal(evalDateOperator('2020-01-01', 'before', '2021-01-01'), true)
  assert.equal(evalDateOperator('2022-01-01', 'after', '2021-01-01'), true)
  assert.equal(evalDateOperator('2021-01-01', 'equals', '2021-01-01'), true)
  assert.equal(evalDateOperator('2021-01-01', 'not_equals', '2020-01-01'), true)
})

test('between is inclusive', () => {
  assert.equal(evalDateOperator('2021-06-15', 'between', '2021-01-01', '2021-12-31'), true)
  assert.equal(evalDateOperator('2021-01-01', 'between', '2021-12-31', '2021-01-01'), true)
  assert.equal(evalDateOperator('2020-01-01', 'between', '2021-01-01', '2021-12-31'), false)
})

test('greater / less comparisons', () => {
  assert.equal(evalDateOperator('2022-01-01', 'greater_than', '2021-01-01'), true)
  assert.equal(evalDateOperator('2021-01-01', 'greater_or_equal', '2021-01-01'), true)
  assert.equal(evalDateOperator('2020-01-01', 'less_than', '2021-01-01'), true)
  assert.equal(evalDateOperator('2021-01-01', 'less_or_equal', '2021-01-01'), true)
})

test('contains matches substring in ISO date', () => {
  assert.equal(evalDateOperator('1990-05-12', 'contains', '1990'), true)
  assert.equal(evalDateOperator('1990-05-12', 'contains', '2000'), false)
})

test('younger_than_years for under-18 screen-out', () => {
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 18)
  const under18Dob = new Date(cutoff)
  under18Dob.setFullYear(under18Dob.getFullYear() + 2)
  const over18Dob = new Date(cutoff)
  over18Dob.setFullYear(over18Dob.getFullYear() - 2)

  assert.equal(
    evalDateOperator(under18Dob.toISOString().slice(0, 10), 'younger_than_years', '18'),
    true,
  )
  assert.equal(
    evalDateOperator(over18Dob.toISOString().slice(0, 10), 'younger_than_years', '18'),
    false,
  )
})

test('visibility condition set evaluates date question', () => {
  const conditions = [{
    id: 'c1',
    join: null,
    questionId: dateQ.id,
    textOperator: 'after',
    textValue: '2000-01-01',
  }]
  assert.equal(evalConditionSet(conditions, { [dateQ.id]: '2010-05-01' }, items), true)
  assert.equal(evalConditionSet(conditions, { [dateQ.id]: '1990-05-01' }, items), false)
})

test('per-question termination uses date rules', () => {
  const q = {
    ...dateQ,
    terminationRules: [{
      id: 'r1',
      ruleType: 'date',
      textOperator: 'younger_than_years',
      textValue: '18',
      note: 'Under 18',
    }],
    terminationLogic: 'if_any',
  }
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 10)
  const result = checkTermination(q, cutoff.toISOString().slice(0, 10), {}, [q])
  assert.equal(result.terminated, true)
})
