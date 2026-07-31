import { Plus, UserX, Link2, Link2Off } from 'lucide-react'
import { isPipeableSource } from '@/utils/piping'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { ChoiceOptionRow } from './ChoiceOptionRow'
import { TerminationEditor } from './TerminationEditor'
import { Divider, SectionLabel, Toggle } from '@/components/ui'

export function ChoiceEditor({ question, dispatch, focusOptionId, availableQuestions = [] }) {
  const pipeableSources = availableQuestions.filter(q => isPipeableSource(q.questionType))
  const pipeCfg         = question.pipedOptionsConfig || {}
  const pipingEnabled   = pipeCfg.enabled || false
  const setPipeCfg = (patch) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { pipedOptionsConfig: { ...pipeCfg, ...patch } } })
  const sourceQ = pipeableSources.find(q => q.id === pipeCfg.sourceQuestionId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = question.options.findIndex(o => o.id === active.id)
    const newIndex = question.options.findIndex(o => o.id === over.id)
    dispatch({ type: 'REORDER_OPTIONS', questionId: question.id, options: arrayMove(question.options, oldIndex, newIndex) })
  }

  const topAnchored    = question.options.filter(o => o.anchorPosition === 'top').length
  const bottomAnchored = question.options.filter(o => o.anchorPosition === 'bottom').length
  const hasExclusive   = question.options.some(o => o.isExclusive)
  const hasOpenText    = question.options.some(o => o.openText?.enabled)
  const termOptCount   = question.options.filter(o => o.terminates).length
  const ruleCount      = (question.terminationRules || []).length

  return (
    <div>
      {/* ── Option piping panel ─────────────────────────────────────────── */}
      <div className={`mb-3 p-3 rounded-xl border-2 transition-all ${pipingEnabled ? 'border-brand-400 bg-brand-50' : 'border-ink-100 bg-ink-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {pipingEnabled ? <Link2 size={13} className="text-brand-600" /> : <Link2Off size={13} className="text-ink-400" />}
            <span className={`text-sm font-semibold ${pipingEnabled ? 'text-brand-700' : 'text-ink-600'}`}>
              Pipe options from earlier question
            </span>
          </div>
          <Toggle checked={pipingEnabled} onChange={v => setPipeCfg({ enabled: v, sourceQuestionId: null })} />
        </div>

        {pipingEnabled && (
          <div className="mt-2.5 space-y-2">
            {pipeableSources.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                No compatible questions found before this one. Add a single-select, multi-select, or dropdown question earlier in the survey.
              </p>
            ) : (
              <>
                <select
                  value={pipeCfg.sourceQuestionId || ''}
                  onChange={e => setPipeCfg({ sourceQuestionId: e.target.value || null })}
                  className="input-base text-sm"
                >
                  <option value="">— Select source question —</option>
                  {pipeableSources.map((q, idx) => (
                    <option key={q.id} value={q.id}>
                      Q{availableQuestions.indexOf(q) + 1}: {q.text || '(untitled)'}
                    </option>
                  ))}
                </select>
                {sourceQ && (
                  <p className="text-xs text-brand-600">
                    ✓ In preview, this question's options will be built from whatever the respondent selected in Q{availableQuestions.indexOf(sourceQ) + 1}. The manual options below are ignored while piping is active.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Dim manual options when piping is active */}
      <div className={pipingEnabled ? 'opacity-40 pointer-events-none select-none' : ''}>
      {/* Summary badges */}
      {(topAnchored > 0 || bottomAnchored > 0 || hasExclusive || hasOpenText || termOptCount > 0 || ruleCount > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-ink-50 rounded-lg">
          {topAnchored > 0    && <span className="text-xs text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded">⚓ {topAnchored} top</span>}
          {bottomAnchored > 0 && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">⚓ {bottomAnchored} bottom</span>}
          {hasExclusive       && <span className="text-xs text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">⊘ Exclusive</span>}
          {hasOpenText        && <span className="text-xs text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded">💬 Open-text</span>}
          {termOptCount > 0   && <span className="text-xs text-white bg-rose-600 px-2 py-0.5 rounded flex items-center gap-1"><UserX size={9} /> {termOptCount} instant</span>}
          {ruleCount > 0      && <span className="text-xs text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded">{ruleCount} rule{ruleCount !== 1 ? 's' : ''} · {question.terminationLogic || 'if_any'}</span>}
        </div>
      )}

      <SectionLabel>Answer Options</SectionLabel>
      <p className="text-xs text-ink-400 mb-2">
        <strong>Enter</strong> to add next · <strong>Paste lines</strong> to bulk-add ·{' '}
        <UserX size={10} className="inline text-rose-500" /> for instant screen-out
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={question.options.map(o => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {question.options.map((option, index) => (
              <ChoiceOptionRow
                key={option.id}
                option={option}
                questionId={question.id}
                questionType={question.questionType}
                dispatch={dispatch}
                canDelete={question.options.length > 1}
                index={index}
                focusOptionId={focusOptionId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={() => dispatch({ type: 'ADD_OPTION', questionId: question.id })}
        className="mt-2 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium px-2 py-1.5 hover:bg-brand-50 rounded-lg transition-all w-full"
      >
        <Plus size={15} /> Add option
      </button>

      {/* Multi-select limits */}
      {question.questionType === 'multi_select' && (
        <>
          <Divider label="Selection Limits" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-500 mb-1 block">Min selections</label>
              <input type="number" min={1} max={question.options.length} value={question.minSelections ?? ''}
                onChange={e => dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { minSelections: e.target.value ? parseInt(e.target.value) : null } })}
                placeholder="None" className="input-base" />
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">Max selections</label>
              <input type="number" min={1} max={question.options.length} value={question.maxSelections ?? ''}
                onChange={e => dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { maxSelections: e.target.value ? parseInt(e.target.value) : null } })}
                placeholder="None" className="input-base" />
            </div>
          </div>
        </>
      )}

      {/* Screen-out rules — available for all choice types */}
      <Divider label="Screen-out Rules" />
      <TerminationEditor question={question} dispatch={dispatch} />

      <Divider label="Display" />
      <div className="flex items-center justify-between p-2.5 bg-ink-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-ink-700">Randomize options</p>
          <p className="text-xs text-ink-400">Anchored options stay fixed</p>
        </div>
        <Toggle checked={question.randomizeOptions} onChange={val => dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { randomizeOptions: val } })} />
      </div>
      </div>{/* end piping-dimmed wrapper */}
    </div>
  )
}

export default ChoiceEditor
