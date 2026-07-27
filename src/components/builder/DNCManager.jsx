import { useState, useRef } from 'react'
import { Upload, Trash2, ShieldOff, AlertTriangle, CheckCircle2, X, Download } from 'lucide-react'
import {
  loadDNCList, getDNCCount, parseDNCCsv,
  importDNCEmails, clearDNCList, removeDNCEmail,
} from '@/utils/dncStore'

// ─── Import preview modal ──────────────────────────────────────────────────
function ImportPreview({ parsed, surveyId, onImported, onCancel }) {
  const existing = getDNCCount(surveyId)
  const newCount = parsed.emails.length

  const doImport = () => {
    importDNCEmails(surveyId, parsed.emails)
    onImported()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-base font-bold text-ink-800 mb-1">Confirm DNC import</h3>
        <p className="text-sm text-ink-500 mb-4">Review the results before adding to this survey's exclusion list.</p>

        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between p-3 bg-ink-50 rounded-xl">
            <span className="text-sm text-ink-600">Emails found in file</span>
            <span className="text-sm font-bold text-ink-800">{newCount}</span>
          </div>
          {parsed.invalid > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <span className="text-sm text-amber-700">{parsed.invalid} cell{parsed.invalid !== 1 ? 's' : ''} skipped (not valid email format)</span>
            </div>
          )}
          <div className="flex items-center justify-between p-3 bg-ink-50 rounded-xl">
            <span className="text-sm text-ink-600">Already in list</span>
            <span className="text-sm font-bold text-ink-800">{existing}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-sm font-semibold text-emerald-700">New total after import</span>
            <span className="text-sm font-bold text-emerald-700">
              {new Set([...loadDNCList(surveyId), ...parsed.emails]).size}
            </span>
          </div>
        </div>

        {/* Preview first 5 */}
        {parsed.emails.length > 0 && (
          <div className="bg-ink-50 rounded-xl p-3 mb-5 max-h-32 overflow-y-auto">
            {parsed.emails.slice(0, 10).map(e => (
              <p key={e} className="text-xs font-mono text-ink-600">{e}</p>
            ))}
            {parsed.emails.length > 10 && (
              <p className="text-xs text-ink-400 mt-1">…and {parsed.emails.length - 10} more</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-ghost border border-ink-200">Cancel</button>
          <button
            onClick={doImport}
            disabled={newCount === 0}
            className="flex-1 btn-primary disabled:opacity-40"
          >
            Import {newCount} email{newCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main DNCManager ───────────────────────────────────────────────────────
export function DNCManager({ surveyId }) {
  const [list,    setList]    = useState(() => loadDNCList(surveyId))
  const [preview, setPreview] = useState(null)   // parsed CSV waiting for confirm
  const [search,  setSearch]  = useState('')
  const fileRef               = useRef(null)

  const refresh = () => setList(loadDNCList(surveyId))

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const parsed = parseDNCCsv(e.target.result)
      setPreview(parsed)
    }
    reader.readAsText(file)
  }

  const handleImported = () => {
    setPreview(null)
    refresh()
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClearAll = () => {
    if (!window.confirm(`Delete all ${list.length} emails from the DNC list? This cannot be undone.`)) return
    clearDNCList(surveyId)
    refresh()
  }

  const handleRemove = (email) => {
    removeDNCEmail(surveyId, email)
    refresh()
  }

  const handleExport = () => {
    const csv  = 'email\n' + list.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `dnc_list_${surveyId.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = search
    ? list.filter(e => e.includes(search.toLowerCase().trim()))
    : list

  return (
    <div className="mt-3 border-t border-ink-100 pt-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldOff size={12} /> DNC / Exclusion List
          {list.length > 0 && (
            <span className="ml-1 text-xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200">
              {list.length}
            </span>
          )}
        </p>
        <div className="flex items-center gap-1.5">
          {list.length > 0 && (
            <button onClick={handleExport} title="Export DNC list as CSV"
              className="p-1.5 text-ink-400 hover:text-ink-600 hover:bg-ink-100 rounded-lg transition-all">
              <Download size={13} />
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 px-2.5 py-1.5 border border-brand-200 hover:bg-brand-50 rounded-lg transition-all"
          >
            <Upload size={12} /> Import CSV
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={e => handleFile(e.target.files?.[0])} />
      </div>

      <p className="text-xs text-ink-400 mb-3 leading-relaxed">
        Upload a CSV of email addresses. Responses where the marked email field matches an entry here will be saved as <strong className="text-rose-600">DNC</strong> and excluded from exports by default.
      </p>

      {list.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }}
          onDragOver={e => e.preventDefault()}
          className="flex flex-col items-center gap-1.5 py-5 border-2 border-dashed border-ink-200 hover:border-rose-300 hover:bg-rose-50/20 rounded-xl cursor-pointer transition-all"
        >
          <ShieldOff size={18} className="text-ink-300" />
          <p className="text-xs text-ink-400 font-medium">No exclusions yet — click or drag a CSV to import</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search emails…"
            className="input-base py-1.5 text-sm"
          />
          {/* List */}
          <div className="max-h-40 overflow-y-auto space-y-0.5 border border-ink-100 rounded-xl p-2 bg-ink-50">
            {filtered.length === 0 && <p className="text-xs text-ink-400 italic p-1">No matches.</p>}
            {filtered.map(email => (
              <div key={email} className="flex items-center gap-2 group px-2 py-1 rounded-lg hover:bg-white">
                <span className="text-xs font-mono text-ink-600 flex-1 truncate">{email}</span>
                <button onClick={() => handleRemove(email)}
                  className="p-0.5 text-ink-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-400">{filtered.length} of {list.length} shown</p>
            <button onClick={handleClearAll} className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 transition-colors">
              <Trash2 size={11} /> Clear all
            </button>
          </div>
        </div>
      )}

      {preview && (
        <ImportPreview
          parsed={preview}
          surveyId={surveyId}
          onImported={handleImported}
          onCancel={() => { setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
        />
      )}
    </div>
  )
}
