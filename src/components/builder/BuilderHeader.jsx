import { useApi } from '@/config/api'
import { AppShell, APP_SHELL_GRID, APP_BUILDER_PANE } from '@/components/shared/layout/AppBuilderShell.jsx'
import { AppLeadingZone } from '@/components/shared/layout/AppLeadingZone.jsx'
import { DEFAULT_DATE_FORMAT } from '@/constants/surveyDefaults'
import { prefetchPreview } from '@/utils/routing/routePrefetch'
import {
  Eye, BarChart3, Download, PlayCircle, Menu,
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
    <header className="bg-white/95 backdrop-blur-md border-b border-ink-200/80 sticky top-0 z-30 safe-top">
      <AppShell>
        <div className={`${APP_SHELL_GRID} items-center min-h-[4.25rem] py-3`}>
          <AppLeadingZone
            showBack
            onBack={onBackToDashboard}
            onLogoClick={onBackToDashboard}
          />

          <div className={`${APP_BUILDER_PANE} flex items-center gap-2 sm:gap-3 min-w-0`}>
            <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
              <input
                type="text"
                value={survey.title}
                onChange={e => dispatch({ type: 'SET_SURVEY_FIELD', field: 'title', value: e.target.value })}
                className="text-sm font-semibold text-ink-800 bg-transparent border-none outline-none focus:bg-ink-50 px-2 py-1.5 rounded-lg transition-colors flex-1 min-w-0 max-w-md"
                placeholder="Survey title..."
              />
              <SaveStatus saveStatus={saveStatus} isDirty={isDirty} />
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
              <SaveStatus saveStatus={saveStatus} isDirty={isDirty} className="md:hidden" />

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
        </div>
      </AppShell>
    </header>
  )
}

function SaveStatus({ saveStatus, isDirty, className = '' }) {
  if (useApi && saveStatus === 'saving') {
    return <span className={`text-xs text-ink-400 font-medium shrink-0 ${className}`}>Saving…</span>
  }
  if (useApi && saveStatus === 'saved') {
    return <span className={`text-xs text-emerald-600 font-medium shrink-0 hidden sm:inline ${className}`}>Saved</span>
  }
  if (useApi && saveStatus === 'error') {
    return <span className={`text-xs text-rose-500 font-medium shrink-0 ${className}`}>Failed</span>
  }
  if (!useApi && isDirty) {
    return <span className={`text-xs text-amber-500 font-medium shrink-0 hidden sm:inline ${className}`}>● Unsaved</span>
  }
  return null
}

function DateFormatSelect({ survey, dispatch }) {
  return (
    <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ink-50/80 border border-ink-100">
      <span className="text-xs text-ink-400">Date</span>
      <select
        value={survey.defaultDateFormat || DEFAULT_DATE_FORMAT}
        onChange={e => dispatch({ type: 'SET_SURVEY_FIELD', field: 'defaultDateFormat', value: e.target.value })}
        className="text-xs bg-transparent border-none outline-none text-ink-700 font-medium font-mono"
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
    <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-ink-50/80 border border-ink-100">
      <HeaderToolButton icon={Download} label="CSV Template" onClick={onExportCSVTemplate} title="Download CSV column template" />
      <HeaderToolButton icon={BarChart3} label="Exports" onClick={onOpenExport} title="Open Export Manager" variant="secondary" />
      <HeaderToolButton icon={PlayCircle} label="Test" onClick={onOpenTest} />
      <HeaderToolButton
        icon={Eye}
        label="Preview"
        onClick={onOpenPreview}
        onMouseEnter={prefetchPreview}
        onFocus={prefetchPreview}
      />
      <button
        onClick={onSave}
        className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-2 rounded-lg transition-colors shrink-0"
      >
        <Download size={14} />
        <span className="hidden lg:inline">Save JSON</span>
      </button>
    </div>
  )
}

function HeaderToolButton({ icon: Icon, label, onClick, title, variant, onMouseEnter, onFocus }) {
  const base = 'inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors shrink-0'
  const styles = variant === 'secondary'
    ? `${base} text-ink-700 bg-white border border-ink-200 hover:bg-ink-50`
    : `${base} text-ink-600 hover:text-ink-900 hover:bg-ink-50`

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      title={title || label}
      className={styles}
    >
      <Icon size={16} className="text-ink-400" />
      <span className="hidden xl:inline">{label}</span>
    </button>
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
        type="button"
        onClick={onOpenPreview}
        onMouseEnter={prefetchPreview}
        onFocus={prefetchPreview}
        className="inline-flex items-center justify-center p-2.5 text-ink-600 hover:text-ink-900 hover:bg-ink-50 rounded-lg transition-colors"
        title="Preview"
      >
        <Eye size={16} />
      </button>
      <button
        type="button"
        onClick={onOpenExport}
        className="inline-flex items-center justify-center p-2.5 text-ink-600 hover:text-ink-900 hover:bg-ink-50 rounded-lg transition-colors"
        title="Exports"
      >
        <BarChart3 size={16} />
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowMobileMenu(m => !m)}
          className="inline-flex items-center justify-center p-2.5 text-ink-600 hover:text-ink-900 hover:bg-ink-50 rounded-lg transition-colors"
          title="More actions"
        >
          <Menu size={16} />
        </button>
        {showMobileMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeMenu} />
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 bg-white border border-ink-200 rounded-2xl shadow-xl shadow-ink-900/10 p-2 w-48">
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
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors text-left"
    >
      <Icon size={15} className="text-ink-400 shrink-0" />
      {label}
    </button>
  )
}
