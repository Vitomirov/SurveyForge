/**
 * Slider condition operator tests
 * Run: node --test scripts/tests/unit/slider-operators.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evalConditionSet } from '../../../src/utils/survey/engines/conditionEngine.js'
import { checkTermination } from '../../../src/utils/survey/engines/terminationEngine.js'
import { evalSliderOperator } from '../../../src/utils/survey/conditions/sliderOperators.js'

const sliderQ = {
  id: 'q_slider',
  itemType: 'question',
  questionType: 'slider',
  text: 'Rate your satisfaction',
  sliderConfig: { min: 1, max: 7, step: 1, defaultValue: null },
}

const items = [sliderQ]

test('is_answered / is_not_answered', () => {
  assert.equal(evalSliderOperator(5, 'is_answered'), true)
  assert.equal(evalSliderOperator(null, 'is_answered'), false)
  assert.equal(evalSliderOperator(null, 'is_not_answered'), true)
  assert.equal(evalSliderOperator(0, 'is_answered'), true)
})

test('numeric comparisons', () => {
  assert.equal(evalSliderOperator(5, 'equals', '5'), true)
  assert.equal(evalSliderOperator(5, 'not_equals', '3'), true)
  assert.equal(evalSliderOperator(5, 'greater_than', '3'), true)
  assert.equal(evalSliderOperator(5, 'greater_or_equal', '5'), true)
  assert.equal(evalSliderOperator(3, 'less_than', '5'), true)
  assert.equal(evalSliderOperator(5, 'less_or_equal', '5'), true)
})

test('between is inclusive', () => {
  assert.equal(evalSliderOperator(4, 'between', '3', '5'), true)
  assert.equal(evalSliderOperator(2, 'between', '3', '5'), false)
  assert.equal(evalSliderOperator(4, 'between', '5', '3'), true)
})

test('visibility condition set evaluates slider question', () => {
  const conditions = [{
    id: 'c1',
    join: null,
    questionId: sliderQ.id,
    textOperator: 'less_or_equal',
    textValue: '3',
  }]
  assert.equal(evalConditionSet(conditions, { [sliderQ.id]: 2 }, items), true)
  assert.equal(evalConditionSet(conditions, { [sliderQ.id]: 5 }, items), false)
})

test('per-question termination uses slider rules', () => {
  const q = {
    ...sliderQ,
    terminationRules: [{
      id: 'r1',
      ruleType: 'slider',
      textOperator: 'less_or_equal',
      textValue: '3',
      note: 'Low score',
    }],
    terminationLogic: 'if_any',
  }
  assert.equal(checkTermination(q, 2, {}, [q]).terminated, true)
  assert.equal(checkTermination(q, 6, {}, [q]).terminated, false)
})
