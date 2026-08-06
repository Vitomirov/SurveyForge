import { useReducer, useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react'
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
  PageBreakItem, PageOneLockBar, GroupItem, TerminationBlockItem, TextBlockItem,
} from '@/components/builder/items'
import { PAGE_ONE_LOCK_ID } from '@/components/builder/items/PageOneLockBar'
import { RichTextEditor, NavigationLockEditor } from '@/components/shared'
import { PageLoader, InlineLoader } from '@/components/ui'
import {
  CoverPageSettings, BrandingSettings,
  FingerprintSettings, DNCManager, SurveyMetadata,
} from '@/components/builder'
import { AddPanel, StatsPanel, EmptyState } from '@/components/builder/panels'
import { useAutosave } from '@/hooks/useAutosave'
import { useApi } from '@/config/api'
import { buildItemMeta, buildAvailableQuestionsByIndex, buildGroupQuestionCounts } from '@/utils/builderLayout'
import { generateTemplateCSV, downloadCSV } from '@/utils/csvExport'
import { APP_NAME } from '@/constants/branding'
import { DEFAULT_DATE_FORMAT, DEFAULT_SCREEN_MESSAGES } from '@/constants/surveyDefaults'
import { resolveNavigationLockSeconds } from '@/constants/navigationLock'
import { prefetchCommonEditors, prefetchPreview, prefetchModule } from '@/utils/routePrefetch'
import { isChoiceType } from '@/utils/questionHelpers'
import { EDITOR_LOADERS, loadChoiceEditor } from '@/components/builder/editors/editorLoaders'
import {
  Plus, Eye, BarChart3, Layers,
  Scissors, Download, PlayCircle, ArrowLeft, FileText, Menu, X,
} from 'lucide-react'

const SurveyPreview    = lazy(() => import('@/components/taker/SurveyPreview.jsx'))
const SurveyTestRunner = lazy(() => import('@/components/builder/test-runner/SurveyTestRunner.jsx'))
const ExportManager    = lazy(() => import('@/components/builder/ExportManager.jsx'))

export function SurveyBuilder({ initialState, initialRevision = null, onBackToDashboard }) {
  const [state, dispatch] = useReducer(surveyReducer, initialState || INITIAL_STATE)

  useEffect(() => {
    prefetchCommonEditors()
    const items = initialState?.items ?? []
    const types = new Set(
      items.filter(i => i.itemType === 'question').map(i => i.questionType)
    )
    for (const type of types) {
      const loader = isChoiceType(type) ? loadChoiceEditor : EDITOR_LOADERS[type]
      if (loader) prefetchModule(loader)
    }
  }, [initialState])

  const { saveStatus } = useAutosave({
    survey: state.survey,
    items: state.items,
    revision: initialRevision,
    onSaved: (result, payload) => {
      if (result.publicPath && result.publicPath !== payload.survey.publicPath) {
        dispatch({ type: 'SET_SURVEY_FIELD', field: 'publicPath', value: result.publicPath })
      }
    },
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
  const [showMobilePanel, setShowMobilePanel] = useState(false)
  const [showMobileMenu, setShowMobileMenu]   = useState(false)

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

  const allPagesLockEnabled = useMemo(
    () => resolveNavigationLockSeconds(state.survey.settings?.navigationLockAllPages) > 0,
    [state.survey.settings?.navigationLockAllPages],
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
      <Suspense fallback={<PageLoader label="Loading preview…" />}>
        <SurveyPreview
          survey={state.survey}
          items={state.items}
          onClose={() => dispatch({ type: 'SET_PREVIEW', show: false })}
        />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* ── Top Nav ──────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-ink-200 shadow-sm shadow-ink-900/[0.03] sticky top-0 z-30 safe-top">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 min-h-14 py-2 sm:py-0 flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="p-1.5 text-ink-500 hover:text-ink-800 hover:bg-ink-100 active:bg-ink-200 rounded-lg transition-all focus-ring"
                title="Back to dashboard"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
              <Layers size={14} className="text-white" />
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={onBackToDashboard}
              onKeyDown={e => e.key === 'Enter' && onBackToDashboard?.()}
              className={`font-bold text-ink-800 tracking-tight truncate max-w-[120px] sm:max-w-none${onBackToDashboard ? ' cursor-pointer hover:text-brand-600 transition-colors' : ''}`}
            >
              {APP_NAME}
            </span>
          </div>
          <div className="hidden md:block w-px h-5 bg-ink-100 shrink-0" />
          <input
            type="text"
            value={state.survey.title}
            onChange={e => dispatch({ type: 'SET_SURVEY_FIELD', field: 'title', value: e.target.value })}
            className="hidden md:block text-sm font-medium text-ink-700 bg-transparent border-none outline-none focus:bg-ink-50 px-2 py-1 rounded-lg transition-colors flex-1 min-w-0 max-w-sm"
            placeholder="Survey title..."
          />
          {useApi && saveStatus === 'saving' && (
            <span className="text-xs text-ink-400 font-medium shrink-0">Saving…</span>
          )}
          {useApi && saveStatus === 'saved' && (
            <span className="text-xs text-emerald-600 font-medium shrink-0 hidden sm:inline">Saved</span>
          )}
          {useApi && saveStatus === 'error' && (
            <span className="text-xs text-rose-500 font-medium shrink-0">Failed</span>
          )}
          {!useApi && state.isDirty && (
            <span className="text-xs text-amber-500 font-medium shrink-0 hidden sm:inline">● Unsaved</span>
          )}
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Survey date format setting */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-ink-50 rounded-lg mr-1">
              <span className="text-xs text-ink-400">Date:</span>
              <select
                value={state.survey.defaultDateFormat || DEFAULT_DATE_FORMAT}
                onChange={e => dispatch({ type: 'SET_SURVEY_FIELD', field: 'defaultDateFormat', value: e.target.value })}
                className="text-xs bg-transparent border-none outline-none text-ink-600 font-medium font-mono"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value={DEFAULT_DATE_FORMAT}>{DEFAULT_DATE_FORMAT}</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            {/* Desktop toolbar */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={handleExportCSVTemplate}
                className="btn-ghost text-xs px-2.5 py-1.5"
                title="Download CSV column template"
              >
                <Download size={13} /> <span className="hidden md:inline">CSV Template</span>
              </button>

              <button
                onClick={() => setShowExport(true)}
                className="btn-secondary text-sm px-3 py-1.5"
                title="Open Export Manager — download response data"
              >
                <BarChart3 size={14} /> <span className="hidden md:inline">Exports</span>
              </button>

              <button
                onClick={() => setShowTest(true)}
                className="btn-ghost text-xs px-2.5 py-1.5"
              >
                <PlayCircle size={13} /> <span className="hidden md:inline">Test</span>
              </button>

              <button
                onClick={() => dispatch({ type: 'SET_PREVIEW', show: true })}
                onMouseEnter={prefetchPreview}
                onFocus={prefetchPreview}
                className="btn-ghost text-xs px-2.5 py-1.5"
              >
                <Eye size={13} /> <span className="hidden md:inline">Preview</span>
              </button>

              <button onClick={handleSave} className="btn-primary text-sm px-3 py-1.5">
                <Download size={14} /> <span className="hidden lg:inline">Save JSON</span>
              </button>
            </div>

            {/* Mobile toolbar — primary actions + overflow menu */}
            <div className="flex sm:hidden items-center gap-1">
              <button
                onClick={() => dispatch({ type: 'SET_PREVIEW', show: true })}
                onMouseEnter={prefetchPreview}
                onFocus={prefetchPreview}
                className="btn-ghost p-2"
                title="Preview"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => setShowExport(true)}
                className="btn-secondary p-2"
                title="Exports"
              >
                <BarChart3 size={16} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMobileMenu(m => !m)}
                  className="btn-ghost p-2"
                  title="More actions"
                >
                  <Menu size={16} />
                </button>
                {showMobileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-ink-200 rounded-xl shadow-xl py-1 w-48">
                      <button
                        onClick={() => { setShowTest(true); setShowMobileMenu(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-ink-100 active:bg-ink-200 text-ink-700 transition-colors"
                      >
                        <PlayCircle size={14} /> Test runner
                      </button>
                      <button
                        onClick={() => { handleExportCSVTemplate(); setShowMobileMenu(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-ink-100 active:bg-ink-200 text-ink-700 transition-colors"
                      >
                        <Download size={14} /> CSV template
                      </button>
                      <button
                        onClick={() => { handleSave(); setShowMobileMenu(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-ink-100 active:bg-ink-200 text-ink-700 transition-colors"
                      >
                        <Download size={14} /> Save JSON
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Layout ───────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col lg:flex-row gap-4 lg:gap-6">

        {/* ── Main list ──────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* Survey header card */}
          <div className="card p-3 sm:p-4 mb-4 sm:mb-5 shadow-md shadow-ink-900/[0.05]">
            <input
              type="text"
              value={state.survey.title}
              onChange={e => dispatch({ type: 'SET_SURVEY_FIELD', field: 'title', value: e.target.value })}
              placeholder="Survey Title"
              className="w-full text-lg sm:text-xl font-bold text-ink-900 bg-transparent border-none outline-none focus:bg-ink-50 px-2 py-1 rounded-lg -ml-2 mb-1 transition-colors"
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

            {/* Survey-wide timed navigation lock (every page) */}
            <div className="mt-3 border-t border-ink-100 pt-3">
              <NavigationLockEditor
                lock={state.survey.settings?.navigationLockAllPages}
                onChange={navigationLock => dispatch({
                  type: 'SET_SURVEY_SETTING',
                  key: 'navigationLockAllPages',
                  value: navigationLock,
                })}
                pageLabel="All pages"
                allPages
                compact
              />
            </div>

            {/* Screen-out message config */}
            <details className="mt-3 border-t border-ink-100 pt-3">
              <summary className="text-xs font-semibold text-ink-500 uppercase tracking-wider cursor-pointer hover:text-ink-800 select-none flex items-center gap-1.5 transition-colors">
                <span>⚙</span> Screen-out &amp; closed survey messages
              </summary>
              <div className="mt-3 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-ink-500">Screen-out page</p>
                  <div>
                    <label className="text-xs text-ink-500 mb-1 block">Title</label>
                    <input type="text" value={state.survey.settings?.terminateTitle || ''}
                      onChange={e => dispatch({ type: 'SET_SURVEY_SETTING', key: 'terminateTitle', value: e.target.value })}
                      placeholder={DEFAULT_SCREEN_MESSAGES.terminateTitle} className="input-base text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-500 mb-1 block">Message</label>
                    <textarea rows={2} value={state.survey.settings?.terminateMessage || ''}
                      onChange={e => dispatch({ type: 'SET_SURVEY_SETTING', key: 'terminateMessage', value: e.target.value })}
                      placeholder={DEFAULT_SCREEN_MESSAGES.terminateMessage}
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
                      placeholder={DEFAULT_SCREEN_MESSAGES.closedTitle} className="input-base text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-500 mb-1 block">Message</label>
                    <textarea rows={2} value={state.survey.settings?.closedMessage || ''}
                      onChange={e => dispatch({ type: 'SET_SURVEY_SETTING', key: 'closedMessage', value: e.target.value })}
                      placeholder={DEFAULT_SCREEN_MESSAGES.closedMessage}
                      className="input-base text-sm resize-none" />
                  </div>
                </div>
              </div>
            </details>

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
                  {!allPagesLockEnabled && (
                    <PageOneLockBar
                      survey={state.survey}
                      dispatch={dispatch}
                      isActive={state.activeItemId === PAGE_ONE_LOCK_ID}
                      onActivate={handleActivateItem}
                    />
                  )}
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
                          isActive={state.activeItemId === item.id}
                          onActivateItem={handleActivateItem}
                          allPagesLockEnabled={allPagesLockEnabled}
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
                          contextItems={state.items}
                          isActive={state.activeItemId === item.id}
                          onActivateItem={handleActivateItem}
                          allPagesLockEnabled={allPagesLockEnabled}
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
                          contextItems={state.items}
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
                          contextItems={state.items}
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
                      <div key={item.id} className={inGroup ? 'ml-2 sm:ml-4 border-l-2 border-ink-200 pl-2 sm:pl-3' : ''}>
                        <QuestionCard
                          question={item}
                          questionNumber={meta.questionNumber}
                          isActive={state.activeItemId === item.id}
                          dispatch={dispatch}
                          onActivateItem={handleActivateItem}
                          focusOptionId={
                            state.activeItemId === item.id ? state.focusOptionId : null
                          }
                          surveyDateFormat={state.survey.defaultDateFormat || DEFAULT_DATE_FORMAT}
                          availableQuestions={availableQuestions}
                          contextItems={state.items}
                          itemIndex={idx}
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
                className="flex items-center gap-2 text-sm text-ink-500 hover:text-brand-700 hover:bg-white font-medium px-4 py-2 border border-dashed border-ink-300 hover:border-brand-400 rounded-xl transition-all hover:shadow-sm active:scale-[0.98]"
              >
                <Plus size={15} /> Add question
              </button>
              <button
                onClick={() => dispatch({ type: 'ADD_PAGE_BREAK' })}
                className="flex items-center gap-2 text-sm text-ink-500 hover:text-ink-800 hover:bg-white font-medium px-4 py-2 border border-dashed border-ink-300 hover:border-ink-400 rounded-xl transition-all hover:shadow-sm active:scale-[0.98]"
              >
                <Scissors size={15} /> Page break
              </button>
              <button
                onClick={() => dispatch({ type: 'ADD_TEXT_BLOCK' })}
                className="flex items-center gap-2 text-sm text-ink-500 hover:text-emerald-700 hover:bg-white font-medium px-4 py-2 border border-dashed border-ink-300 hover:border-emerald-400 rounded-xl transition-all hover:shadow-sm active:scale-[0.98]"
              >
                <FileText size={15} /> Text / Media
              </button>
            </div>
          )}
        </main>

        {/* ── Right sidebar — sticky on desktop ──────────────────────── */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-4 sticky top-16 self-start max-h-[calc(100vh-4.5rem)] overflow-y-auto pb-4">
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

      {/* Mobile FAB — open add panel */}
      <button
        onClick={() => setShowMobilePanel(true)}
        className="lg:hidden fixed bottom-6 right-4 z-20 w-14 h-14 bg-brand-600 hover:bg-brand-700 active:bg-brand-700 text-white rounded-full shadow-lg shadow-brand-900/25 hover:shadow-xl flex items-center justify-center transition-all active:scale-95 focus-ring safe-bottom"
        title="Add question or structure"
      >
        <Plus size={24} />
      </button>

      {/* Mobile add panel drawer */}
      {showMobilePanel && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobilePanel(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col safe-bottom">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 shrink-0">
              <h3 className="text-sm font-bold text-ink-800">Add to survey</h3>
              <button
                onClick={() => setShowMobilePanel(false)}
                className="p-2 text-ink-500 hover:text-ink-800 hover:bg-ink-100 active:bg-ink-200 rounded-lg transition-all focus-ring"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <AddPanel
                onAddQuestion={type => { dispatch({ type: 'ADD_QUESTION', qtype: type }); setShowMobilePanel(false) }}
                onAddPageBreak={() => { dispatch({ type: 'ADD_PAGE_BREAK' }); setShowMobilePanel(false) }}
                onAddGroup={() => { dispatch({ type: 'ADD_GROUP' }); setShowMobilePanel(false) }}
                onAddTerminationBlock={() => { dispatch({ type: 'ADD_TERMINATION_BLOCK' }); setShowMobilePanel(false) }}
                onAddTextBlock={() => { dispatch({ type: 'ADD_TEXT_BLOCK' }); setShowMobilePanel(false) }}
              />
              {state.items.length > 0 && (
                <div className="mt-4">
                  <StatsPanel items={state.items} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Test Runner modal ────────────────────────────────────────── */}
      {showTest && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <InlineLoader label="Loading test runner…" />
          </div>
        }>
          <SurveyTestRunner
            survey={state.survey}
            items={state.items}
            onClose={() => setShowTest(false)}
          />
        </Suspense>
      )}

      {/* ── Export Manager modal ─────────────────────────────────────── */}
      {showExport && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <InlineLoader label="Loading export…" />
          </div>
        }>
          <ExportManager
            survey={state.survey}
            items={state.items}
            onClose={() => setShowExport(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

export default SurveyBuilder
