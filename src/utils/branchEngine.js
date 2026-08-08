// ─── Branch Engine ──────────────────────────────────────────────────────────
// Skip-to-page rules evaluated when the respondent clicks Next.

import { findPageIndexForBreak } from '@/utils/visibilityEngine'
import { evaluateQuestionRule, evaluateRulesWithLogic } from '@/utils/terminationEngine'
import {
  normalizeQuestionRuleLogic,
  QUESTION_RULE_LOGIC,
} from '@/utils/questionRuleLogic'

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

    const logic = normalizeQuestionRuleLogic(q.branchLogic)
    const answer = responses[q.id]

    if (logic === QUESTION_RULE_LOGIC.IF_ANY) {
      // Preserve per-rule iteration: skip rules with no target or no match.
      for (const rule of rules) {
        const targetIdx = resolveForwardBranchTarget(
          items, responses, rule.targetPageBreakId, pages, currentPage,
        )
        if (targetIdx === null) continue
        if (!evaluateQuestionRule(rule, q, answer, responses, items)) continue
        return targetIdx
      }
      continue
    }

    const { shouldFire } = evaluateRulesWithLogic(rules, logic, q, answer, responses, items)
    if (!shouldFire) continue

    const targetIdx = resolveForwardBranchTarget(
      items, responses, q.branchNoneTargetPageBreakId, pages, currentPage,
    )
    if (targetIdx !== null) return targetIdx
  }
  return null
}
