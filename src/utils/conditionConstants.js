// ─── Condition constants ────────────────────────────────────────────────────
// Shared operator labels for visibility rules, termination blocks, and
// per-question termination rules. Values must stay in sync with
// conditionEngine evaluators.

export const CHOICE_CONDITION_TYPES = [
  { value: 'any_of',  label: 'is any of',  hint: 'Answer includes at least one of' },
  { value: 'none_of', label: 'is none of', hint: 'Answer includes none of' },
  { value: 'all_of',  label: 'is all of',  hint: 'Answer includes ALL of (multi-select)' },
]

export const TEXT_CONDITION_TYPES = [
  { value: 'contains',     label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'equals',       label: 'equals' },
  { value: 'not_equals',   label: 'does not equal' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than',    label: 'is less than' },
]

/** Same values as TEXT_CONDITION_TYPES, with hints — used by TerminationEditor rules. */
export const TEXT_OPERATORS = [
  { value: 'contains',     label: 'contains',         hint: 'Answer includes this text' },
  { value: 'not_contains', label: 'does not contain',  hint: 'Answer excludes this text' },
  { value: 'equals',       label: 'equals',            hint: 'Exact match (case-insensitive)' },
  { value: 'not_equals',   label: 'does not equal',    hint: 'Any answer except this' },
  { value: 'greater_than', label: 'greater than',      hint: 'Numeric: answer > value' },
  { value: 'less_than',    label: 'less than',         hint: 'Numeric: answer < value' },
]

const NUMERIC_ONLY_OPERATORS = new Set(['greater_than', 'less_than'])

/** Open-text question with Number validation — only case that supports > / <. */
export function isNumericTextQuestion(question) {
  return question?.questionType === 'open_text'
    && question?.openTextConfig?.validation?.type === 'number'
}

export function getTextOperatorsForQuestion(question) {
  if (isNumericTextQuestion(question)) return TEXT_OPERATORS
  return TEXT_OPERATORS.filter(op => !NUMERIC_ONLY_OPERATORS.has(op.value))
}

export function getTextConditionTypesForQuestion(question) {
  if (isNumericTextQuestion(question)) return TEXT_CONDITION_TYPES
  return TEXT_CONDITION_TYPES.filter(t => !NUMERIC_ONLY_OPERATORS.has(t.value))
}

/** Reset stored operator when it is no longer valid for this question type. */
export function sanitizeTextOperator(operator, question) {
  const allowed = getTextOperatorsForQuestion(question)
  return allowed.some(op => op.value === operator) ? operator : 'contains'
}

export function getChoiceConditionLabel(value) {
  return CHOICE_CONDITION_TYPES.find(t => t.value === value)?.label || value
}
