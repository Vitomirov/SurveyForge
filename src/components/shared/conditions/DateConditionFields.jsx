import {
  DATE_OPERATORS,
  dateOperatorNeedsEndValue,
  dateOperatorNeedsValue,
  getDateOperatorMeta,
} from '@/utils/survey/conditions/dateOperators'

/**
 * Value inputs for date-question conditions and rules.
 * Operator selection is handled by the parent (ConditionBuilder / rule editors).
 */
export function DateConditionFields({
  operator,
  textValue = '',
  textValue2 = '',
  onChange,
  inputClassName = 'input-base py-1.5 text-xs',
  hintClassName = 'text-xs text-ink-400',
}) {
  const meta = getDateOperatorMeta(operator)
  const needsValue = dateOperatorNeedsValue(operator)
  const needsEnd = dateOperatorNeedsEndValue(operator)

  if (!needsValue) return null

  const inputType = meta?.inputType === 'number' ? 'number' : meta?.inputType === 'date' ? 'date' : 'text'
  const valueLabel = needsEnd ? 'From' : 'Value'
  const placeholder = meta?.inputType === 'number'
    ? 'Enter years…'
    : meta?.inputType === 'date'
      ? 'YYYY-MM-DD'
      : 'Enter value…'

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs mb-1 block">{valueLabel}</label>
        <input
          type={inputType}
          min={inputType === 'number' ? 0 : undefined}
          value={textValue}
          onChange={e => onChange({ textValue: e.target.value })}
          placeholder={placeholder}
          className={inputClassName}
        />
      </div>

      {needsEnd && (
        <div>
          <label className="text-xs mb-1 block">To</label>
          <input
            type="date"
            value={textValue2}
            onChange={e => onChange({ textValue2: e.target.value })}
            className={inputClassName}
          />
        </div>
      )}

      {meta?.hint && (
        <p className={hintClassName}>{meta.hint}</p>
      )}
    </div>
  )
}

export function getDateOperatorHint(operator) {
  return DATE_OPERATORS.find(o => o.value === operator)?.hint
}

export function isDateAgeOperator(operator) {
  return operator === 'younger_than_years' || operator === 'older_than_years'
}
