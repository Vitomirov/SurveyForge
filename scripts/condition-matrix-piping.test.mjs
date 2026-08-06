/**
 * Matrix conditions + piped option evaluation tests
 * Run: node --test scripts/condition-matrix-piping.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evalConditionSet } from '../src/utils/conditionEngine.js'
import { checkTermination } from '../src/utils/terminationEngine.js'
import { resolvePipingTokens, buildPipedOptions } from '../src/utils/piping.js'
import { getBuilderConditionOptions } from '../src/utils/questionOptions.js'
import { validateAnswer } from '../src/utils/answerValidation.js'
import { buildVisiblePages, visibilitySummary } from '../src/utils/visibilityEngine.js'
import { evalBlock, buildBlockCause } from '../src/utils/terminationEngine.js'
import { formatConditionPhraseLogicStyle, joinConditionPhrasesMultiline } from '../src/utils/conditionSummary.js'
import { normalizeMatrixAnswer } from '../shared/matrixAnswer.js'

const row1 = 'row_1'
const row2 = 'row_2'
const colA = 'col_a'
const colB = 'col_b'
const optX = 'opt_x'
const optY = 'opt_y'

const matrixQ = {
  id: 'q_matrix',
  itemType: 'question',
  questionType: 'matrix',
  text: 'Rate items',
  matrixConfig: {
    subType: 'single',
    rows: [{ id: row1, text: 'Item 1' }, { id: row2, text: 'Item 2' }],
    columns: [{ id: colA, text: 'Agree' }, { id: colB, text: 'Disagree' }],
  },
}

const sourceQ = {
  id: 'q_source',
  itemType: 'question',
  questionType: 'multi_select',
  text: 'Pick favorites',
  options: [
    { id: optX, text: 'Option X', terminates: true },
    { id: optY, text: 'Option Y', terminates: false },
  ],
}

const pipedQ = {
  id: 'q_piped',
  itemType: 'question',
  questionType: 'single_select',
  text: 'Which is best?',
  options: [{ id: 'manual', text: 'Ignored' }],
  pipedOptionsConfig: { enabled: true, sourceQuestionId: 'q_source', matrixRowId: null },
  terminationRules: [{ id: 'r1', ruleType: 'choice', optionIds: [optX], matchMode: 'any', note: '' }],
  terminationLogic: 'if_any',
}

const items = [sourceQ, matrixQ, pipedQ]

test('matrix condition matches specific row and column', () => {
  const responses = { [matrixQ.id]: { [row1]: colA, [row2]: colB } }
  const conditions = [{
    id: 'c1', join: null, questionId: matrixQ.id,
    matrixRowId: row1, conditionType: 'any_of', matrixColumnIds: [colA],
  }]
  assert.equal(evalConditionSet(conditions, responses, items), true)

  conditions[0].matrixColumnIds = [colB]
  assert.equal(evalConditionSet(conditions, responses, items), false)
})

test('piped question termination evaluates against source option IDs', () => {
  const responses = { [sourceQ.id]: [optX, optY], [pipedQ.id]: optX }
  const result = checkTermination(pipedQ, responses[pipedQ.id], responses, items)
  assert.equal(result.terminated, true)
})

test('piped question visibility condition matches dynamic selection', () => {
  const responses = { [sourceQ.id]: [optX, optY], [pipedQ.id]: optY }
  const conditions = [{
    id: 'c1', join: null, questionId: pipedQ.id,
    conditionType: 'any_of', optionIds: [optY],
  }]
  assert.equal(evalConditionSet(conditions, responses, items), true)
})

test('matrix row piping token resolves to column label', () => {
  const responses = { [matrixQ.id]: { [row1]: colA } }
  const text = resolvePipingTokens(`You said {{qid:${matrixQ.id}:${row1}}}`, responses, items)
  assert.equal(text, 'You said Item 1: Agree')
})

test('matrix option piping from row selections', () => {
  const matrixMulti = {
    ...matrixQ,
    matrixConfig: { ...matrixQ.matrixConfig, subType: 'multi' },
  }
  const pipedFromMatrix = {
    ...pipedQ,
    pipedOptionsConfig: {
      enabled: true,
      sourceQuestionId: matrixQ.id,
      matrixRowId: row1,
      matrixPipeMode: 'columns',
    },
  }
  const allItems = [matrixMulti, pipedFromMatrix]
  const responses = { [matrixQ.id]: { [row1]: [colA, colB] } }
  const opts = buildPipedOptions(pipedFromMatrix, responses, allItems)
  assert.equal(opts.length, 2)
  assert.equal(opts[0].text, 'Agree')
})

test('required matrix validation rejects empty rows', () => {
  const q = { ...matrixQ, required: true }
  assert.equal(validateAnswer(q, {}), 'Please answer all rows (2 remaining).')
  assert.equal(validateAnswer(q, { [row1]: colA, [row2]: colB }), null)
})

test('matrix rows piped as options for builder rules', () => {
  const pipedFromRows = {
    ...pipedQ,
    pipedOptionsConfig: {
      enabled: true,
      sourceQuestionId: matrixQ.id,
      matrixPipeMode: 'rows',
    },
    terminationRules: [{ id: 'r1', ruleType: 'choice', optionIds: [row1], matchMode: 'any', note: '' }],
  }
  const surveyItems = [matrixQ, pipedFromRows]
  const opts = getBuilderConditionOptions(pipedFromRows, surveyItems)
  assert.equal(opts.length, 2)
  assert.equal(opts[0].text, 'Item 1')
  assert.equal(opts[1].text, 'Item 2')

  const responses = {
    [matrixQ.id]: { [row1]: colA, [row2]: colB },
    [pipedFromRows.id]: row1,
  }
  const runtime = buildPipedOptions(pipedFromRows, responses, surveyItems)
  assert.equal(runtime.length, 2)
  assert.equal(runtime[0].id, row1)

  const fired = checkTermination(pipedFromRows, row1, responses, surveyItems)
  assert.equal(fired.terminated, true)
})

test('matrix per-question screen-out rule fires on row/column match', () => {
  const q = {
    ...matrixQ,
    terminationRules: [{
      id: 'mr1', ruleType: 'matrix', matrixRowId: row1,
      matrixColumnIds: [colB], matchMode: 'any', note: '',
    }],
    terminationLogic: 'if_any',
  }
  const responses = { [q.id]: { [row1]: colB, [row2]: colA } }
  assert.equal(checkTermination(q, responses[q.id], responses, [q]).terminated, true)

  responses[q.id] = { [row1]: colA, [row2]: colA }
  assert.equal(checkTermination(q, responses[q.id], responses, [q]).terminated, false)
})

test('termination block fires after page break (block attached to question page)', () => {
  const block = {
    id: 'tb1',
    itemType: 'termination_block',
    title: 'Screen out',
    conditions: [{
      id: 'c1', join: null, questionId: matrixQ.id,
      matrixRowId: row1, conditionType: 'any_of', matrixColumnIds: [colB],
    }],
  }
  const pageBreak = { id: 'pb1', itemType: 'page_break', title: '', visibility: { enabled: false } }
  const q2 = { id: 'q2', itemType: 'question', questionType: 'open_text', text: 'Follow up' }
  const surveyItems = [matrixQ, pageBreak, block, pageBreak, q2]

  const { pages, blocksByPage } = buildVisiblePages(surveyItems, {})
  assert.equal(pages.length, 2)
  assert.equal(blocksByPage[0].length, 1, 'block should attach to matrix page')

  const responses = { [matrixQ.id]: { [row1]: colB, [row2]: colA } }
  assert.equal(evalBlock(blocksByPage[0][0], responses, surveyItems), true)
})

test('shared normalizeMatrixAnswer coerces matrix payloads', () => {
  assert.deepEqual(
    normalizeMatrixAnswer({ row_1: 'col_a', row_2: null, row_3: ['col_a', ''] }),
    { row_1: 'col_a', row_2: null, row_3: ['col_a'] }
  )
  assert.deepEqual(normalizeMatrixAnswer(null), {})
})

test('condition summary formatters produce stable plain-text output', () => {
  const vis = {
    enabled: true,
    mode: 'show_if',
    conditions: [{
      id: 'c1', join: null, questionId: matrixQ.id,
      matrixRowId: row1, conditionType: 'any_of', matrixColumnIds: [colA],
    }],
  }
  assert.equal(
    visibilitySummary(vis, [matrixQ]),
    'Shown only if: Q1 row "Item 1" any of [Agree]'
  )

  const block = {
    id: 'tb1',
    itemType: 'termination_block',
    title: 'Screen out',
    conditions: [{
      id: 'c1', join: null, questionId: matrixQ.id,
      matrixRowId: row1, conditionType: 'any_of', matrixColumnIds: [colB],
    }],
  }
  assert.equal(
    buildBlockCause(block, {}, [matrixQ]),
    '"Rate items…" row "Item 1" any of [Disagree]'
  )

  const logicPhrases = block.conditions.map(c => {
    const q = matrixQ
    return formatConditionPhraseLogicStyle(c, q, [matrixQ], 'Q1')
  })
  assert.equal(
    joinConditionPhrasesMultiline(block.conditions, logicPhrases),
    'Q1 row "Item 1" is any of [Disagree]'
  )
})

test('navigation lock resolves per page from page breaks, groups, and page 1 settings', () => {
  const q1 = { id: 'q1', itemType: 'question', questionType: 'open_text', text: 'Q1' }
  const group = {
    id: 'g1',
    itemType: 'group',
    title: 'Info section',
    navigationLock: { enabled: true, seconds: 20 },
  }
  const q2 = { id: 'q2', itemType: 'question', questionType: 'open_text', text: 'Q2' }
  const pageBreak = {
    id: 'pb1',
    itemType: 'page_break',
    navigationLock: { enabled: true, seconds: 10 },
  }
  const q3 = { id: 'q3', itemType: 'question', questionType: 'open_text', text: 'Q3' }

  const { navigationLockByPage } = buildVisiblePages(
    [q1, group, q2, pageBreak, q3],
    {},
    {
      pageOneNavigationLock: { enabled: true, seconds: 5 },
    },
  )

  assert.deepEqual(navigationLockByPage, [20, 10])
})

test('all-pages navigation lock applies to every page including page 1', () => {
  const q1 = { id: 'q1', itemType: 'question', questionType: 'open_text', text: 'Q1' }
  const pageBreak = { id: 'pb1', itemType: 'page_break' }
  const q2 = { id: 'q2', itemType: 'question', questionType: 'open_text', text: 'Q2' }

  const { navigationLockByPage } = buildVisiblePages(
    [q1, pageBreak, q2],
    {},
    { navigationLockAllPages: { enabled: true, seconds: 15 } },
  )

  assert.deepEqual(navigationLockByPage, [15, 15])
})

test('page 1-only lock does not apply to later pages', () => {
  const q1 = { id: 'q1', itemType: 'question', questionType: 'open_text', text: 'Q1' }
  const pageBreak = { id: 'pb1', itemType: 'page_break' }
  const q2 = { id: 'q2', itemType: 'question', questionType: 'open_text', text: 'Q2' }

  const { navigationLockByPage } = buildVisiblePages(
    [q1, pageBreak, q2],
    {},
    { pageOneNavigationLock: { enabled: true, seconds: 15 } },
  )

  assert.deepEqual(navigationLockByPage, [15, 0])
})

test('page 2 lock from page break is independent of page 1', () => {
  const q1 = { id: 'q1', itemType: 'question', questionType: 'open_text', text: 'Q1' }
  const pageBreak = {
    id: 'pb1',
    itemType: 'page_break',
    navigationLock: { enabled: true, seconds: 20 },
  }
  const q2 = { id: 'q2', itemType: 'question', questionType: 'open_text', text: 'Q2' }

  const { navigationLockByPage } = buildVisiblePages([q1, pageBreak, q2], {}, {})

  assert.deepEqual(navigationLockByPage, [0, 20])
})
