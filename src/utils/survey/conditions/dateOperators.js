// ─── Date condition operators ───────────────────────────────────────────────
// Single source of truth for date-question logic (visibility, termination, branching).

export const DATE_OPERATORS = [
  { value: 'is_answered',      label: 'is answered',                    hint: 'Respondent provided a date', needsValue: false },
  { value: 'is_not_answered',  label: 'is not answered',                hint: 'Question was left blank', needsValue: false },
  { value: 'before',           label: 'is before',                      hint: 'Date is earlier than the value', needsValue: true, inputType: 'date' },
  { value: 'after',            label: 'is after',                       hint: 'Date is later than the value', needsValue: true, inputType: 'date' },
  { value: 'between',          label: 'is between',                     hint: 'Date falls within the range (inclusive)', needsValue: true, needsEndValue: true, inputType: 'date' },
  { value: 'equals',           label: 'equals',                         hint: 'Exact date match', needsValue: true, inputType: 'date' },
  { value: 'not_equals',       label: 'does not equal',                 hint: 'Any date except this one', needsValue: true, inputType: 'date' },
  { value: 'greater_than',     label: 'is greater than',                hint: 'Date is later than the value', needsValue: true, inputType: 'date' },
  { value: 'greater_or_equal', label: 'is greater than or equal to',    hint: 'Date is on or after the value', needsValue: true, inputType: 'date' },
  { value: 'less_than',        label: 'is less than',                   hint: 'Date is earlier than the value', needsValue: true, inputType: 'date' },
  { value: 'less_or_equal',    label: 'is less than or equal to',       hint: 'Date is on or before the value', needsValue: true, inputType: 'date' },
  { value: 'contains',         label: 'contains',                       hint: 'Answer includes this text (e.g. year "1990")', needsValue: true, inputType: 'text' },
  { value: 'younger_than_years', label: 'person is younger than',       hint: 'Date of birth indicates age under N years (evaluated at survey time)', needsValue: true, inputType: 'number', unit: 'years' },
  { value: 'older_than_years',   label: 'person is at least',           hint: 'Date of birth indicates age of N years or older (evaluated at survey time)', needsValue: true, inputType: 'number', unit: 'years' },
]

const DEFAULT_DATE_OPERATOR = 'is_answered'

export function isDateQuestion(question) {
  return question?.questionType === 'date'
}

export function getDateOperatorMeta(operator) {
  return DATE_OPERATORS.find(o => o.value === operator)
}

export function getDateOperatorLabel(operator) {
  return getDateOperatorMeta(operator)?.label || operator?.replace(/_/g, ' ') || ''
}

export function dateOperatorNeedsValue(operator) {
  return getDateOperatorMeta(operator)?.needsValue !== false
}

export function dateOperatorNeedsEndValue(operator) {
  return Boolean(getDateOperatorMeta(operator)?.needsEndValue)
}

export function sanitizeDateOperator(operator) {
  return DATE_OPERATORS.some(o => o.value === operator) ? operator : DEFAULT_DATE_OPERATOR
}

/** ISO date (YYYY-MM-DD) from an answer string; null when invalid. */
export function parseISODate(value) {
  if (value === undefined || value === null || value === '') return null
  const str = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null
  const [y, m, d] = str.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null
  }
  return str
}

function cutoffDateYearsAgo(years) {
  const n = parseInt(years, 10)
  if (isNaN(n) || n < 0) return null
  const d = new Date()
  d.setFullYear(d.getFullYear() - n)
  return d.toISOString().slice(0, 10)
}

function compareDates(answer, value, comparator) {
  const a = parseISODate(answer)
  const b = parseISODate(value)
  if (!a || !b) return false
  return comparator(a, b)
}

/**
 * Evaluate a date answer against an operator.
 * textValue2 is used for the "between" operator (end of range).
 */
export function evalDateOperator(answer, operator, textValue, textValue2) {
  const op = operator || DEFAULT_DATE_OPERATOR
  const isEmpty = answer === undefined || answer === null || answer === ''

  switch (op) {
    case 'is_answered':
      return !isEmpty
    case 'is_not_answered':
      return isEmpty
    case 'before':
    case 'less_than':
      return compareDates(answer, textValue, (a, b) => a < b)
    case 'after':
    case 'greater_than':
      return compareDates(answer, textValue, (a, b) => a > b)
    case 'greater_or_equal':
      return compareDates(answer, textValue, (a, b) => a >= b)
    case 'less_or_equal':
      return compareDates(answer, textValue, (a, b) => a <= b)
    case 'equals':
      return compareDates(answer, textValue, (a, b) => a === b)
    case 'not_equals':
      return compareDates(answer, textValue, (a, b) => a !== b)
    case 'between': {
      const d = parseISODate(answer)
      const start = parseISODate(textValue)
      const end = parseISODate(textValue2)
      if (!d || !start || !end) return false
      const lo = start <= end ? start : end
      const hi = start <= end ? end : start
      return d >= lo && d <= hi
    }
    case 'contains': {
      if (isEmpty) return false
      const needle = String(textValue ?? '').trim()
      return needle.length > 0 && String(answer).includes(needle)
    }
    case 'younger_than_years': {
      const dob = parseISODate(answer)
      const cutoff = cutoffDateYearsAgo(textValue)
      return Boolean(dob && cutoff && dob > cutoff)
    }
    case 'older_than_years': {
      const dob = parseISODate(answer)
      const cutoff = cutoffDateYearsAgo(textValue)
      return Boolean(dob && cutoff && dob <= cutoff)
    }
    default:
      return false
  }
}

/** Human-readable value fragment for summaries. */
export function formatDateConditionValues(operator, textValue, textValue2) {
  if (!dateOperatorNeedsValue(operator)) return ''
  const meta = getDateOperatorMeta(operator)
  if (operator === 'between') {
    return `"${textValue || '…'}" and "${textValue2 || '…'}"`
  }
  if (meta?.unit === 'years') {
    return `${textValue || '…'} ${meta.unit}`
  }
  return `"${textValue || '…'}"`
}

export function formatDateConditionPhrase(operator, textValue, textValue2) {
  const label = getDateOperatorLabel(operator)
  const values = formatDateConditionValues(operator, textValue, textValue2)
  return values ? `${label} ${values}` : label
}
