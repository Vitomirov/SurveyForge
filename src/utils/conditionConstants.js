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

export function getChoiceConditionLabel(value) {
  return CHOICE_CONDITION_TYPES.find(t => t.value === value)?.label || value
}
