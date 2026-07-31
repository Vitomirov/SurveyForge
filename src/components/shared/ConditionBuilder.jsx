import { Plus, X } from 'lucide-react'
import { isChoiceType } from '@/utils/questionHelpers'
import {
  CHOICE_CONDITION_TYPES,
  TEXT_CONDITION_TYPES,
  getChoiceConditionLabel,
} from '@/utils/conditionConstants'

// ─── Theme tokens per variant ───────────────────────────────────────────────
const THEMES = {
  visibility: {
    border:           'border-violet-300',
    joinBar:          'bg-violet-100/90',
    joinAnd:          'bg-violet-700 text-white border-violet-600 hover:bg-violet-800',
    panel:            'bg-white',
    label:            'text-violet-800 font-medium',
    heading:          'text-violet-900',
    delete:           'text-violet-600 hover:text-violet-900 hover:bg-violet-100 rounded',
    select:           'bg-white border-violet-300 text-violet-950 focus:ring-violet-500',
    input:            'bg-white border-violet-300 text-violet-950 placeholder:text-violet-500 focus:ring-violet-500',
    optionBorder:     'border-violet-400 group-hover:border-violet-600',
    optionSelected:   'border-violet-700 bg-violet-700',
    optionText:       'text-violet-900',
    optionEmpty:      'text-violet-700',
    hint:             'text-violet-800',
    previewBg:        'bg-violet-100 border border-violet-200',
    previewHeading:   'text-violet-900',
    previewText:      'text-violet-950',
    previewEm:        'text-violet-800 font-semibold not-italic',
    previewEmpty:     'text-violet-700 italic',
    addBtn:           'text-violet-800 hover:text-violet-950 border-violet-400 hover:border-violet-600 hover:bg-violet-50',
    summaryEm:        'text-violet-800 font-semibold not-italic',
    summaryEmpty:     'text-violet-700 italic',
  },
  termination: {
    border:           'border-rose-800/40',
    joinBar:          'bg-rose-950/30',
    joinAnd:          'bg-rose-700 text-white border-rose-600 hover:bg-rose-800',
    panel:            'bg-rose-950/20',
    label:            'text-rose-400',
    heading:          'text-rose-400',
    delete:           'text-rose-600 hover:text-rose-400',
    select:           'bg-rose-950/40 border-rose-800/50 text-rose-100 focus:ring-rose-500',
    input:            'bg-rose-950/40 border-rose-800/50 text-rose-100 placeholder:text-rose-700 focus:ring-rose-500',
    optionBorder:     'border-rose-800 group-hover:border-rose-500',
    optionSelected:   'border-rose-400 bg-rose-500',
    optionText:       'text-rose-200',
    optionEmpty:      'text-rose-600',
    hint:             'text-rose-600',
    previewBg:        'bg-rose-950/60 border border-rose-900/40',
    previewHeading:   'text-rose-500',
    previewText:      'text-rose-300',
    previewEm:        'text-rose-300',
    previewEmpty:     'text-rose-300',
    addBtn:           'text-rose-400 hover:text-rose-300 border-rose-800 hover:border-rose-600',
    summaryEm:        'text-rose-300',
    summaryEmpty:     'text-rose-300',
  },
}

const JOIN_OR = 'bg-amber-500 text-white border-amber-400 hover:bg-amber-600'

// ─── Rich inline summary (JSX) ──────────────────────────────────────────────
export function ConditionSummaryInline({ cond, questions, variant = 'visibility', truncate = 26 }) {
  const theme = THEMES[variant] || THEMES.visibility
  const q = questions.find(q => q.id === cond.questionId)
  if (!q) return <span className={`italic ${theme.summaryEmpty}`}>Pick a question</span>

  const qLabel = q.text
    ? `"${q.text.slice(0, truncate)}${q.text.length > truncate ? '…' : ''}"`
    : (variant === 'termination' ? 'Question' : 'Question')

  if (isChoiceType(q.questionType)) {
    const labels = (cond.optionIds || []).map(id => q.options?.find(o => o.id === id)?.text || '?').filter(Boolean)
    const ct = getChoiceConditionLabel(cond.conditionType)
    return (
      <>
        {qLabel}{' '}
        <em className={theme.summaryEm}>{ct}</em>{' '}
        {labels.length
          ? `[${labels.join(', ')}]`
          : <span className={`italic ${theme.summaryEmpty}`}>no options</span>}
      </>
    )
  }

  return (
    <>
      {qLabel}{' '}
      <em className={theme.summaryEm}>{cond.textOperator?.replace(/_/g, ' ')}</em>{' '}
      "{cond.textValue || '…'}"
    </>
  )
}

/** Plain-text logic string using Q-numbers (termination block preview). */
export function buildConditionLogicString(conditions, questions) {
  return conditions.map((c, i) => {
    const q    = questions.find(q => q.id === c.questionId)
    const qLbl = q ? `Q${questions.indexOf(q) + 1}` : '?'
    let condStr
    if (q && isChoiceType(q.questionType)) {
      const ct   = getChoiceConditionLabel(c.conditionType)
      const opts = (c.optionIds || []).map(id => q.options?.find(o => o.id === id)?.text || '?')
      condStr = `${qLbl} ${ct} [${opts.join(', ') || 'none'}]`
    } else {
      const op = TEXT_CONDITION_TYPES.find(t => t.value === c.textOperator)?.label || c.textOperator
      condStr = `${qLbl} ${op} "${c.textValue || '…'}"`
    }
    if (i === 0) return condStr
    return `${c.join || 'AND'} ${condStr}`
  }).join('\n')
}

// ─── Single condition row ─────────────────────────────────────────────────────
function ConditionRow({
  cond, index, variant, availableQuestions,
  onUpdate, onDelete,
}) {
  const theme    = THEMES[variant] || THEMES.visibility
  const q        = availableQuestions.find(q => q.id === cond.questionId)
  const isChoice = q && isChoiceType(q.questionType)
  const opts     = q?.options || []

  const setQuestion = (qId) => {
    const newQ = availableQuestions.find(q => q.id === qId)
    const isC  = newQ && isChoiceType(newQ.questionType)
    onUpdate(cond.id, {
      questionId: qId,
      optionIds: [],
      conditionType: isC ? 'any_of' : undefined,
      textOperator: isC ? undefined : 'contains',
      textValue: '',
    })
  }

  const toggleOption = (optId) => {
    const next = (cond.optionIds || []).includes(optId)
      ? cond.optionIds.filter(id => id !== optId)
      : [...(cond.optionIds || []), optId]
    onUpdate(cond.id, { optionIds: next })
  }

  const fieldClass = `w-full border text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 ${theme.select}`

  return (
    <div className={`border ${theme.border} rounded-xl overflow-hidden`}>
      {index > 0 && (
        <div className={`flex justify-center py-1 ${theme.joinBar}`}>
          <button
            onClick={() => onUpdate(cond.id, { join: cond.join === 'OR' ? 'AND' : 'OR' })}
            className={`px-4 py-0.5 rounded-full text-xs font-bold tracking-widest transition-all border ${
              cond.join === 'OR' ? JOIN_OR : theme.joinAnd
            }`}
          >
            {cond.join || 'AND'}
          </button>
        </div>
      )}

      <div className={`p-3 space-y-2.5 ${theme.panel}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold uppercase tracking-wider ${theme.heading}`}>
            Condition {index + 1}
          </span>
          <button onClick={() => onDelete(cond.id)} className={`p-1 transition-colors ${theme.delete}`}>
            <X size={13} />
          </button>
        </div>

        <div>
          <label className={`text-xs mb-1 block ${theme.label}`}>Question</label>
          <select
            value={cond.questionId || ''}
            onChange={e => setQuestion(e.target.value)}
            className={fieldClass}
          >
            <option value="">— Select a question —</option>
            {availableQuestions.map((q, qi) => (
              <option key={q.id} value={q.id}>Q{qi + 1}. {q.text || '(untitled)'}</option>
            ))}
          </select>
        </div>

        {q && (
          <div>
            <label className={`text-xs mb-1 block ${theme.label}`}>Condition</label>
            <select
              value={isChoice ? (cond.conditionType || 'any_of') : (cond.textOperator || 'contains')}
              onChange={e => isChoice
                ? onUpdate(cond.id, { conditionType: e.target.value })
                : onUpdate(cond.id, { textOperator: e.target.value })}
              className={fieldClass}
            >
              {(isChoice ? CHOICE_CONDITION_TYPES : TEXT_CONDITION_TYPES).map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        {q && isChoice && opts.length > 0 && (
          <div>
            <label className={`text-xs mb-1.5 block ${theme.label}`}>Options</label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {opts.map(opt => {
                const sel = (cond.optionIds || []).includes(opt.id)
                return (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                    <div
                      onClick={() => toggleOption(opt.id)}
                      className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        sel ? theme.optionSelected : theme.optionBorder
                      }`}
                    >
                      {sel && (
                        <svg viewBox="0 0 10 10" fill="none" className="w-2 h-2">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs truncate ${theme.optionText}`}>
                      {opt.text || <em className={theme.optionEmpty}>Untitled</em>}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {q && !isChoice && (
          <div>
            <label className={`text-xs mb-1 block ${theme.label}`}>Value</label>
            <input
              type="text"
              value={cond.textValue || ''}
              onChange={e => onUpdate(cond.id, { textValue: e.target.value })}
              placeholder="Enter value…"
              className={fieldClass}
            />
            {['greater_than', 'less_than'].includes(cond.textOperator) && (
              <p className={`text-xs mt-1 ${theme.hint}`}>Answer must be numeric</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Shared condition list editor for visibility rules and termination blocks.
 * Parent supplies callbacks — no dispatch knowledge inside.
 */
export function ConditionBuilder({
  variant = 'visibility',
  conditions = [],
  availableQuestions = [],
  onUpdateCondition,
  onDeleteCondition,
  onAddCondition,
  previewLabel,
  previewMode = 'block', // 'block' = one condition per line; 'inline' = used externally
  addLabel = 'Add condition',
  truncate = 26,
}) {
  const theme = THEMES[variant] || THEMES.visibility

  return (
    <div className="space-y-3">
      {availableQuestions.length === 0 && (
        <div className={`p-2.5 rounded-lg border ${
          variant === 'termination'
            ? 'bg-amber-950/40 border-amber-800/40'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <p className={`text-xs ${variant === 'termination' ? 'text-amber-400' : 'text-amber-700'}`}>
            {variant === 'termination'
              ? 'No questions before this block. Move it after some questions to reference them.'
              : 'No questions appear before this item yet — move it later in the survey, or add earlier questions to reference.'}
          </p>
        </div>
      )}

      {availableQuestions.length > 0 && (
        <p className={`text-xs font-medium ${variant === 'termination' ? 'text-rose-600' : 'text-violet-800'}`}>
          {availableQuestions.length} question{availableQuestions.length !== 1 ? 's' : ''}{' '}
          {variant === 'termination' ? 'available (all questions before this block)' : 'available to reference'}
        </p>
      )}

      <div className="space-y-0">
        {conditions.map((cond, i) => (
          <ConditionRow
            key={cond.id}
            cond={cond}
            index={i}
            variant={variant}
            availableQuestions={availableQuestions}
            onUpdate={onUpdateCondition}
            onDelete={onDeleteCondition}
          />
        ))}
      </div>

      <button
        onClick={onAddCondition}
        disabled={availableQuestions.length === 0}
        className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold border border-dashed rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed ${theme.addBtn}`}
      >
        <Plus size={13} /> {addLabel}
      </button>

      {previewMode === 'block' && conditions.length > 0 && previewLabel && (
        <div className={`p-2.5 rounded-lg ${theme.previewBg}`}>
          <p className={`text-xs font-semibold mb-1 uppercase tracking-wider ${theme.previewHeading}`}>
            {previewLabel}
          </p>
          <p className={`text-xs font-mono leading-relaxed ${theme.previewText}`}>
            {conditions.map((c, i) => (
              <span key={c.id} className="block">
                {i > 0 && (
                  <span className={c.join === 'OR' ? 'text-amber-400' : theme.previewEm}>
                    {c.join}{' '}
                  </span>
                )}
                <ConditionSummaryInline
                  cond={c}
                  questions={availableQuestions}
                  variant={variant}
                  truncate={truncate}
                />
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  )
}
