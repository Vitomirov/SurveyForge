import { useState } from 'react'
import { Trash2, GripVertical, ChevronRight, ChevronDown, Plus, Zap, X } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Condition type options by question type ───────────────────────────────
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
  if (!q) return <span className="italic text-rose-300">Pick a question</span>
  const qLabel = q.text ? `"${q.text.slice(0, 30)}${q.text.length > 30 ? '…' : ''}"` : `Question`
  const isChoice = ['single_select', 'multi_select', 'dropdown'].includes(q.questionType)
  if (isChoice) {
    const labels = cond.optionIds.map(id => q.options?.find(o => o.id === id)?.text || '?').filter(Boolean)
    const ct = CHOICE_CONDITION_TYPES.find(t => t.value === cond.conditionType)?.label || cond.conditionType
    return <>{qLabel} <em className="text-rose-300">{ct}</em> {labels.length ? `[${labels.join(', ')}]` : <span className="italic text-rose-300">no options</span>}</>
  }
  return <>{qLabel} <em className="text-rose-300">{cond.textOperator?.replace(/_/g, ' ')}</em> "{cond.textValue || '…'}"</>
}

// ─── Single condition editor ───────────────────────────────────────────────
function ConditionRow({ cond, index, blockId, availableQuestions, dispatch }) {
  const q       = availableQuestions.find(q => q.id === cond.questionId)
  const isChoice = q && ['single_select', 'multi_select', 'dropdown'].includes(q.questionType)
  const opts    = q?.options || []

  const update = (patch) =>
    dispatch({ type: 'UPDATE_TERMINATION_CONDITION', blockId, conditionId: cond.id, patch })

  const del = () =>
    dispatch({ type: 'DELETE_TERMINATION_CONDITION', blockId, conditionId: cond.id })

  // When question changes, reset condition fields
  const setQuestion = (qId) => {
    const newQ = availableQuestions.find(q => q.id === qId)
    const isC = newQ && ['single_select', 'multi_select', 'dropdown'].includes(newQ.questionType)
    update({ questionId: qId, optionIds: [], conditionType: isC ? 'any_of' : undefined, textOperator: isC ? undefined : 'contains', textValue: '' })
  }

  const toggleOption = (optId) => {
    const next = cond.optionIds.includes(optId)
      ? cond.optionIds.filter(id => id !== optId)
      : [...cond.optionIds, optId]
    update({ optionIds: next })
  }

  return (
    <div className="border border-rose-800/40 rounded-xl overflow-hidden">
      {/* AND / OR connector — shown above every condition except the first */}
      {index > 0 && (
        <div className="flex justify-center py-1 bg-rose-950/30">
          <button
            onClick={() => update({ join: cond.join === 'OR' ? 'AND' : 'OR' })}
            className={`px-4 py-0.5 rounded-full text-xs font-bold tracking-widest transition-all border ${
              cond.join === 'OR'
                ? 'bg-amber-500 text-white border-amber-400 hover:bg-amber-600'
                : 'bg-rose-700 text-white border-rose-600 hover:bg-rose-800'
            }`}
          >
            {cond.join || 'AND'}
          </button>
        </div>
      )}

      <div className="p-3 space-y-2.5 bg-rose-950/20">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
            Condition {index + 1}
          </span>
          <button onClick={del} className="p-1 text-rose-600 hover:text-rose-400 transition-colors">
            <X size={13} />
          </button>
        </div>

        {/* Question selector */}
        <div>
          <label className="text-xs text-rose-400 mb-1 block">Question</label>
          <select
            value={cond.questionId}
            onChange={e => setQuestion(e.target.value)}
            className="w-full bg-rose-950/40 border border-rose-800/50 text-rose-100 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="">— Select a question —</option>
            {availableQuestions.map((q, qi) => (
              <option key={q.id} value={q.id}>
                Q{qi + 1}. {q.text || '(untitled)'}
              </option>
            ))}
          </select>
        </div>

        {/* Condition type */}
        {q && (
          <div>
            <label className="text-xs text-rose-400 mb-1 block">Condition</label>
            <select
              value={isChoice ? (cond.conditionType || 'any_of') : (cond.textOperator || 'contains')}
              onChange={e => isChoice ? update({ conditionType: e.target.value }) : update({ textOperator: e.target.value })}
              className="w-full bg-rose-950/40 border border-rose-800/50 text-rose-100 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              {(isChoice ? CHOICE_CONDITION_TYPES : TEXT_CONDITION_TYPES).map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Values */}
        {q && isChoice && opts.length > 0 && (
          <div>
            <label className="text-xs text-rose-400 mb-1.5 block">Options</label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {opts.map(opt => {
                const sel = cond.optionIds.includes(opt.id)
                return (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                    <div
                      onClick={() => toggleOption(opt.id)}
                      className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        sel ? 'border-rose-400 bg-rose-500' : 'border-rose-800 group-hover:border-rose-500'
                      }`}
                    >
                      {sel && (
                        <svg viewBox="0 0 10 10" fill="none" className="w-2 h-2">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-rose-200 truncate">{opt.text || <em className="text-rose-600">Untitled</em>}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {q && !isChoice && (
          <div>
            <label className="text-xs text-rose-400 mb-1 block">Value</label>
            <input
              type="text"
              value={cond.textValue}
              onChange={e => update({ textValue: e.target.value })}
              placeholder="Enter value…"
              className="w-full bg-rose-950/40 border border-rose-800/50 text-rose-100 placeholder:text-rose-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            {['greater_than', 'less_than'].includes(cond.textOperator) && (
              <p className="text-xs text-rose-600 mt-1">Answer must be numeric</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Condition summary for collapsed view ──────────────────────────────────
function CollapsedSummary({ conditions, questions }) {
  if (!conditions.length)
    return <span className="italic text-rose-600 text-xs">No conditions — click to configure</span>

  return (
    <div className="flex flex-wrap items-center gap-1">
      {conditions.map((cond, i) => (
        <span key={cond.id} className="flex items-center gap-1">
          {i > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
              cond.join === 'OR' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-800/40 text-rose-400'
            }`}>
              {cond.join}
            </span>
          )}
          <span className="text-xs text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/30">
            {conditionSummary(cond, questions)}
          </span>
        </span>
      ))}
    </div>
  )
}

// ─── Main TerminationBlockItem ─────────────────────────────────────────────
export function TerminationBlockItem({ item, availableQuestions, isActive, onActivate, dispatch }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const conditions = item.conditions || []
  const hasConditions = conditions.length > 0

  return (
    <div ref={setNodeRef} style={style}>
      <div className={`rounded-xl overflow-hidden border transition-all ${
        isActive ? 'border-rose-500 shadow-lg shadow-rose-900/30' : 'border-rose-900/50 hover:border-rose-700'
      } bg-gradient-to-r from-rose-950 to-slate-950`}>

        {/* ── Header ── */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer"
          onClick={onActivate}
        >
          {/* Drag handle */}
          <div
            {...attributes} {...listeners}
            className="drag-handle text-rose-800 hover:text-rose-600 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical size={15} />
          </div>

          {/* Icon */}
          <div className="w-6 h-6 rounded-lg bg-rose-600 flex items-center justify-center shrink-0">
            <Zap size={12} className="text-white" />
          </div>

          {/* Title + summary */}
          <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={item.title}
              onChange={e => dispatch({ type: 'UPDATE_ITEM', id: item.id, patch: { title: e.target.value } })}
              placeholder="Termination Block"
              className="bg-transparent border-none outline-none text-sm font-semibold text-rose-100 placeholder:text-rose-700 w-full mb-0.5"
            />
            {!isActive && (
              <div className="mt-0.5">
                <CollapsedSummary conditions={conditions} questions={availableQuestions} />
              </div>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            {hasConditions && (
              <span className="text-xs bg-rose-700/50 text-rose-300 px-1.5 py-0.5 rounded-full">
                {conditions.length} cond{conditions.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={() => dispatch({ type: 'DELETE_ITEM', id: item.id })}
              className="p-1.5 text-rose-700 hover:text-rose-400 hover:bg-rose-900/40 rounded-lg transition-all"
            >
              <Trash2 size={13} />
            </button>
            <div className={`transition-transform duration-150 text-rose-700 ${isActive ? 'rotate-90' : ''}`}>
              <ChevronRight size={15} />
            </div>
          </div>
        </div>

        {/* ── Expanded condition editor ── */}
        {isActive && (
          <div className="border-t border-rose-900/50 px-3 pt-3 pb-4 space-y-3">

            {/* Logic explainer */}
            <div className="p-2.5 bg-rose-950/50 rounded-lg border border-rose-900/30">
              <p className="text-xs text-rose-400 leading-relaxed">
                <strong className="text-rose-300">How this works:</strong> This block evaluates all
                conditions using <em>AND before OR</em> precedence — so{' '}
                <code className="bg-rose-900/40 px-1 rounded">A AND B OR C</code> fires when{' '}
                <code className="bg-rose-900/40 px-1 rounded">(A AND B)</code> is true, or{' '}
                <code className="bg-rose-900/40 px-1 rounded">C</code> alone is true.
                Termination fires when the block evaluates to <strong className="text-rose-300">true</strong>.
                Checked when the respondent clicks Next.
              </p>
            </div>

            {/* Available questions hint */}
            {availableQuestions.length === 0 ? (
              <div className="p-2.5 bg-amber-950/40 border border-amber-800/40 rounded-lg">
                <p className="text-xs text-amber-400">
                  No questions before this block. Move it after some questions to reference them.
                </p>
              </div>
            ) : (
              <p className="text-xs text-rose-600">
                {availableQuestions.length} question{availableQuestions.length !== 1 ? 's' : ''} available (all questions before this block)
              </p>
            )}

            {/* Conditions */}
            <div className="space-y-0">
              {conditions.map((cond, i) => (
                <ConditionRow
                  key={cond.id}
                  cond={cond}
                  index={i}
                  blockId={item.id}
                  availableQuestions={availableQuestions}
                  dispatch={dispatch}
                />
              ))}
            </div>

            {/* Add condition */}
            <button
              onClick={() => dispatch({ type: 'ADD_TERMINATION_CONDITION', blockId: item.id })}
              disabled={availableQuestions.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 border border-dashed border-rose-800 hover:border-rose-600 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus size={13} /> Add Condition
            </button>

            {/* Live preview of logic */}
            {conditions.length > 1 && (
              <div className="p-2.5 bg-rose-950/60 rounded-lg border border-rose-900/40">
                <p className="text-xs text-rose-500 font-semibold mb-1.5 uppercase tracking-wider">
                  Logic Preview
                </p>
                <p className="text-xs text-rose-300 font-mono leading-relaxed">
                  {buildLogicString(conditions, availableQuestions)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Build human-readable logic string ────────────────────────────────────
function buildLogicString(conditions, questions) {
  return conditions.map((c, i) => {
    const q    = questions.find(q => q.id === c.questionId)
    const qLbl = q ? `Q${questions.indexOf(q) + 1}` : '?'
    const isChoice = q && ['single_select', 'multi_select', 'dropdown'].includes(q.questionType)
    let condStr
    if (isChoice) {
      const ct = CHOICE_CONDITION_TYPES.find(t => t.value === c.conditionType)?.label || c.conditionType
      const opts = c.optionIds.map(id => q?.options?.find(o => o.id === id)?.text || '?')
      condStr = `${qLbl} ${ct} [${opts.join(', ') || 'none'}]`
    } else {
      const op = TEXT_CONDITION_TYPES.find(t => t.value === c.textOperator)?.label || c.textOperator
      condStr = `${qLbl} ${op} "${c.textValue || '…'}"`
    }
    if (i === 0) return condStr
    return `${c.join || 'AND'} ${condStr}`
  }).join('\n')
}
