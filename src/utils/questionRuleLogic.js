// Shared if_any / if_none constants for per-question termination and branch rules.

export const QUESTION_RULE_LOGIC = {
  IF_ANY: 'if_any',
  IF_NONE: 'if_none',
}

export function normalizeQuestionRuleLogic(logic) {
  return logic === QUESTION_RULE_LOGIC.IF_NONE
    ? QUESTION_RULE_LOGIC.IF_NONE
    : QUESTION_RULE_LOGIC.IF_ANY
}

/** Short label for summary badges. */
export function questionRuleLogicSummary(logic) {
  return normalizeQuestionRuleLogic(logic) === QUESTION_RULE_LOGIC.IF_ANY
    ? 'ANY fires'
    : 'NONE fires'
}
