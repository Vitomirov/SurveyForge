import { useReducer, useState, useMemo, useCallback } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'

import { surveyReducer, INITIAL_STATE } from '@/store/surveyStore'
import {
  QuestionCard,
  PageBreakItem, GroupItem, TerminationBlockItem, TextBlockItem,
} from '@/components/builder/items'
import { SurveyPreview } from '@/components/taker'
import {
  SurveyTestRunner, CoverPageSettings, BrandingSettings,
  FingerprintSettings, DNCManager, SurveyMetadata, ExportManager,
} from '@/components/builder'
import { AddPanel, StatsPanel, EmptyState } from '@/components/builder/panels'
import { RichTextEditor } from '@/components/shared'
import { useAutosave } from '@/hooks/useAutosave'
import { useApi } from '@/config/api'
import { buildItemMeta, buildAvailableQuestionsByIndex, buildGroupQuestionCounts } from '@/utils/builderLayout'
import { generateTemplateCSV, downloadCSV } from '@/utils/csvExport'
import {
  Plus, Save, Eye, BarChart3, Layers,
  Scissors, Download, PlayCircle, ArrowLeft, FileText,
} from 'lucide-react'
export function SurveyBuilder({ initialState, initialRevision = null, onBackToDashboard }) {
  const [state, dispatch] = useReducer(surveyReducer, initialState || INITIAL_STATE)

  const { saveStatus } = useAutosave({
    survey: state.survey,
    items: state.items,
    revision: initialRevision,
  })

  const handleActivateItem = useCallback((id) => {
    dispatch({ type: 'TOGGLE_ACTIVE_ITEM', id })
  }, [])

  const sortableItemIds = useMemo(
    () => state.items.map(i => i.id),
    [state.items]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const [dragActiveId, setDragActiveId] = useState(null)
  const [showTest, setShowTest]         = useState(false)
  const [showExport, setShowExport]     = useState(false)

  // ── Compute display info (memoized — only when items change) ─────────────
  const itemMeta = useMemo(
    () => buildItemMeta(state.items),
    [state.items]
  )

  const availableQuestionsByIndex = useMemo(
    () => buildAvailableQuestionsByIndex(state.items),
    [state.items]
  )

  const groupQuestionCounts = useMemo(
    () => buildGroupQuestionCounts(state.items, itemMeta),
    [state.items, itemMeta]
  )

  // ── Drag handlers ──────────────────────────────────────────────────────
  const handleDragStart = (e) => setDragActiveId(e.active.id)

  const handleDragEnd = (event) => {
    setDragActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = state.items.findIndex(i => i.id === active.id)
    const newIdx = state.items.findIndex(i => i.id === over.id)
    dispatch({ type: 'REORDER_ITEMS', items: arrayMove(state.items, oldIdx, newIdx) })
  }

  // ── Save JSON ──────────────────────────────────────────────────────────
  const handleSave = () => {
    const blob = new Blob([JSON.stringify({ survey: state.survey, items: state.items, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `${(state.survey.title || 'survey').replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
    dispatch({ type: 'MARK_SAVED' })
  }

  // ── Export CSV template ─────────────────────────────────────────────────
  const handleExportCSVTemplate = () => {
    const csv = generateTemplateCSV(state.items, state.survey)
    downloadCSV(csv, `${(state.survey.title || 'survey').replace(/\s+/g, '_')}_template.csv`)
  }

  const draggedItem = state.items.find(i => i.id === dragActiveId)

  // ── Preview mode ───────────────────────────────────────────────────────
  if (state.showPreview) {
    return (
      <SurveyPreview
        survey={state.survey}
        items={state.items}
        onClose={() => dispatch({ type: 'SET_PREVIEW', show: false })}
      />
    )
  }

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      {/* ── Top Nav ──────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-ink-200 sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="p-1.5 text-ink-400 hover:text-ink-700 hover:bg-ink-100 rounded-lg transition-all mr-1"
                title="Back to dashboard"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Layers size={14} className="text-white" />
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={onBackToDashboard}
              onKeyDown={e => e.key === 'Enter' && onBackToDashboard?.()}
              className={`font-bold text-ink-800 tracking-tight${onBackToDashboard ? ' cursor-pointer hover:text-brand-600 transition-colors' : ''}`}
            >
              SurveyForge
            </span>
          </div>
          <div className="w-px h-5 bg-ink-100" />
          <input
            type="text"
            value={state.survey.title}
            onChange={e => dispatch({ type: 'SET_SURVEY_FIELD', field: 'title', value: e.target.value })}
            className="text-sm font-medium text-ink-700 bg-transparent border-none outline-none focus:bg-ink-50 px-2 py-1 rounded-lg transition-colors flex-1 min-w-0 max-w-sm"
            placeholder="Survey title..."
          />
          {useApi && saveStatus === 'saving' && (
            <span className="text-xs text-ink-400 font-medium shrink-0">Saving…</span>
          )}
          {useApi && saveStatus === 'saved' && (
            <span className="text-xs text-emerald-600 font-medium shrink-0">Saved</span>
          )}
          {useApi && saveStatus === 'error' && (
            <span className="text-xs text-rose-500 font-medium shrink-0">Save failed</span>
          )}
          {!useApi && state.isDirty && (
            <span className="text-xs text-amber-500 font-medium shrink-0">● Unsaved</span>
          )}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {/* Survey date format setting */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-ink-50 rounded-lg mr-1">
              <span className="text-xs text-ink-400">Date:</span>
              <select
                value={state.survey.defaultDateFormat || 'DD/MM/YYYY'}
                onChange={e => dispatch({ type: 'SET_SURVEY_FIELD', field: 'defaultDateFormat', value: e.target.value })}
                className="text-xs bg-transparent border-none outline-none text-ink-600 font-medium font-mono"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <button
              onClick={handleExportCSVTemplate}
              className="btn-ghost text-xs px-2.5 py-1.5"
              title="Download CSV column template"
            >
              <Download size={13} /> <span className="hidden md:inline">CSV Template</span>
            </button>

            <button
              onClick={() => setShowExport(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
              title="Open Export Manager — download response data"
            >
              <BarChart3 size={14} /> Exports
            </button>

            <button
              onClick={() => setShowTest(true)}
              className="btn-ghost text-xs px-2.5 py-1.5"
            >
              <PlayCircle size={13} /> <span className="hidden md:inline">Test</span>
            </button>

            <button
              onClick={() => dispatch({ type: 'SET_PREVIEW', show: true })}
              className="btn-ghost text-xs px-2.5 py-1.5"
            >
              <Eye size={13} /> <span className="hidden md:inline">Preview</span>
            </button>

            <button onClick={handleSave} className="btn-primary text-sm px-3 py-1.5">
              <Download size={14} /> Save JSON
            </button>
          </div>
        </div>
      </header>

      {/* ── Layout ───────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-6 flex gap-6">

        {/* ── Main list ──────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* Survey header card */}
          <div className="card p-4 mb-5">
            <input
              type="text"
              value={state.survey.title}
              onChange={e => dispatch({ type: 'SET_SURVEY_FIELD', field: 'title', value: e.target.value })}
              placeholder="Survey Title"
              className="w-full text-xl font-bold text-ink-900 bg-transparent border-none outline-none focus:bg-ink-50 px-2 py-1 rounded-lg -ml-2 mb-1 transition-colors"
            />
            <div className="mb-1">
              <RichTextEditor
                value={state.survey.description}
                onChange={html => dispatch({ type: 'SET_SURVEY_FIELD', field: 'description', value: html })}
                placeholder="Survey description (optional)... use the toolbar to format it"
              />
            </div>

            {/* Branding — company logo */}
            <BrandingSettings survey={state.survey} dispatch={dispatch} />

            {/* Internal metadata — admin only */}
            <SurveyMetadata survey={state.survey} dispatch={dispatch} />

            {/* Cover page */}
            <CoverPageSettings survey={state.survey} dispatch={dispatch} />

            {/* Screen-out message config */}
            <details className="mt-3 border-t border-ink-100 pt-3">
              <summary className="text-xs font-semibold text-ink-400 uppercase tracking-wider cursor-pointer hover:text-ink-600 select-none flex items-center gap-1.5">
                <span>⚙</span> Screen-out &amp; closed survey messages
              </summary>
              <div className="mt-3 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-ink-500">Screen-out page</p>
                  <div>
                    <label className="text-xs text-ink-500 mb-1 block">Title</label>
                    <input type="text" value={state.survey.settings?.terminateTitle || ''}
                      onChange={e => dispatch({ type: 'SET_SURVEY_SETTING', key: 'terminateTitle', value: e.target.value })}
                      placeholder="Thank you for your time." className="input-base text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-500 mb-1 block">Message</label>
                    <textarea rows={2} value={state.survey.settings?.terminateMessage || ''}
                      onChange={e => dispatch({ type: 'SET_SURVEY_SETTING', key: 'terminateMessage', value: e.target.value })}
                      placeholder="Unfortunately, you do not qualify for this survey."
                      className="input-base text-sm resize-none" />
                  </div>
                </div>
                <div className="space-y-2 border-t border-ink-100 pt-3">
                  <p className="text-xs font-semibold text-ink-500">Closed survey page</p>
                  <p className="text-xs text-ink-400">Shown when status is set to Closed and someone visits the survey URL.</p>
                  <div>
                    <label className="text-xs text-ink-500 mb-1 block">Title</label>
                    <input type="text" value={state.survey.settings?.closedTitle || ''}
                      onChange={e => dispatch({ type: 'SET_SURVEY_SETTING', key: 'closedTitle', value: e.target.value })}
                      placeholder="This survey is now closed." className="input-base text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-500 mb-1 block">Message</label>
                    <textarea rows={2} value={state.survey.settings?.closedMessage || ''}
                      onChange={e => dispatch({ type: 'SET_SURVEY_SETTING', key: 'closedMessage', value: e.target.value })}
                      placeholder="Thank you for your interest. This survey is no longer accepting responses."
                      className="input-base text-sm resize-none" />
                  </div>
                </div>
              </div>
            </details>

            {/* Shareable survey URL */}
            {state.survey.id && (
              <div className="mt-3 border-t border-ink-100 pt-3">
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  🔗 Shareable survey URL
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-ink-100 text-ink-600 px-2 py-1.5 rounded-lg truncate font-mono">
                    {`${window.location.origin}${window.location.pathname}#/take/${state.survey.id}`}
                  </code>
                  <button
                    onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}#/take/${state.survey.id}`)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2.5 py-1.5 border border-brand-200 hover:bg-brand-50 rounded-lg transition-all shrink-0"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-ink-400 mt-1.5">
                  Status: <strong>{state.survey.status || 'draft'}</strong>
                  {state.survey.status !== 'live' && (
                    <span className="text-amber-600"> — set status to Live to accept responses</span>
                  )}
                </p>
              </div>
            )}

            {/* Digital fingerprinting */}
            <FingerprintSettings survey={state.survey} dispatch={dispatch} />

            {/* DNC / Exclusion list */}
            <DNCManager surveyId={state.survey.id} />
          </div>

          {state.items.length === 0 ? (
            <EmptyState onAdd={type => dispatch({ type: 'ADD_QUESTION', qtype: type })} />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {state.items.map((item, idx) => {
                    const meta = itemMeta[idx]

                    if (item.itemType === 'page_break') {
                      const availableQuestions = availableQuestionsByIndex[idx]
                      return (
                        <PageBreakItem
                          key={item.id}
                          item={item}
                          pageNumber={meta.pageNum}
                          dispatch={dispatch}
                          availableQuestions={availableQuestions}
                          isActive={state.activeItemId === item.id}
                          onActivateItem={handleActivateItem}
                        />
                      )
                    }

                    if (item.itemType === 'group') {
                      const availableQuestions = availableQuestionsByIndex[idx]
                      return (
                        <GroupItem
                          key={item.id}
                          item={item}
                          questionCount={groupQuestionCounts[item.id] || 0}
                          dispatch={dispatch}
                          availableQuestions={availableQuestions}
                          isActive={state.activeItemId === item.id}
                          onActivateItem={handleActivateItem}
                        />
                      )
                    }

                    if (item.itemType === 'termination_block') {
                      const availableQuestions = availableQuestionsByIndex[idx]
                      return (
                        <TerminationBlockItem
                          key={item.id}
                          item={item}
                          availableQuestions={availableQuestions}
                          isActive={state.activeItemId === item.id}
                          onActivateItem={handleActivateItem}
                          dispatch={dispatch}
                        />
                      )
                    }

                    if (item.itemType === 'text_block') {
                      const availableQuestions = availableQuestionsByIndex[idx]
                      return (
                        <TextBlockItem
                          key={item.id}
                          item={item}
                          dispatch={dispatch}
                          availableQuestions={availableQuestions}
                          isActive={state.activeItemId === item.id}
                          onActivateItem={handleActivateItem}
                        />
                      )
                    }

                    // question
                    if (meta.hidden) return null

                    const inGroup = !!meta.currentGroupId
                    const availableQuestions = availableQuestionsByIndex[idx]
                    return (
                      <div key={item.id} className={inGroup ? 'ml-4 border-l-2 border-ink-200 pl-3' : ''}>
                        <QuestionCard
                          question={item}
                          questionNumber={meta.questionNumber}
                          isActive={state.activeItemId === item.id}
                          dispatch={dispatch}
                          onActivateItem={handleActivateItem}
                          focusOptionId={
                            state.activeItemId === item.id ? state.focusOptionId : null
                          }
                          surveyDateFormat={state.survey.defaultDateFormat || 'DD/MM/YYYY'}
                          availableQuestions={availableQuestions}
                        />
                      </div>
                    )
                  })}
                </div>
              </SortableContext>

              <DragOverlay>
                {draggedItem && (
                  <div className="card drag-overlay px-4 py-3 flex items-center gap-3">
                    <span className="text-sm font-medium text-ink-600 truncate">
                      {draggedItem.itemType === 'question' ? (draggedItem.text || 'Untitled question') :
                       draggedItem.itemType === 'page_break' ? '— Page Break —' :
                       draggedItem.title || 'Group'}
                    </span>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}

          {/* Bottom add buttons */}
          {state.items.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => dispatch({ type: 'ADD_QUESTION', qtype: 'single_select' })}
                className="flex items-center gap-2 text-sm text-ink-400 hover:text-brand-600 font-medium px-4 py-2 border border-dashed border-ink-200 hover:border-brand-300 rounded-xl transition-all"
              >
                <Plus size={15} /> Add question
              </button>
              <button
                onClick={() => dispatch({ type: 'ADD_PAGE_BREAK' })}
                className="flex items-center gap-2 text-sm text-ink-400 hover:text-ink-700 font-medium px-4 py-2 border border-dashed border-ink-200 hover:border-ink-300 rounded-xl transition-all"
              >
                <Scissors size={15} /> Page break
              </button>
              <button
                onClick={() => dispatch({ type: 'ADD_TEXT_BLOCK' })}
                className="flex items-center gap-2 text-sm text-ink-400 hover:text-emerald-600 font-medium px-4 py-2 border border-dashed border-ink-200 hover:border-emerald-300 rounded-xl transition-all"
              >
                <FileText size={15} /> Text / Media
              </button>
            </div>
          )}
        </main>

        {/* ── Right sidebar — sticky ──────────────────────────────── */}
        <aside className="w-64 shrink-0 space-y-4 sticky top-16 self-start max-h-[calc(100vh-4.5rem)] overflow-y-auto pb-4">
          <AddPanel
            onAddQuestion={type => dispatch({ type: 'ADD_QUESTION', qtype: type })}
            onAddPageBreak={() => dispatch({ type: 'ADD_PAGE_BREAK' })}
            onAddGroup={() => dispatch({ type: 'ADD_GROUP' })}
            onAddTerminationBlock={() => dispatch({ type: 'ADD_TERMINATION_BLOCK' })}
            onAddTextBlock={() => dispatch({ type: 'ADD_TEXT_BLOCK' })}
          />
          {state.items.length > 0 && <StatsPanel items={state.items} />}
        </aside>
      </div>

      {/* ── Test Runner modal ────────────────────────────────────────── */}
      {showTest && (
        <SurveyTestRunner
          survey={state.survey}
          items={state.items}
          onClose={() => setShowTest(false)}
        />
      )}

      {/* ── Export Manager modal ─────────────────────────────────────── */}
      {showExport && (
        <ExportManager
          survey={state.survey}
          items={state.items}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
