import { useState } from 'react'
import { Plus, Trash2, UserX, AlertTriangle, ChevronDown } from 'lucide-react'
import { SectionLabel, Divider } from '@/components/ui'
import { isChoiceType } from '@/utils/questionHelpers'
import { getBuilderConditionOptions } from '@/utils/questionOptions'
import { TEXT_OPERATORS } from '@/utils/conditionConstants'
import { TextOperatorSelect, getTextOperatorHint, isNumericTextOperator } from '@/components/shared/TextOperatorSelect'

function OperatorSelect({ value, onChange, question }) {
  return <TextOperatorSelect value={value} onChange={onChange} question={question} />
}

// ─── Single Rule card ──────────────────────────────────────────────────────
function RuleCard({ rule, ruleIndex, question, dispatch, onDelete, showChoiceRules, contextItems = [] }) {
  const opts    = getBuilderConditionOptions(question, contextItems)
  const isText  = rule.ruleType === 'text'

  const update = (patch) =>
    dispatch({ type: 'UPDATE_TERMINATION_RULE', questionId: question.id, ruleId: rule.id, patch })

  const toggleOption = (optId) => {
    const next = rule.optionIds.includes(optId)
      ? rule.optionIds.filter(id => id !== optId)
      : [...rule.optionIds, optId]
    update({ optionIds: next })
  }

  // Human-readable summary for collapsed view
  const summary = () => {
    if (isText) {
      const op = TEXT_OPERATORS.find(o => o.value === rule.textOperator)?.label || rule.textOperator
      return `Answer ${op} "${rule.textValue || '…'}"`
    }
    const labels = rule.optionIds.map(id => opts.find(o => o.id === id)?.text || '?')
    if (!labels.length) return 'No options selected'
    if (rule.matchMode === 'all') return `ALL of: ${labels.join(' + ')}`
    return `ANY of: ${labels.join(', ')}`
  }

  return (
    <div className="border border-rose-200 rounded-xl overflow-hidden bg-white">
      {/* Rule header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-rose-50">
        <UserX size={12} className="text-rose-500 shrink-0" />
        <span className="text-xs font-bold text-rose-600">Rule {ruleIndex + 1}</span>

        {/* Rule type toggle */}
        {showChoiceRules && (
          <div className="flex rounded-lg overflow-hidden border border-rose-200 ml-1">
            {[['choice', 'Choice'], ['text', 'Text']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => update({ ruleType: v })}
                className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                  rule.ruleType === v ? 'bg-rose-500 text-white' : 'bg-white text-rose-500 hover:bg-rose-50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <span className="text-xs text-rose-400 flex-1 truncate ml-1">{summary()}</span>
        <button onClick={onDelete} className="p-1 text-rose-400 hover:text-rose-600 transition-colors shrink-0">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Rule body */}
      <div className="px-3 py-3 space-y-2.5">
        {/* ── Choice rule ── */}
        {!isText && (
          <>
            {/* Match mode */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-500 shrink-0">Fire if</span>
              <div className="flex rounded-lg overflow-hidden border border-ink-200">
                {[['any', 'ANY option selected'], ['all', 'ALL options selected']].map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => update({ matchMode: v })}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                      rule.matchMode === v ? 'bg-ink-800 text-white' : 'bg-white text-ink-500 hover:bg-ink-50'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Option checkboxes */}
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
              {opts.length === 0 && (
                <p className="text-xs text-ink-300 italic">
                  {question.pipedOptionsConfig?.enabled
                    ? 'Configure option piping above to see dynamic options here.'
                    : 'Add options to the question first.'}
                </p>
              )}
              {opts.map(opt => {
                const selected = rule.optionIds.includes(opt.id)
                return (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer group py-0.5">
                    <div
                      onClick={() => toggleOption(opt.id)}
                      className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        selected ? 'border-rose-500 bg-rose-500' : 'border-ink-300 group-hover:border-rose-400'
                      }`}
                    >
                      {selected && (
                        <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-ink-700 flex-1 truncate">
                      {opt.text || <span className="italic text-ink-300">Untitled option</span>}
                    </span>
                    {opt.terminates && <span className="text-xs text-rose-500 shrink-0">⚡ also instant</span>}
                  </label>
                )
              })}
            </div>
          </>
        )}

        {/* ── Text rule ── */}
        {isText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-500 shrink-0 w-16">Operator</span>
              <OperatorSelect value={rule.textOperator} onChange={v => update({ textOperator: v })} question={question} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-500 shrink-0 w-16">Value</span>
              <input
                type="text"
                value={rule.textValue}
                onChange={e => update({ textValue: e.target.value })}
                placeholder="Enter value…"
                className="input-base py-1.5 text-sm flex-1"
              />
            </div>
            {/* Hint */}
            {rule.textOperator && (
              <p className="text-xs text-ink-400 bg-ink-50 rounded-lg px-2 py-1">
                ℹ {getTextOperatorHint(rule.textOperator)}
                {isNumericTextOperator(rule.textOperator) && (
                  <span className="ml-1 text-amber-600"> — answer must be numeric</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Note */}
        <input
          type="text"
          value={rule.note}
          onChange={e => update({ note: e.target.value })}
          placeholder="Internal note (optional)…"
          className="w-full text-xs border border-ink-100 rounded-lg px-2 py-1 bg-ink-50 placeholder:text-ink-300 focus:outline-none focus:ring-1 focus:ring-rose-300 focus:bg-white transition-colors"
        />
      </div>
    </div>
  )
}

// ─── Main TerminationEditor ────────────────────────────────────────────────
export function TerminationEditor({ question, dispatch, contextItems = [] }) {
  const rules          = question.terminationRules || []
  const logic          = question.terminationLogic || 'if_any'
  const isChoiceQ      = isChoiceType(question.questionType)
  const isPipedQ       = question.pipedOptionsConfig?.enabled
  const showChoiceRule = isChoiceQ || isPipedQ
  const effectiveOpts  = getBuilderConditionOptions(question, contextItems)
  const perOptCount    = effectiveOpts.filter(o => o.terminates).length

  const addRule = (ruleType) =>
    dispatch({ type: 'ADD_TERMINATION_RULE', questionId: question.id, ruleType })

  const deleteRule = (ruleId) =>
    dispatch({ type: 'DELETE_TERMINATION_RULE', questionId: question.id, ruleId })

  const setLogic = (val) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { terminationLogic: val } })

  // Build summary badge counts
  const choiceRuleCount = rules.filter(r => r.ruleType === 'choice' || !r.ruleType).length
  const textRuleCount   = rules.filter(r => r.ruleType === 'text').length
  const totalRules      = rules.length

  return (
    <div>
      {/* Summary pills */}
      {(perOptCount > 0 || totalRules > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-rose-50 border border-rose-100 rounded-lg">
          {perOptCount > 0 && (
            <span className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded flex items-center gap-1">
              <UserX size={9} /> {perOptCount} instant terminate{perOptCount !== 1 ? 's' : ''}
            </span>
          )}
          {totalRules > 0 && (
            <span className="text-xs bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1">
              <AlertTriangle size={9} /> {totalRules} rule{totalRules !== 1 ? 's' : ''} · <em>{logic === 'if_any' ? 'ANY fires' : 'NONE fires'}</em>
            </span>
          )}
        </div>
      )}

      {/* Logic mode selector */}
      <div className="mb-3">
        <SectionLabel>Rule evaluation logic</SectionLabel>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            {
              v: 'if_any',
              title: 'Terminate if ANY rule fires',
              desc: 'Screen out respondent when at least one condition is met.',
              example: 'e.g. "Male" OR "Under 18" → terminate',
            },
            {
              v: 'if_none',
              title: 'Terminate if NONE of the rules fire',
              desc: 'Respondent must satisfy at least one rule to continue.',
              example: 'e.g. Must select "Daily user" OR "Power user" to qualify',
            },
          ].map(({ v, title, desc, example }) => (
            <button
              key={v}
              onClick={() => setLogic(v)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                logic === v
                  ? 'border-rose-400 bg-rose-50'
                  : 'border-ink-200 bg-white hover:border-ink-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${logic === v ? 'border-rose-500 bg-rose-500' : 'border-ink-300'}`}>
                  {logic === v && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-800">{title}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{desc}</p>
                  <p className="text-xs text-ink-400 italic mt-0.5">{example}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Rules list */}
      {rules.length > 0 && (
        <div className="space-y-2.5 mb-3">
          {rules.map((rule, ri) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              ruleIndex={ri}
              question={question}
              dispatch={dispatch}
              onDelete={() => deleteRule(rule.id)}
              showChoiceRules={showChoiceRule}
              contextItems={contextItems}
            />
          ))}
        </div>
      )}

      {rules.length === 0 && (
        <p className="text-xs text-ink-300 italic py-1 mb-2">No rules yet — add one below.</p>
      )}

      {/* Add rule buttons */}
      <div className="flex gap-2 flex-wrap">
        {showChoiceRule && (
          <button
            onClick={() => addRule('choice')}
            className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-1.5 border border-rose-200 hover:bg-rose-50 rounded-lg transition-all"
          >
            <Plus size={12} /> Choice rule
          </button>
        )}
        <button
          onClick={() => addRule('text')}
          className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-1.5 border border-rose-200 hover:bg-rose-50 rounded-lg transition-all"
        >
          <Plus size={12} /> Text rule
        </button>
      </div>

      {/* Explain if_none */}
      {logic === 'if_none' && rules.length > 0 && (
        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Qualifying mode active:</strong> respondent is terminated if their answer matches <strong>none</strong> of the {rules.length} rule{rules.length !== 1 ? 's' : ''} above.
            They must satisfy at least one to continue.
          </p>
        </div>
      )}
    </div>
  )
}
