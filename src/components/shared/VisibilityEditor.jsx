import { Plus, X, Eye, EyeOff, GitBranch } from 'lucide-react'
import { Toggle, SectionLabel } from '@/components/ui'

const CHOICE_CONDITION_TYPES = [
  { value: 'any_of', label: 'is any of',  hint: 'Answer includes at least one of' },
  { value: 'none_of', label: 'is none of', hint: 'Answer includes none of' },
  { value: 'all_of',  label: 'is all of',  hint: 'Answer includes ALL of (multi-select)' },
]
const TEXT_CONDITION_TYPES = [
  { value: 'contains',     label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'equals',       label: 'equals' },
  { value: 'not_equals',   label: 'does not equal' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than',    label: 'is less than' },
]

function conditionSummary(cond, questions) {
  const q = questions.find(q => q.id === cond.questionId)
  if (!q) return <span className="italic text-violet-300">Pick a question</span>
  const qLabel = q.text ? `"${q.text.slice(0, 26)}${q.text.length > 26 ? '…' : ''}"` : 'Question'
  const isChoice = ['single_select', 'multi_select', 'dropdown'].includes(q.questionType)
  if (isChoice) {
    const labels = cond.optionIds.map(id => q.options?.find(o => o.id === id)?.text || '?').filter(Boolean)
    const ct = CHOICE_CONDITION_TYPES.find(t => t.value === cond.conditionType)?.label || cond.conditionType
    return <>{qLabel} <em className="text-violet-300">{ct}</em> {labels.length ? `[${labels.join(', ')}]` : <span className="italic text-violet-300">no options</span>}</>
  }
  return <>{qLabel} <em className="text-violet-300">{cond.textOperator?.replace(/_/g, ' ')}</em> "{cond.textValue || '…'}"</>
}

function ConditionRow({ cond, index, itemId, availableQuestions, dispatch }) {
  const q        = availableQuestions.find(q => q.id === cond.questionId)
  const isChoice = q && ['single_select', 'multi_select', 'dropdown'].includes(q.questionType)
  const opts     = q?.options || []

  const update = (patch) =>
    dispatch({ type: 'UPDATE_VISIBILITY_CONDITION', itemId, conditionId: cond.id, patch })
  const del = () =>
    dispatch({ type: 'DELETE_VISIBILITY_CONDITION', itemId, conditionId: cond.id })

  const setQuestion = (qId) => {
    const newQ = availableQuestions.find(q => q.id === qId)
    const isC  = newQ && ['single_select', 'multi_select', 'dropdown'].includes(newQ.questionType)
    update({ questionId: qId, optionIds: [], conditionType: isC ? 'any_of' : undefined, textOperator: isC ? undefined : 'contains', textValue: '' })
  }

  const toggleOption = (optId) => {
    const next = cond.optionIds.includes(optId)
      ? cond.optionIds.filter(id => id !== optId)
      : [...cond.optionIds, optId]
    update({ optionIds: next })
  }

  return (
    <div className="border border-violet-800/40 rounded-xl overflow-hidden">
      {index > 0 && (
        <div className="flex justify-center py-1 bg-violet-950/30">
          <button
            onClick={() => update({ join: cond.join === 'OR' ? 'AND' : 'OR' })}
            className={`px-4 py-0.5 rounded-full text-xs font-bold tracking-widest transition-all border ${
              cond.join === 'OR'
                ? 'bg-amber-500 text-white border-amber-400 hover:bg-amber-600'
                : 'bg-violet-700 text-white border-violet-600 hover:bg-violet-800'
            }`}
          >
            {cond.join || 'AND'}
          </button>
        </div>
      )}

      <div className="p-3 space-y-2.5 bg-violet-950/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Condition {index + 1}</span>
          <button onClick={del} className="p-1 text-violet-600 hover:text-violet-400 transition-colors">
            <X size={13} />
          </button>
        </div>

        <div>
          <label className="text-xs text-violet-400 mb-1 block">Question</label>
          <select
            value={cond.questionId}
            onChange={e => setQuestion(e.target.value)}
            className="w-full bg-violet-950/40 border border-violet-800/50 text-violet-100 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="">— Select a question —</option>
            {availableQuestions.map((q, qi) => (
              <option key={q.id} value={q.id}>Q{qi + 1}. {q.text || '(untitled)'}</option>
            ))}
          </select>
        </div>

        {q && (
          <div>
            <label className="text-xs text-violet-400 mb-1 block">Condition</label>
            <select
              value={isChoice ? (cond.conditionType || 'any_of') : (cond.textOperator || 'contains')}
              onChange={e => isChoice ? update({ conditionType: e.target.value }) : update({ textOperator: e.target.value })}
              className="w-full bg-violet-950/40 border border-violet-800/50 text-violet-100 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {(isChoice ? CHOICE_CONDITION_TYPES : TEXT_CONDITION_TYPES).map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        {q && isChoice && opts.length > 0 && (
          <div>
            <label className="text-xs text-violet-400 mb-1.5 block">Options</label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {opts.map(opt => {
                const sel = cond.optionIds.includes(opt.id)
                return (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                    <div
                      onClick={() => toggleOption(opt.id)}
                      className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        sel ? 'border-violet-400 bg-violet-500' : 'border-violet-800 group-hover:border-violet-500'
                      }`}
                    >
                      {sel && (
                        <svg viewBox="0 0 10 10" fill="none" className="w-2 h-2">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-violet-200 truncate">{opt.text || <em className="text-violet-600">Untitled</em>}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {q && !isChoice && (
          <div>
            <label className="text-xs text-violet-400 mb-1 block">Value</label>
            <input
              type="text"
              value={cond.textValue}
              onChange={e => update({ textValue: e.target.value })}
              placeholder="Enter value…"
              className="w-full bg-violet-950/40 border border-violet-800/50 text-violet-100 placeholder:text-violet-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            {['greater_than', 'less_than'].includes(cond.textOperator) && (
              <p className="text-xs text-violet-600 mt-1">Answer must be numeric</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * VisibilityEditor — drop this into any item's expanded editor panel
 * (question, page break, group). `itemId` must point at the item itself;
 * `vis` is `item.visibility`; `availableQuestions` should be every question
 * that appears before this item in the survey flow.
 */
export function VisibilityEditor({ itemId, vis, availableQuestions, dispatch }) {
  const conditions = vis?.conditions || []
  const enabled    = vis?.enabled || false
  const mode       = vis?.mode || 'show_if'

  const setMode = (m) =>
    dispatch({ type: 'SET_ITEM_VISIBILITY_MODE', itemId, patch: { mode: m } })

  const setEnabled = (val) =>
    dispatch({ type: 'SET_ITEM_VISIBILITY_MODE', itemId, patch: { enabled: val } })

  const addCondition = () =>
    dispatch({ type: 'ADD_VISIBILITY_CONDITION', itemId })

  return (
    <div className="border border-violet-200 rounded-xl overflow-hidden bg-violet-50/40">
      {/* Header / toggle */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-violet-100/50">
        <div className="flex items-center gap-2">
          <GitBranch size={13} className="text-violet-500" />
          <span className="text-sm font-semibold text-violet-800">Conditional visibility</span>
        </div>
        <Toggle checked={enabled} onChange={setEnabled} />
      </div>

      {enabled && (
        <div className="p-3 space-y-3">
          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('show_if')}
              className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                mode === 'show_if' ? 'border-emerald-400 bg-emerald-50' : 'border-ink-200 bg-white hover:border-ink-300'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Eye size={12} className={mode === 'show_if' ? 'text-emerald-600' : 'text-ink-400'} />
                <span className={`text-xs font-bold ${mode === 'show_if' ? 'text-emerald-700' : 'text-ink-600'}`}>Show if</span>
              </div>
              <p className="text-xs text-ink-400 leading-snug">Only visible when conditions match</p>
            </button>
            <button
              onClick={() => setMode('hide_if')}
              className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                mode === 'hide_if' ? 'border-rose-400 bg-rose-50' : 'border-ink-200 bg-white hover:border-ink-300'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <EyeOff size={12} className={mode === 'hide_if' ? 'text-rose-600' : 'text-ink-400'} />
                <span className={`text-xs font-bold ${mode === 'hide_if' ? 'text-rose-700' : 'text-ink-600'}`}>Hide if</span>
              </div>
              <p className="text-xs text-ink-400 leading-snug">Hidden when conditions match</p>
            </button>
          </div>

          {/* Available questions hint */}
          {availableQuestions.length === 0 ? (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                No questions appear before this item yet — move it later in the survey, or add earlier questions to reference.
              </p>
            </div>
          ) : (
            <p className="text-xs text-violet-400">
              {availableQuestions.length} question{availableQuestions.length !== 1 ? 's' : ''} available to reference
            </p>
          )}

          {/* Conditions */}
          <div className="space-y-0">
            {conditions.map((cond, i) => (
              <ConditionRow
                key={cond.id}
                cond={cond}
                index={i}
                itemId={itemId}
                availableQuestions={availableQuestions}
                dispatch={dispatch}
              />
            ))}
          </div>

          <button
            onClick={addCondition}
            disabled={availableQuestions.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-violet-600 hover:text-violet-700 border border-dashed border-violet-300 hover:border-violet-500 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={13} /> Add condition
          </button>

          {/* Logic explainer / preview */}
          {conditions.length > 0 && (
            <div className="p-2.5 bg-violet-950/90 rounded-lg">
              <p className="text-xs text-violet-300 font-semibold mb-1 uppercase tracking-wider">
                {mode === 'hide_if' ? 'Hidden when' : 'Shown only when'}
              </p>
              <p className="text-xs text-violet-200 font-mono leading-relaxed">
                {conditions.map((c, i) => (
                  <span key={c.id} className="block">
                    {i > 0 && <span className={c.join === 'OR' ? 'text-amber-400' : 'text-violet-400'}>{c.join} </span>}
                    {conditionSummary(c, availableQuestions)}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
