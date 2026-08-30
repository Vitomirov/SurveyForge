import { TextOperatorSelect, getTextOperatorHint } from '@/components/shared/conditions/TextOperatorSelect'

export function ValueOperatorRuleFields({
  rule,
  question,
  onChange,
  FieldsComponent,
  needsValue,
  showHint = false,
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-500 shrink-0 w-16">Operator</span>
        <TextOperatorSelect
          value={rule.textOperator}
          onChange={v => onChange({ textOperator: v, textValue: '', textValue2: '' })}
          question={question}
        />
      </div>
      <FieldsComponent
        operator={rule.textOperator}
        textValue={rule.textValue}
        textValue2={rule.textValue2}
        question={question}
        onChange={onChange}
      />
      {needsValue(rule.textOperator) && !String(rule.textValue ?? '').trim() && (
        <p className="text-xs text-amber-600">Enter a value — this rule has no effect until you do.</p>
      )}
      {showHint && rule.textOperator && (
        <p className="text-xs text-ink-400 bg-ink-50 rounded-lg px-2 py-1">
          ℹ {getTextOperatorHint(rule.textOperator, question)}
        </p>
      )}
    </div>
  )
}
