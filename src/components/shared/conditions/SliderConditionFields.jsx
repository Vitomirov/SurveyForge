import {
  SLIDER_OPERATORS,
  getSliderOperatorMeta,
  sliderOperatorNeedsEndValue,
  sliderOperatorNeedsValue,
} from '@/utils/survey/conditions/sliderOperators'

/**
 * Value inputs for slider-question conditions and rules.
 * Operator selection is handled by the parent (ConditionBuilder / rule editors).
 */
export function SliderConditionFields({
  operator,
  textValue = '',
  textValue2 = '',
  question,
  onChange,
  inputClassName = 'input-base py-1.5 text-xs',
  hintClassName = 'text-xs text-ink-400',
}) {
  const meta = getSliderOperatorMeta(operator)
  const needsValue = sliderOperatorNeedsValue(operator)
  const needsEnd = sliderOperatorNeedsEndValue(operator)
  const cfg = question?.sliderConfig
  const min = cfg?.min ?? undefined
  const max = cfg?.max ?? undefined

  if (!needsValue) return null

  const valueLabel = needsEnd ? 'From' : 'Value'

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs mb-1 block">{valueLabel}</label>
        <input
          type="number"
          min={min}
          max={max}
          step={cfg?.step ?? 1}
          value={textValue}
          onChange={e => onChange({ textValue: e.target.value })}
          placeholder={min != null && max != null ? `${min}–${max}` : 'Enter value…'}
          className={inputClassName}
        />
      </div>

      {needsEnd && (
        <div>
          <label className="text-xs mb-1 block">To</label>
          <input
            type="number"
            min={min}
            max={max}
            step={cfg?.step ?? 1}
            value={textValue2}
            onChange={e => onChange({ textValue2: e.target.value })}
            placeholder={min != null && max != null ? `${min}–${max}` : 'Enter value…'}
            className={inputClassName}
          />
        </div>
      )}

      {min != null && max != null && (
        <p className={hintClassName}>Scale range: {min}–{max}</p>
      )}

      {meta?.hint && (
        <p className={hintClassName}>{meta.hint}</p>
      )}
    </div>
  )
}

export function getSliderOperatorHint(operator) {
  return SLIDER_OPERATORS.find(o => o.value === operator)?.hint
}
