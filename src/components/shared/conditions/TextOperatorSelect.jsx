import { useEffect } from 'react'
import {
  TEXT_OPERATORS,
  getTextOperatorsForQuestion,
  isDateQuestion,
  isSliderQuestion,
  sanitizeTextOperator,
} from '@/utils/survey/conditions/conditionConstants'
import { getDateOperatorHint } from '@/components/shared/conditions/DateConditionFields'
import { getSliderOperatorHint } from '@/components/shared/conditions/SliderConditionFields'

/**
 * Text-operator dropdown scoped to the question type.
 * Numeric comparisons (> / <) only appear for open-text fields with Number validation.
 */
export function TextOperatorSelect({ value, onChange, question, className = 'input-base py-1.5 text-xs font-medium' }) {
  const operators = getTextOperatorsForQuestion(question)
  const safeValue = sanitizeTextOperator(value, question)

  useEffect(() => {
    if (value == null || value === '') return
    if (value !== safeValue) onChange(safeValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, safeValue])

  return (
    <select
      value={safeValue}
      onChange={e => onChange(e.target.value)}
      className={className}
    >
      {operators.map(op => (
        <option key={op.value} value={op.value}>{op.label}</option>
      ))}
    </select>
  )
}

export function getTextOperatorHint(operator, question) {
  if (isDateQuestion(question)) return getDateOperatorHint(operator)
  if (isSliderQuestion(question)) return getSliderOperatorHint(operator)
  return TEXT_OPERATORS.find(o => o.value === operator)?.hint
}

export function isNumericTextOperator(operator) {
  return operator === 'greater_than' || operator === 'less_than'
}
