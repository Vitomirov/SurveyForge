import { Plus, Trash2, ExternalLink } from 'lucide-react'
import { isChoiceType, isMatrixType } from '@/utils/questionHelpers'
import { getBuilderConditionOptions } from '@/utils/questionOptions'
import { isSafeExternalUrl } from '@/utils/externalRedirectEngine'
import { TEXT_OPERATORS } from '@/utils/conditionConstants'
import { TextOperatorSelect } from '@/components/shared/TextOperatorSelect'

function ExternalRedirectRuleCard({
  rule, ruleIndex, question, dispatch, onDelete, showChoiceRules, contextItems = [],
}) {
  const opts = getBuilderConditionOptions(question, contextItems)
  const isText = rule.ruleType === 'text' || question.questionType === 'open_text'
  const isMatrix = rule.ruleType === 'matrix'
  const rows = question.matrixConfig?.rows || []
  const cols = question.matrixConfig?.columns || []
  const urlValid = !rule.externalUrl || isSafeExternalUrl(rule.externalUrl)

  const update = (patch) =>
    dispatch({ type: 'UPDATE_EXTERNAL_REDIRECT_RULE', questionId: question.id, ruleId: rule.id, patch })

  const toggleOption = (optId) => {
    const field = isMatrix ? 'matrixColumnIds' : 'optionIds'
    const current = rule[field] || []
    const next = current.includes(optId)
      ? current.filter(id => id !== optId)
      : [...current, optId]
    update({ [field]: next })
  }

  const summary = () => {
    if (isMatrix) {
      const row = rows.find(r => r.id === rule.matrixRowId)
      const colLabels = (rule.matrixColumnIds || []).map(id => cols.find(c => c.id === id)?.text || '?')
      return `${row?.text || 'Row'} → ${colLabels.length ? colLabels.join(', ') : 'no columns'}`
    }
    if (isText) {
      const op = TEXT_OPERATORS.find(o => o.value === rule.textOperator)?.label || rule.textOperator
      return `Answer ${op} "${rule.textValue || '…'}"`
    }
    const labels = (rule.optionIds || []).map(id => opts.find(o => o.id === id)?.text || '?')
    if (!labels.length) return 'No options selected'
    if (rule.matchMode === 'all') return `ALL of: ${labels.join(' + ')}`
    return `ANY of: ${labels.join(', ')}`
  }

  const urlPreview = rule.externalUrl?.trim() || 'No URL set'

  return (
    <div className="border border-emerald-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50">
        <ExternalLink size={12} className="text-emerald-600 shrink-0" />
        <span className="text-xs font-bold text-emerald-700">Rule {ruleIndex + 1}</span>

        {showChoiceRules && !isMatrix && (
          <div className="flex rounded-lg overflow-hidden border border-emerald-200 ml-1">
            {[['choice', 'Choice'], ['text', 'Text']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => update({ ruleType: v })}
                className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                  rule.ruleType === v ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <span className="text-xs text-emerald-500 flex-1 truncate ml-1">{summary()} → {urlPreview}</span>
        <button onClick={onDelete} className="p-1 text-emerald-400 hover:text-emerald-700 transition-colors shrink-0">
          <Trash2 size={12} />
        </button>
      </div>

      <div className="px-3 py-3 space-y-2.5">
        <div>
          <label className="text-xs text-ink-500 mb-1 block">External URL</label>
          <input
            type="url"
            value={rule.externalUrl || ''}
            onChange={e => update({ externalUrl: e.target.value })}
            placeholder="https://example.com/landing-page"
            className={`input-base py-1.5 text-sm ${!urlValid ? 'border-amber-400' : ''}`}
          />
          {!urlValid && (
            <p className="text-xs text-amber-600 mt-1">Enter a valid http:// or https:// URL.</p>
          )}
        </div>

        {isMatrix && (
          <>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">Matrix row</label>
              <select
                value={rule.matrixRowId || ''}
                onChange={e => update({ matrixRowId: e.target.value, matrixColumnIds: [] })}
                className="input-base py-1.5 text-xs"
              >
                <option value="">— Select row —</option>
                {rows.map(row => (
                  <option key={row.id} value={row.id}>{row.text || '(untitled row)'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1.5 block">Columns</label>
              <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                {cols.map(col => {
                  const selected = (rule.matrixColumnIds || []).includes(col.id)
                  return (
                    <label key={col.id} className="flex items-center gap-2 cursor-pointer group py-0.5">
                      <div
                        onClick={() => toggleOption(col.id)}
                        className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          selected ? 'border-emerald-600 bg-emerald-600' : 'border-ink-300 group-hover:border-emerald-400'
                        }`}
                      >
                        {selected && (
                          <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-ink-700 truncate">{col.text || '(untitled)'}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {!isText && !isMatrix && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-500 shrink-0">When</span>
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

            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
              {opts.length === 0 && (
                <p className="text-xs text-ink-300 italic">
                  {question.pipedOptionsConfig?.enabled
                    ? 'Configure option piping above to see dynamic options here.'
                    : 'Add options to the question first.'}
                </p>
              )}
              {opts.map(opt => {
                const selected = (rule.optionIds || []).includes(opt.id)
                return (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer group py-0.5">
                    <div
                      onClick={() => toggleOption(opt.id)}
                      className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        selected ? 'border-emerald-600 bg-emerald-600' : 'border-ink-300 group-hover:border-emerald-400'
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
                  </label>
                )
              })}
            </div>
          </>
        )}

        {isText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-500 shrink-0 w-16">Operator</span>
              <TextOperatorSelect
                value={rule.textOperator}
                onChange={v => update({ textOperator: v })}
                question={question}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-500 shrink-0 w-16">Value</span>
              <input
                type="text"
                value={rule.textValue ?? ''}
                onChange={e => update({ textValue: e.target.value })}
                placeholder="Enter value…"
                className="input-base py-1.5 text-sm flex-1"
              />
            </div>
            {!String(rule.textValue ?? '').trim() && (
              <p className="text-xs text-amber-600">Enter a value — this rule has no effect until you do.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function ExternalRedirectEditor({ question, dispatch, contextItems = [] }) {
  const rules = question.externalRedirectRules || []
  const isChoiceQ = isChoiceType(question.questionType)
  const isPipedQ = question.pipedOptionsConfig?.enabled
  const isMatrixQ = isMatrixType(question.questionType)
  const showChoiceRule = isChoiceQ || isPipedQ

  const addRule = (ruleType) =>
    dispatch({ type: 'ADD_EXTERNAL_REDIRECT_RULE', questionId: question.id, ruleType })

  const deleteRule = (ruleId) =>
    dispatch({ type: 'DELETE_EXTERNAL_REDIRECT_RULE', questionId: question.id, ruleId })

  return (
    <div>
      {rules.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
          <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded flex items-center gap-1">
            <ExternalLink size={9} /> {rules.length} external redirect rule{rules.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {rules.length > 0 && (
        <div className="space-y-2.5 mb-3">
          {rules.map((rule, ri) => (
            <ExternalRedirectRuleCard
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
        <p className="text-xs text-ink-300 italic py-1 mb-2">No external redirect rules yet — add one below.</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {isMatrixQ && (
          <button
            onClick={() => addRule('matrix')}
            className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium px-3 py-1.5 border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-all"
          >
            <Plus size={12} /> Matrix rule
          </button>
        )}
        {showChoiceRule && (
          <button
            onClick={() => addRule('choice')}
            className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium px-3 py-1.5 border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-all"
          >
            <Plus size={12} /> Choice rule
          </button>
        )}
        {!isMatrixQ && (
          <button
            onClick={() => addRule('text')}
            className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium px-3 py-1.5 border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-all"
          >
            <Plus size={12} /> Text rule
          </button>
        )}
      </div>

      {rules.length > 0 && (
        <p className="text-xs text-ink-400 mt-3">
          Matching rules redirect when the respondent clicks Next — they can change their answer or go back before then.
        </p>
      )}
    </div>
  )
}

export default ExternalRedirectEditor
