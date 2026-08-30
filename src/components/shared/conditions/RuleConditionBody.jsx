import { TextOperatorSelect, getTextOperatorHint, isNumericTextOperator } from '@/components/shared/conditions/TextOperatorSelect'
import { DateConditionFields } from '@/components/shared/conditions/DateConditionFields'
import { SliderConditionFields } from '@/components/shared/conditions/SliderConditionFields'
import { dateOperatorNeedsValue } from '@/utils/survey/conditions/dateOperators'
import { sliderOperatorNeedsValue } from '@/utils/survey/conditions/sliderOperators'
import { ValueOperatorRuleFields } from './ValueOperatorRuleFields'

function CheckIcon() {
  return (
    <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none">
      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function RuleConditionBody({
  rule,
  question,
  variant,
  options = [],
  onChange,
  matchModeLabel,
  checkboxSelectedClass,
  checkboxHoverClass,
  showTerminatesBadge = false,
  showOperatorHint = false,
  showNumericTextHint = false,
}) {
  const toggleOption = (optId) => {
    const current = rule.optionIds || []
    const next = current.includes(optId)
      ? current.filter(id => id !== optId)
      : [...current, optId]
    onChange({ optionIds: next })
  }

  if (variant === 'choice') {
    return (
      <>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-500 shrink-0">{matchModeLabel}</span>
          <div className="flex rounded-lg overflow-hidden border border-ink-200">
            {[['any', 'ANY option selected'], ['all', 'ALL options selected']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => onChange({ matchMode: v })}
                className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  rule.matchMode === v ? 'bg-ink-800 text-white' : 'bg-white text-ink-500 hover:bg-ink-50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
          {options.length === 0 && (
            <p className="text-xs text-ink-300 italic">
              {question.pipedOptionsConfig?.enabled
                ? 'Configure option piping above to see dynamic options here.'
                : 'Add options to the question first.'}
            </p>
          )}
          {options.map(opt => {
            const selected = (rule.optionIds || []).includes(opt.id)
            return (
              <label key={opt.id} className="flex items-center gap-2 cursor-pointer group py-0.5">
                <div
                  onClick={() => toggleOption(opt.id)}
                  className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                    selected ? checkboxSelectedClass : `border-ink-300 ${checkboxHoverClass}`
                  }`}
                >
                  {selected && <CheckIcon />}
                </div>
                <span className="text-xs text-ink-700 flex-1 truncate">
                  {opt.text || <span className="italic text-ink-300">Untitled option</span>}
                </span>
                {showTerminatesBadge && opt.terminates && (
                  <span className="text-xs text-rose-500 shrink-0">⚡ also instant</span>
                )}
              </label>
            )
          })}
        </div>
      </>
    )
  }

  if (variant === 'date') {
    return (
      <ValueOperatorRuleFields
        rule={rule}
        question={question}
        onChange={onChange}
        FieldsComponent={DateConditionFields}
        needsValue={dateOperatorNeedsValue}
        showHint={showOperatorHint}
      />
    )
  }

  if (variant === 'slider') {
    return (
      <ValueOperatorRuleFields
        rule={rule}
        question={question}
        onChange={onChange}
        FieldsComponent={SliderConditionFields}
        needsValue={sliderOperatorNeedsValue}
        showHint={showOperatorHint}
      />
    )
  }

  if (variant === 'text') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-500 shrink-0 w-16">Operator</span>
          <TextOperatorSelect
            value={rule.textOperator}
            onChange={v => onChange({ textOperator: v })}
            question={question}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-500 shrink-0 w-16">Value</span>
          <input
            type="text"
            value={rule.textValue ?? ''}
            onChange={e => onChange({ textValue: e.target.value })}
            placeholder="Enter value…"
            className="input-base py-1.5 text-sm flex-1"
          />
        </div>
        {!String(rule.textValue ?? '').trim() && (
          <p className="text-xs text-amber-600">Enter a value — this rule has no effect until you do.</p>
        )}
        {showOperatorHint && rule.textOperator && (
          <p className="text-xs text-ink-400 bg-ink-50 rounded-lg px-2 py-1">
            ℹ {getTextOperatorHint(rule.textOperator, question)}
            {showNumericTextHint && isNumericTextOperator(rule.textOperator) && (
              <span className="ml-1 text-amber-600"> — answer must be numeric</span>
            )}
          </p>
        )}
      </div>
    )
  }

  return null
}
