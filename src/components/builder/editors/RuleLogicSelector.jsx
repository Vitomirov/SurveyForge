import { SectionLabel } from '@/components/ui'
import { QUESTION_RULE_LOGIC, normalizeQuestionRuleLogic } from '@/utils/questionRuleLogic'

const OPTIONS = {
  termination: {
    if_any: {
      title: 'Terminate if ANY rule fires',
      desc: 'Screen out respondent when at least one condition is met.',
      example: 'e.g. "Male" OR "Under 18" → terminate',
      compact: 'Terminate if ANY rule fires',
    },
    if_none: {
      title: 'Terminate if NONE of the rules fire',
      desc: 'Respondent must satisfy at least one rule to continue.',
      example: 'e.g. Must select "Daily user" OR "Power user" to qualify',
      compact: 'Terminate if NONE fire',
    },
  },
  branch: {
    if_any: {
      title: 'Skip if ANY rule fires',
      desc: 'Jump ahead when at least one condition is met. Each rule can target a different page.',
      example: 'e.g. "Yes" → Page 3, "Maybe" → Page 5',
      compact: 'Skip if ANY rule fires',
    },
    if_none: {
      title: 'Skip if NONE of the rules fire',
      desc: 'Continue sequentially when a rule matches; otherwise skip to the fallback page.',
      example: 'e.g. Must pick "Expert" or "Advanced" to stay on path; others skip ahead',
      compact: 'Skip if NONE fire',
    },
  },
}

const VARIANT_STYLES = {
  termination: {
    active: 'border-rose-400 bg-rose-50 text-rose-700',
    inactive: 'border-ink-200 text-ink-500',
    detailedActive: 'border-rose-400 bg-rose-50',
    radioActive: 'border-rose-500 bg-rose-500',
  },
  branch: {
    active: 'border-sky-400 bg-sky-50 text-sky-700',
    inactive: 'border-ink-200 text-ink-500',
    detailedActive: 'border-sky-400 bg-sky-50',
    radioActive: 'border-sky-600 bg-sky-600',
  },
}

export function RuleLogicSelector({
  purpose,
  value,
  onChange,
  compact = false,
  showLabel = true,
  className = '',
}) {
  const logic = normalizeQuestionRuleLogic(value)
  const opts = OPTIONS[purpose]
  const styles = VARIANT_STYLES[purpose]

  if (compact) {
    return (
      <div className={`flex gap-2 ${className}`}>
        {[QUESTION_RULE_LOGIC.IF_ANY, QUESTION_RULE_LOGIC.IF_NONE].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 text-xs font-medium px-2 py-1.5 rounded-lg border transition-all ${
              logic === v ? styles.active : styles.inactive
            }`}
          >
            {opts[v].compact}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      {showLabel && <SectionLabel>Rule evaluation logic</SectionLabel>}
      <div className="grid grid-cols-1 gap-1.5">
        {[QUESTION_RULE_LOGIC.IF_ANY, QUESTION_RULE_LOGIC.IF_NONE].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
              logic === v ? styles.detailedActive : 'border-ink-200 bg-white hover:border-ink-300'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                logic === v ? styles.radioActive : 'border-ink-300'
              }`}>
                {logic === v && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-800">{opts[v].title}</p>
                <p className="text-xs text-ink-500 mt-0.5">{opts[v].desc}</p>
                <p className="text-xs text-ink-400 italic mt-0.5">{opts[v].example}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default RuleLogicSelector
