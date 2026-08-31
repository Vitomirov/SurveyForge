import assert from 'node:assert/strict'
import { simulateRespondentPath, computeBranchAwareProgress } from '../../../src/utils/survey/engines/progressEngine.js'

const q = (id, branchRules = [], branchLogic = 'if_any') => ({
  itemType: 'question',
  id,
  questionType: 'single_select',
  branchRules,
  branchLogic,
  options: [{ id: 'opt-yes', text: 'Yes' }, { id: 'opt-no', text: 'No' }],
})

const branchRule = {
  id: 'r1',
  ruleType: 'choice',
  optionIds: ['opt-yes'],
  matchMode: 'any',
  targetPageBreakId: 'break-end',
}

const pages = [
  [q('q1')],
  [q('q2', [branchRule])],
  [q('q3')],
  [q('q4')],
  [q('q5')],
]

const items = [
  q('q1'),
  { itemType: 'page_break', id: 'break-1' },
  q('q2', [branchRule]),
  { itemType: 'page_break', id: 'break-2' },
  q('q3'),
  { itemType: 'page_break', id: 'break-3' },
  q('q4'),
  { itemType: 'page_break', id: 'break-end' },
  q('q5'),
]

const responsesBranch = { q2: 'opt-yes' }
const responsesLinear = { q2: 'opt-no' }

// Branch on page 1 → skip to page 4 (index 4)
const branchPath = simulateRespondentPath(pages, items, responsesBranch)
assert.deepEqual(branchPath, [0, 1, 4], `expected branch path, got ${branchPath}`)

const linearPath = simulateRespondentPath(pages, items, responsesLinear)
assert.deepEqual(linearPath, [0, 1, 2, 3, 4], `expected linear path, got ${linearPath}`)

const branchProgress = computeBranchAwareProgress(4, pages, items, responsesBranch)
assert.equal(branchProgress.totalSteps, 3, 'branch path has 3 steps')
assert.equal(branchProgress.step, 3, 'on last branch step')
assert.equal(branchProgress.progress, 100)

const midBranchProgress = computeBranchAwareProgress(1, pages, items, responsesBranch)
assert.equal(midBranchProgress.totalSteps, 3)
assert.equal(midBranchProgress.step, 2)
assert.equal(midBranchProgress.progress, 50)

const linearProgress = computeBranchAwareProgress(2, pages, items, responsesLinear)
assert.equal(linearProgress.totalSteps, 5)
assert.equal(linearProgress.step, 3)
assert.equal(linearProgress.progress, 50)

console.log('progress-engine.test.mjs: all passed')
