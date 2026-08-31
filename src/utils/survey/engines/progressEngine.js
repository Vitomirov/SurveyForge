// ─── Progress Engine ────────────────────────────────────────────────────────
// Simulates the respondent's page path using branch/skip rules so the progress
// bar reflects pages they will actually visit, not the raw page count.

import { resolveBranchTargetPage } from './branchEngine.js'

/**
 * Walk from page 0 to the end, applying forward branch skips at each step.
 * Returns ordered page indices the respondent will visit given current answers.
 */
export function simulateRespondentPath(pages, items, responses) {
  if (!pages?.length) return []

  const path = []
  let pageIdx = 0
  const seen = new Set()
  const maxSteps = Math.max(pages.length * 2, 1)

  while (pageIdx < pages.length && path.length < maxSteps) {
    if (seen.has(pageIdx)) break
    seen.add(pageIdx)
    path.push(pageIdx)

    if (pageIdx >= pages.length - 1) break

    const pageQuestions = pages[pageIdx].filter(i => i.itemType === 'question')
    const branchTarget = resolveBranchTargetPage(pageQuestions, responses, items, pages, pageIdx)
    pageIdx = branchTarget ?? pageIdx + 1
  }

  return path
}

/**
 * Branch-aware progress for the taker UI.
 * @returns {{ progress: number, step: number, totalSteps: number, path: number[], onPath: boolean }}
 */
export function computeBranchAwareProgress(currentPage, pages, items, responses) {
  const path = simulateRespondentPath(pages, items, responses)
  const totalSteps = path.length

  if (totalSteps <= 1) {
    return { progress: 0, step: 1, totalSteps: Math.max(totalSteps, 1), path, onPath: true }
  }

  const stepIndex = path.indexOf(currentPage)
  if (stepIndex < 0) {
    // Back-navigated to a page outside the simulated forward path — linear fallback.
    const linearTotal = pages.length
    const progress = linearTotal > 1
      ? Math.round((currentPage / (linearTotal - 1)) * 100)
      : 0
    return {
      progress,
      step: currentPage + 1,
      totalSteps: linearTotal,
      path,
      onPath: false,
    }
  }

  const progress = Math.round((stepIndex / (totalSteps - 1)) * 100)
  return {
    progress,
    step: stepIndex + 1,
    totalSteps,
    path,
    onPath: true,
  }
}

export function isLastPageOnPath(currentPage, pages, items, responses) {
  const path = simulateRespondentPath(pages, items, responses)
  return path.length > 0 && path[path.length - 1] === currentPage
}
