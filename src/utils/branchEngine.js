// ─── Branch Engine ──────────────────────────────────────────────────────────
// Skip-to-page rules evaluated when the respondent clicks Next.

import { findPageIndexForBreak } from '@/utils/visibilityEngine'
import { resolveQuestionRuleTarget } from '@/utils/resolveQuestionRuleTarget'

function resolveForwardBranchTarget(items, responses, targetBreakId, pages, currentPage) {
  if (!targetBreakId) return null
  const targetIdx = findPageIndexForBreak(items, responses, targetBreakId, pages)
  if (targetIdx !== null && targetIdx > currentPage && targetIdx < pages.length) {
    return targetIdx
  }
  return null
}

/**
 * If branch rules on this page fire, return the target visible page index.
 * Only forward jumps are allowed.
 */
export function resolveBranchTargetPage(pageQuestions, responses, items, pages, currentPage) {
  for (const q of pageQuestions) {
    const rules = q.branchRules || []
    if (!rules.length) continue

    const targetIdx = resolveQuestionRuleTarget({
      rules,
      logic: q.branchLogic,
      question: q,
      answer: responses[q.id],
      responses,
      allItems: items,
      getRuleTarget: (rule) =>
        resolveForwardBranchTarget(items, responses, rule.targetPageBreakId, pages, currentPage),
      getFallbackTarget: () =>
        resolveForwardBranchTarget(items, responses, q.branchNoneTargetPageBreakId, pages, currentPage),
    })
    if (targetIdx !== null) return targetIdx
  }
  return null
}
