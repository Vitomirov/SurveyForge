import { APP_NAME } from '@/constants/branding'
import { useApi } from '@/config/api'
import { DEFAULT_DATE_FORMAT } from '@/constants/surveyDefaults'
import { prefetchPreview } from '@/utils/routing/routePrefetch'
import {
  Eye, BarChart3, Layers, Download, PlayCircle, ArrowLeft, Menu,
} from 'lucide-react'

export function BuilderHeader({
  survey,
  dispatch,
  saveStatus,
  isDirty,
  onBackToDashboard,
  showMobileMenu,
  setShowMobileMenu,
  onExportCSVTemplate,
  onOpenExport,
  onOpenTest,
  onOpenPreview,
  onSave,
}) {
  return (
    <header className="bg-white border-b border-ink-200 shadow-sm shadow-ink-900/[0.03] sticky top-0 z-30 safe-top">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 min-h-14 py-2 sm:py-0 flex items-center gap-2 sm:gap-4">
        <BrandBlock onBackToDashboard={onBackToDashboard} />

        <div className="hidden md:block w-px h-5 bg-ink-100 shrink-0" />

        <input
          type="text"
          value={survey.title}
          onChange={e => dispatch({ type: 'SET_SURVEY_FIELD', field: 'title', value: e.target.value })}
          className="hidden md:block text-sm font-medium text-ink-700 bg-transparent border-none outline-none focus:bg-ink-50 px-2 py-1 rounded-lg transition-colors flex-1 min-w-0 max-w-sm"
          placeholder="Survey title..."
        />

        <SaveStatus saveStatus={saveStatus} isDirty={isDirty} />

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
          <DateFormatSelect survey={survey} dispatch={dispatch} />

          <DesktopToolbar
            onExportCSVTemplate={onExportCSVTemplate}
            onOpenExport={onOpenExport}
            onOpenTest={onOpenTest}
            onOpenPreview={onOpenPreview}
            onSave={onSave}
          />

          <MobileToolbar
            showMobileMenu={showMobileMenu}
            setShowMobileMenu={setShowMobileMenu}
            onExportCSVTemplate={onExportCSVTemplate}
            onOpenExport={onOpenExport}
            onOpenTest={onOpenTest}
            onOpenPreview={onOpenPreview}
            onSave={onSave}
          />
        </div>
      </div>
    </header>
  )
}

function BrandBlock({ onBackToDashboard }) {
  return (
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
  )
}

function SaveStatus({ saveStatus, isDirty }) {
  if (useApi && saveStatus === 'saving') {
    return <span className="text-xs text-ink-400 font-medium shrink-0">Saving…</span>
  }
  if (useApi && saveStatus === 'saved') {
    return <span className="text-xs text-emerald-600 font-medium shrink-0 hidden sm:inline">Saved</span>
  }
  if (useApi && saveStatus === 'error') {
    return <span className="text-xs text-rose-500 font-medium shrink-0">Failed</span>
  }
  if (!useApi && isDirty) {
    return <span className="text-xs text-amber-500 font-medium shrink-0 hidden sm:inline">● Unsaved</span>
  }
  return null
}

function DateFormatSelect({ survey, dispatch }) {
  return (
    <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-ink-50 rounded-lg mr-1">
      <span className="text-xs text-ink-400">Date:</span>
      <select
        value={survey.defaultDateFormat || DEFAULT_DATE_FORMAT}
        onChange={e => dispatch({ type: 'SET_SURVEY_FIELD', field: 'defaultDateFormat', value: e.target.value })}
        className="text-xs bg-transparent border-none outline-none text-ink-600 font-medium font-mono"
      >
        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
        <option value={DEFAULT_DATE_FORMAT}>{DEFAULT_DATE_FORMAT}</option>
        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
      </select>
    </div>
  )
}

function DesktopToolbar({ onExportCSVTemplate, onOpenExport, onOpenTest, onOpenPreview, onSave }) {
  return (
    <div className="hidden sm:flex items-center gap-1.5">
      <button
        onClick={onExportCSVTemplate}
        className="btn-ghost text-xs px-2.5 py-1.5"
        title="Download CSV column template"
      >
        <Download size={13} /> <span className="hidden md:inline">CSV Template</span>
      </button>
      <button
        onClick={onOpenExport}
        className="btn-secondary text-sm px-3 py-1.5"
        title="Open Export Manager — download response data"
      >
        <BarChart3 size={14} /> <span className="hidden md:inline">Exports</span>
      </button>
      <button onClick={onOpenTest} className="btn-ghost text-xs px-2.5 py-1.5">
        <PlayCircle size={13} /> <span className="hidden md:inline">Test</span>
      </button>
      <button
        onClick={onOpenPreview}
        onMouseEnter={prefetchPreview}
        onFocus={prefetchPreview}
        className="btn-ghost text-xs px-2.5 py-1.5"
      >
        <Eye size={13} /> <span className="hidden md:inline">Preview</span>
      </button>
      <button onClick={onSave} className="btn-primary text-sm px-3 py-1.5">
        <Download size={14} /> <span className="hidden lg:inline">Save JSON</span>
      </button>
    </div>
  )
}

function MobileToolbar({
  showMobileMenu,
  setShowMobileMenu,
  onExportCSVTemplate,
  onOpenExport,
  onOpenTest,
  onOpenPreview,
  onSave,
}) {
  const closeMenu = () => setShowMobileMenu(false)

  return (
    <div className="flex sm:hidden items-center gap-1">
      <button
        onClick={onOpenPreview}
        onMouseEnter={prefetchPreview}
        onFocus={prefetchPreview}
        className="btn-ghost p-2"
        title="Preview"
      >
        <Eye size={16} />
      </button>
      <button onClick={onOpenExport} className="btn-secondary p-2" title="Exports">
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
            <div className="fixed inset-0 z-40" onClick={closeMenu} />
            <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-ink-200 rounded-xl shadow-xl py-1 w-48">
              <MobileMenuItem icon={PlayCircle} label="Test runner" onClick={() => { onOpenTest(); closeMenu() }} />
              <MobileMenuItem icon={Download} label="CSV template" onClick={() => { onExportCSVTemplate(); closeMenu() }} />
              <MobileMenuItem icon={Download} label="Save JSON" onClick={() => { onSave(); closeMenu() }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MobileMenuItem({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-ink-100 active:bg-ink-200 text-ink-700 transition-colors"
    >
      <Icon size={14} /> {label}
    </button>
  )
}
