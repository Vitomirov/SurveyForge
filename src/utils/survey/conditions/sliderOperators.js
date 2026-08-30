// ─── Slider condition operators ─────────────────────────────────────────────
// Single source of truth for slider-question logic (visibility, termination, branching).

export const SLIDER_OPERATORS = [
  { value: 'is_answered',      label: 'is answered',                 hint: 'Respondent moved the slider', needsValue: false },
  { value: 'is_not_answered',  label: 'is not answered',             hint: 'Slider was left untouched', needsValue: false },
  { value: 'equals',           label: 'equals',                      hint: 'Exact value match', needsValue: true, inputType: 'number' },
  { value: 'not_equals',       label: 'does not equal',              hint: 'Any value except this', needsValue: true, inputType: 'number' },
  { value: 'greater_than',     label: 'is greater than',             hint: 'Answer is above the value', needsValue: true, inputType: 'number' },
  { value: 'greater_or_equal', label: 'is greater than or equal to', hint: 'Answer is at or above the value', needsValue: true, inputType: 'number' },
  { value: 'less_than',        label: 'is less than',                hint: 'Answer is below the value', needsValue: true, inputType: 'number' },
  { value: 'less_or_equal',    label: 'is less than or equal to',    hint: 'Answer is at or below the value', needsValue: true, inputType: 'number' },
  { value: 'between',          label: 'is between',                  hint: 'Answer falls within the range (inclusive)', needsValue: true, needsEndValue: true, inputType: 'number' },
]

const DEFAULT_SLIDER_OPERATOR = 'is_answered'

export function isSliderQuestion(question) {
  return question?.questionType === 'slider'
}

export function getSliderOperatorMeta(operator) {
  return SLIDER_OPERATORS.find(o => o.value === operator)
}

export function getSliderOperatorLabel(operator) {
  return getSliderOperatorMeta(operator)?.label || operator?.replace(/_/g, ' ') || ''
}

export function sliderOperatorNeedsValue(operator) {
  return getSliderOperatorMeta(operator)?.needsValue !== false
}

export function sliderOperatorNeedsEndValue(operator) {
  return Boolean(getSliderOperatorMeta(operator)?.needsEndValue)
}

export function sanitizeSliderOperator(operator) {
  return SLIDER_OPERATORS.some(o => o.value === operator) ? operator : DEFAULT_SLIDER_OPERATOR
}

export function isSliderAnswerEmpty(answer) {
  return answer === undefined || answer === null || answer === ''
}

/** Numeric slider answer; null when invalid or unanswered. */
export function parseSliderValue(value) {
  if (isSliderAnswerEmpty(value)) return null
  const n = typeof value === 'number' ? value : parseFloat(String(value).trim())
  return Number.isFinite(n) ? n : null
}

function parseThreshold(value) {
  if (value === undefined || value === null || value === '') return null
  const n = parseFloat(String(value).trim())
  return Number.isFinite(n) ? n : null
}

function compareNumbers(answer, threshold, comparator) {
  const a = parseSliderValue(answer)
  const b = parseThreshold(threshold)
  if (a === null || b === null) return false
  return comparator(a, b)
}

/**
 * Evaluate a slider answer against an operator.
 * textValue2 is used for the "between" operator (end of range).
 */
export function evalSliderOperator(answer, operator, textValue, textValue2) {
  const op = operator || DEFAULT_SLIDER_OPERATOR

  switch (op) {
    case 'is_answered':
      return !isSliderAnswerEmpty(answer)
    case 'is_not_answered':
      return isSliderAnswerEmpty(answer)
    case 'equals':
      return compareNumbers(answer, textValue, (a, b) => a === b)
    case 'not_equals':
      return compareNumbers(answer, textValue, (a, b) => a !== b)
    case 'greater_than':
      return compareNumbers(answer, textValue, (a, b) => a > b)
    case 'greater_or_equal':
      return compareNumbers(answer, textValue, (a, b) => a >= b)
    case 'less_than':
      return compareNumbers(answer, textValue, (a, b) => a < b)
    case 'less_or_equal':
      return compareNumbers(answer, textValue, (a, b) => a <= b)
    case 'between': {
      const a = parseSliderValue(answer)
      const start = parseThreshold(textValue)
      const end = parseThreshold(textValue2)
      if (a === null || start === null || end === null) return false
      const lo = Math.min(start, end)
      const hi = Math.max(start, end)
      return a >= lo && a <= hi
    }
    default:
      return false
  }
}

export function formatSliderConditionValues(operator, textValue, textValue2) {
  if (!sliderOperatorNeedsValue(operator)) return ''
  if (operator === 'between') {
    return `${textValue ?? '…'} and ${textValue2 ?? '…'}`
  }
  return String(textValue ?? '…')
}

export function formatSliderConditionPhrase(operator, textValue, textValue2) {
  const label = getSliderOperatorLabel(operator)
  const values = formatSliderConditionValues(operator, textValue, textValue2)
  return values ? `${label} ${values}` : label
}
