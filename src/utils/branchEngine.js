// ─── Branch Engine ──────────────────────────────────────────────────────────
// Skip-to-page rules evaluated when the respondent clicks Next.

import { evaluateQuestionRule } from '@/utils/terminationEngine'
import { findPageIndexForBreak } from '@/utils/visibilityEngine'

/**
 * If a branch rule on this page fires, return the target visible page index.
 * First matching rule wins. Only forward jumps are allowed.
 */
export function resolveBranchTargetPage(pageQuestions, responses, items, pages, currentPage) {
  for (const q of pageQuestions) {
    for (const rule of q.branchRules || []) {
      if (!rule.targetPageBreakId) continue
      if (!evaluateQuestionRule(rule, q, responses[q.id], responses, items)) continue

      const targetIdx = findPageIndexForBreak(items, responses, rule.targetPageBreakId, pages)
      if (targetIdx !== null && targetIdx > currentPage && targetIdx < pages.length) {
        return targetIdx
      }
    }
  }
  return null
}
