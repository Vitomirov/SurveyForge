// Shared if_any / if_none rule evaluation for per-question actions
// (termination uses evaluateRulesWithLogic directly; branch + redirect resolve a target).

import { evaluateQuestionRule, evaluateRulesWithLogic } from '@/utils/terminationEngine'
import { normalizeQuestionRuleLogic, QUESTION_RULE_LOGIC } from '@/utils/questionRuleLogic'

/**
 * Evaluate a question rule set and return the first applicable target.
 * - if_any: first matching rule whose target passes validation
 * - if_none: fallback target when no rules match
 */
export function resolveQuestionRuleTarget({
  rules,
  logic,
  question,
  answer,
  responses,
  allItems,
  getRuleTarget,
  getFallbackTarget,
}) {
  if (!rules.length) return null

  const mode = normalizeQuestionRuleLogic(logic)

  if (mode === QUESTION_RULE_LOGIC.IF_ANY) {
    for (const rule of rules) {
      const target = getRuleTarget(rule)
      if (target == null) continue
      if (!evaluateQuestionRule(rule, question, answer, responses, allItems)) continue
      return target
    }
    return null
  }

  const { shouldFire } = evaluateRulesWithLogic(rules, logic, question, answer, responses, allItems)
  if (!shouldFire) return null

  const fallback = getFallbackTarget()
  return fallback ?? null
}
