import { Plus, Trash2, GitBranch } from 'lucide-react'
import { isChoiceType, isMatrixType } from '@/utils/questionHelpers'
import { getBuilderConditionOptions } from '@/utils/questionOptions'
import { buildPageTargets } from '@/utils/builderLayout'
import { TEXT_OPERATORS } from '@/utils/conditionConstants'
import { TextOperatorSelect } from '@/components/shared/TextOperatorSelect'

function TargetPageSelect({ value, targets, onChange }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="input-base py-1.5 text-xs font-medium"
    >
      <option value="">— Select target page —</option>
      {targets.map(t => (
        <option key={t.id} value={t.id}>{t.label}</option>
      ))}
    </select>
  )
}

function BranchRuleCard({
  rule, ruleIndex, question, dispatch, onDelete, showChoiceRules, pageTargets, contextItems = [],
}) {
  const opts = getBuilderConditionOptions(question, contextItems)
  const isText = rule.ruleType === 'text'
  const isMatrix = rule.ruleType === 'matrix'
  const rows = question.matrixConfig?.rows || []
  const cols = question.matrixConfig?.columns || []

  const update = (patch) =>
    dispatch({ type: 'UPDATE_BRANCH_RULE', questionId: question.id, ruleId: rule.id, patch })

  const toggleOption = (optId) => {
    const field = isMatrix ? 'matrixColumnIds' : 'optionIds'
    const current = rule[field] || []
    const next = current.includes(optId)
      ? current.filter(id => id !== optId)
      : [...current, optId]
    update({ [field]: next })
  }

  const targetLabel = pageTargets.find(t => t.id === rule.targetPageBreakId)?.label || 'No page selected'

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

  return (
    <div className="border border-sky-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-3 py-2 bg-sky-50">
        <GitBranch size={12} className="text-sky-600 shrink-0" />
        <span className="text-xs font-bold text-sky-700">Rule {ruleIndex + 1}</span>

        {showChoiceRules && !isMatrix && (
          <div className="flex rounded-lg overflow-hidden border border-sky-200 ml-1">
            {[['choice', 'Choice'], ['text', 'Text']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => update({ ruleType: v })}
                className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                  rule.ruleType === v ? 'bg-sky-600 text-white' : 'bg-white text-sky-600 hover:bg-sky-50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <span className="text-xs text-sky-500 flex-1 truncate ml-1">{summary()} → {targetLabel}</span>
        <button onClick={onDelete} className="p-1 text-sky-400 hover:text-sky-700 transition-colors shrink-0">
          <Trash2 size={12} />
        </button>
      </div>

      <div className="px-3 py-3 space-y-2.5">
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Skip to page</label>
          <TargetPageSelect
            value={rule.targetPageBreakId}
            targets={pageTargets}
            onChange={v => update({ targetPageBreakId: v })}
          />
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
                          selected ? 'border-sky-600 bg-sky-600' : 'border-ink-300 group-hover:border-sky-400'
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
                        selected ? 'border-sky-600 bg-sky-600' : 'border-ink-300 group-hover:border-sky-400'
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
                value={rule.textValue}
                onChange={e => update({ textValue: e.target.value })}
                placeholder="Enter value…"
                className="input-base py-1.5 text-sm flex-1"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function BranchEditor({ question, dispatch, allItems = [], itemIndex = 0, contextItems = [] }) {
  const rules = question.branchRules || []
  const isChoiceQ = isChoiceType(question.questionType)
  const isPipedQ = question.pipedOptionsConfig?.enabled
  const isMatrixQ = isMatrixType(question.questionType)
  const showChoiceRule = isChoiceQ || isPipedQ
  const pageTargets = buildPageTargets(allItems, itemIndex)
  const ruleContextItems = contextItems.length ? contextItems : allItems

  const addRule = (ruleType) =>
    dispatch({ type: 'ADD_BRANCH_RULE', questionId: question.id, ruleType })

  const deleteRule = (ruleId) =>
    dispatch({ type: 'DELETE_BRANCH_RULE', questionId: question.id, ruleId })

  return (
    <div>
      {rules.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-sky-50 border border-sky-100 rounded-lg">
          <span className="text-xs bg-sky-600 text-white px-2 py-0.5 rounded flex items-center gap-1">
            <GitBranch size={9} /> {rules.length} branch rule{rules.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {pageTargets.length <= 1 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
          Add a page break after this question to enable skip-to-page branching.
        </p>
      )}

      {rules.length > 0 && (
        <div className="space-y-2.5 mb-3">
          {rules.map((rule, ri) => (
            <BranchRuleCard
              key={rule.id}
              rule={rule}
              ruleIndex={ri}
              question={question}
              dispatch={dispatch}
              onDelete={() => deleteRule(rule.id)}
              showChoiceRules={showChoiceRule}
              pageTargets={pageTargets}
              contextItems={ruleContextItems}
            />
          ))}
        </div>
      )}

      {rules.length === 0 && pageTargets.length > 1 && (
        <p className="text-xs text-ink-300 italic py-1 mb-2">No branch rules yet — add one below.</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {isMatrixQ && (
          <button
            onClick={() => addRule('matrix')}
            disabled={pageTargets.length <= 1}
            className="flex items-center gap-1.5 text-xs text-sky-700 hover:text-sky-800 font-medium px-3 py-1.5 border border-sky-200 hover:bg-sky-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={12} /> Matrix rule
          </button>
        )}
        {showChoiceRule && (
          <button
            onClick={() => addRule('choice')}
            disabled={pageTargets.length <= 1}
            className="flex items-center gap-1.5 text-xs text-sky-700 hover:text-sky-800 font-medium px-3 py-1.5 border border-sky-200 hover:bg-sky-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={12} /> Choice rule
          </button>
        )}
        {!isMatrixQ && (
          <button
            onClick={() => addRule('text')}
            disabled={pageTargets.length <= 1}
            className="flex items-center gap-1.5 text-xs text-sky-700 hover:text-sky-800 font-medium px-3 py-1.5 border border-sky-200 hover:bg-sky-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={12} /> Text rule
          </button>
        )}
      </div>

      {rules.length > 0 && (
        <p className="text-xs text-ink-400 mt-3">
          Rules are checked when the respondent clicks Next. The first matching rule skips ahead; otherwise the survey continues sequentially.
        </p>
      )}
    </div>
  )
}

export default BranchEditor
