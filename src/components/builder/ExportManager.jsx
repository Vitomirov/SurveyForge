import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  X, Download, Filter, Clock, CheckCircle2, XCircle, Loader2,
  Trash2, AlertTriangle, RefreshCw, ChevronDown, ChevronUp,
  Calendar, BarChart3,
} from 'lucide-react'
import {
  loadResponses, loadExportHistory, recordExport,
  lastExportTimestamp, applyFilters, deleteResponse, clearResponses,
  newResponseId,
} from '@/utils/responseStore'
import { useApi } from '@/config/api'
import {
  fetchAllResponses, deleteResponseApi, clearResponsesApi,
} from '@/api/responses'
import { generateCSV, downloadCSV } from '@/utils/csvExport'

const STATUS_META = {
  complete:   { label: 'Complete',    color: 'text-emerald-700 bg-emerald-100 border-emerald-200' },
  terminated: { label: 'Terminated',  color: 'text-rose-700 bg-rose-100 border-rose-200' },
  partial:    { label: 'Partial',     color: 'text-amber-700 bg-amber-100 border-amber-200' },
  dnc:        { label: 'DNC',         color: 'text-slate-700 bg-slate-100 border-slate-300' },
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: 'text-ink-600 bg-ink-100 border-ink-200' }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${m.color}`}>
      {m.label}
    </span>
  )
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

// ─── Filters panel ─────────────────────────────────────────────────────────
function FiltersPanel({ filters, setFilters, lastExport, surveyId }) {
  const allStatuses  = ['complete', 'terminated', 'partial', 'dnc']

  const toggleStatus = (s) =>
    setFilters(f => ({
      ...f,
      statuses: f.statuses.includes(s) ? f.statuses.filter(x => x !== s) : [...f.statuses, s],
      sinceLastExport: null,
    }))

  const setQuickDate = (days) => {
    const from = new Date()
    from.setDate(from.getDate() - days)
    setFilters(f => ({
      ...f,
      dateFrom: from.toISOString().split('T')[0],
      dateTo: '',
      sinceLastExport: null,
    }))
  }

  const setSinceLastExport = () => {
    if (!lastExport) return
    setFilters(f => ({
      ...f,
      sinceLastExport: lastExport,
      dateFrom: '',
      dateTo: '',
    }))
  }

  const clearAll = () =>
    setFilters({ statuses: [], dateFrom: '', dateTo: '', sinceLastExport: null })

  const active = filters.statuses.length > 0 || filters.dateFrom || filters.dateTo || filters.sinceLastExport

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div>
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">Status</p>
        <div className="flex gap-2 flex-wrap">
          {allStatuses.map(s => {
            const m   = STATUS_META[s]
            const sel = filters.statuses.includes(s)
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-2 transition-all ${
                  sel ? m.color + ' border-current' : 'border-ink-200 text-ink-500 hover:border-ink-300'
                }`}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Date range */}
      <div>
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">Date range</p>
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <label className="text-xs text-ink-400 block mb-1">From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value, sinceLastExport: null }))}
              className="input-base py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-ink-400 block mb-1">To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value, sinceLastExport: null }))}
              className="input-base py-1.5 text-sm"
            />
          </div>
        </div>
        {/* Quick ranges */}
        <div className="flex gap-1.5 mt-2">
          {[['Today', 0], ['7 days', 7], ['30 days', 30]].map(([label, days]) => (
            <button
              key={label}
              onClick={() => days === 0 ? setFilters(f => ({ ...f, dateFrom: new Date().toISOString().split('T')[0], dateTo: '', sinceLastExport: null })) : setQuickDate(days)}
              className="text-xs text-brand-600 hover:text-brand-700 px-2 py-1 bg-brand-50 hover:bg-brand-100 rounded-lg transition-all"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Since last export */}
      <div>
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">Activity</p>
        <button
          onClick={setSinceLastExport}
          disabled={!lastExport}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
            filters.sinceLastExport
              ? 'border-brand-500 bg-brand-50'
              : 'border-ink-200 hover:border-ink-300'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <RefreshCw size={16} className={filters.sinceLastExport ? 'text-brand-600' : 'text-ink-400'} />
          <div>
            <p className={`text-sm font-semibold ${filters.sinceLastExport ? 'text-brand-700' : 'text-ink-700'}`}>
              Since last export
            </p>
            <p className="text-xs text-ink-400">
              {lastExport ? `Last export: ${fmtDate(lastExport)}` : 'No export recorded yet'}
            </p>
          </div>
        </button>
      </div>

      {active && (
        <button
          onClick={clearAll}
          className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1"
        >
          <X size={11} /> Clear all filters
        </button>
      )}
    </div>
  )
}

// ─── Response table ─────────────────────────────────────────────────────────
function ResponseTable({ responses, surveyId, onDeleted, onDeleteResponse }) {
  const [expanded, setExpanded] = useState(null)

  const del = async (id) => {
    if (!window.confirm('Delete this response? This cannot be undone.')) return
    await onDeleteResponse(id)
    onDeleted()
  }

  if (!responses.length) {
    return (
      <div className="text-center py-8 text-ink-400">
        <BarChart3 size={28} className="mx-auto mb-2 text-ink-200" />
        <p className="text-sm">No responses match the current filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {responses.map((r) => (
        <div key={r.id} className="border border-ink-200 rounded-xl overflow-hidden bg-white">
          {/* Row summary */}
          <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-ink-50 transition-colors">
            <button
              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              className="p-0.5 text-ink-400 hover:text-ink-600 transition-colors"
            >
              {expanded === r.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <span className="text-xs font-mono text-ink-400 shrink-0">{r.id.slice(0, 14)}</span>
            <StatusBadge status={r.status} />
            <span className="text-xs text-ink-500 flex-1">{fmtDate(r.timestamp)}</span>
            <span className="text-xs text-ink-400 shrink-0">
              Page {(r.pageReached ?? 0) + 1}
            </span>
            <button
              onClick={() => del(r.id)}
              className="p-1 text-ink-300 hover:text-rose-500 transition-colors shrink-0"
              title="Delete response"
            >
              <Trash2 size={12} />
            </button>
          </div>

          {/* Expanded detail */}
          {expanded === r.id && (
            <div className="border-t border-ink-100 px-3 py-2.5 bg-ink-50">
              <p className="text-xs font-semibold text-ink-500 mb-2">Response data (raw)</p>
              <pre className="text-xs text-ink-600 font-mono bg-white rounded-lg p-2 overflow-x-auto max-h-48 overflow-y-auto border border-ink-100">
                {JSON.stringify({ responses: r.responses, companions: r.companions, fingerprint: r.fingerprint || undefined }, null, 2)}
              </pre>
              {r.terminatedBy && (
                <p className="text-xs text-rose-600 mt-2">
                  Terminated at: {r.terminatedBy.cause || r.terminatedBy.blockTitle || '—'}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Export history ─────────────────────────────────────────────────────────
function ExportHistory({ history }) {
  if (!history.length) return (
    <p className="text-xs text-ink-400 italic">No exports recorded yet.</p>
  )
  return (
    <div className="space-y-1.5">
      {history.map(h => (
        <div key={h.id} className="flex items-center gap-3 text-xs px-3 py-2 bg-ink-50 rounded-lg border border-ink-100">
          <Clock size={12} className="text-ink-400 shrink-0" />
          <span className="text-ink-600 flex-1">{fmtDate(h.timestamp)}</span>
          <span className="text-ink-500">{h.rowCount} row{h.rowCount !== 1 ? 's' : ''}</span>
          <span className="text-ink-400 text-xs">{h.filterDescription}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main ExportManager ─────────────────────────────────────────────────────
export function ExportManager({ survey, items, onClose }) {
  const surveyId = survey?.id

  const [filters, setFilters] = useState({
    statuses: [],
    dateFrom: '',
    dateTo: '',
    sinceLastExport: null,
  })
  const [tick, setTick] = useState(0)
  const [apiResponses, setApiResponses] = useState([])
  const [responsesLoading, setResponsesLoading] = useState(useApi)
  const [showHistory, setShowHistory] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const refresh = () => setTick(t => t + 1)

  const loadApiResponses = useCallback(async () => {
    if (!useApi || !surveyId) return
    setResponsesLoading(true)
    try {
      setApiResponses(await fetchAllResponses(surveyId))
    } catch (err) {
      console.error('Failed to load responses', err)
    } finally {
      setResponsesLoading(false)
    }
  }, [surveyId])

  useEffect(() => {
    if (useApi) loadApiResponses()
  }, [useApi, loadApiResponses, tick])

  const localResponses = useMemo(() => loadResponses(surveyId), [surveyId, tick])
  const allResponses   = useApi ? apiResponses : localResponses
  const exportHistory = useMemo(() => loadExportHistory(surveyId),         [surveyId, tick])
  const lastExport    = useMemo(() => lastExportTimestamp(surveyId),       [surveyId, tick])
  const filtered      = useMemo(() => applyFilters(allResponses, filters), [allResponses, filters])

  const filterDescription = () => {
    const parts = []
    if (filters.statuses.length)       parts.push(filters.statuses.join('+'))
    if (filters.sinceLastExport)       parts.push('since last export')
    else if (filters.dateFrom || filters.dateTo)
      parts.push(`${filters.dateFrom || '…'} → ${filters.dateTo || '…'}`)
    return parts.length ? parts.join(', ') : 'all responses'
  }

  const handleExport = useCallback(() => {
    if (!filtered.length) return
    setIsExporting(true)
    setTimeout(() => {
      const csv = generateCSV(items, filtered, survey)
      const ts  = new Date().toISOString()
      const filename = `${(survey?.title || 'survey').replace(/\s+/g, '_')}_${ts.slice(0, 10)}.csv`
      downloadCSV(csv, filename)

      recordExport(surveyId, {
        id:                newResponseId(),
        timestamp:         ts,
        rowCount:          filtered.length,
        filterDescription: filterDescription(),
      })
      refresh()
      setIsExporting(false)
    }, 150)
  }, [filtered, items, survey, surveyId, filters])

  const handleClearAll = async () => {
    if (useApi) {
      try {
        await clearResponsesApi(surveyId)
      } catch (err) {
        console.error('Failed to clear responses', err)
        return
      }
    } else {
      clearResponses(surveyId)
    }
    setConfirmClear(false)
    refresh()
  }

  const handleDeleteResponse = async (responseId) => {
    if (useApi) {
      await deleteResponseApi(surveyId, responseId)
      return
    }
    deleteResponse(surveyId, responseId)
  }

  const counts = useMemo(() => {
    const c = { complete: 0, terminated: 0, partial: 0, dnc: 0 }
    allResponses.forEach(r => { if (c[r.status] !== undefined) c[r.status]++ })
    return c
  }, [allResponses])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Download size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-ink-800">Response Export Manager</h2>
            <p className="text-xs text-ink-400">
              {allResponses.length} total response{allResponses.length !== 1 ? 's' : ''} ·{' '}
              <span className="text-emerald-600">{counts.complete} complete</span> ·{' '}
              <span className="text-rose-500">{counts.terminated} terminated</span> ·{' '}
              <span className="text-amber-500">{counts.partial} partial</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-100 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">

          {/* Left: filters */}
          <div className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-ink-100 flex flex-col max-h-[40vh] md:max-h-none">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter size={14} className="text-ink-500" />
                <p className="text-sm font-bold text-ink-700">Filters</p>
              </div>
              <FiltersPanel
                filters={filters}
                setFilters={setFilters}
                lastExport={lastExport}
                surveyId={surveyId}
              />
            </div>

            {/* Export button */}
            <div className="p-4 border-t border-ink-100 space-y-2 shrink-0">
              {/* Match count */}
              <div className={`text-center py-2 rounded-lg text-sm font-semibold ${
                filtered.length > 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-ink-50 text-ink-400'
              }`}>
                {filtered.length} response{filtered.length !== 1 ? 's' : ''} will export
              </div>

              <button
                onClick={handleExport}
                disabled={!filtered.length || isExporting}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
              >
                {isExporting
                  ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                  : <><Download size={15} /> Download CSV</>
                }
              </button>

              <p className="text-xs text-ink-400 text-center">
                Exporting: <em>{filterDescription()}</em>
              </p>
            </div>
          </div>

          {/* Right: responses + history */}
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">

            {/* Response table */}
            <div className="flex-1 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-ink-500 uppercase tracking-wider">
                  {filters.statuses.length || filters.dateFrom || filters.dateTo || filters.sinceLastExport
                    ? `Filtered: ${filtered.length} of ${allResponses.length}`
                    : `All responses (${allResponses.length})`
                  }
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={refresh} className="p-1.5 text-ink-400 hover:text-ink-600 hover:bg-ink-100 rounded-lg transition-all" title="Refresh">
                    <RefreshCw size={13} />
                  </button>
                  {allResponses.length > 0 && (
                    confirmClear ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-rose-600">Delete all?</span>
                        <button onClick={handleClearAll} className="text-xs font-bold text-white bg-rose-600 px-2 py-1 rounded-lg">Yes</button>
                        <button onClick={() => setConfirmClear(false)} className="text-xs text-ink-500 px-2 py-1 hover:bg-ink-100 rounded-lg">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmClear(true)}
                        className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 px-2 py-1 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={11} /> Clear all
                      </button>
                    )
                  )}
                </div>
              </div>

              {responsesLoading ? (
                <div className="text-center py-16 text-ink-400 text-sm">Loading responses…</div>
              ) : allResponses.length === 0 ? (
                <div className="text-center py-16 text-ink-300">
                  <Download size={36} className="mx-auto mb-3 text-ink-200" />
                  <p className="text-sm font-semibold text-ink-400">No responses yet</p>
                  <p className="text-xs mt-1">Run the survey in Preview mode to collect responses.</p>
                </div>
              ) : (
                <ResponseTable
                  responses={filtered}
                  surveyId={surveyId}
                  onDeleted={refresh}
                  onDeleteResponse={handleDeleteResponse}
                />
              )}
            </div>

            {/* Export history */}
            <div className="border-t border-ink-100 px-4 pb-4 pt-3 shrink-0">
              <button
                onClick={() => setShowHistory(h => !h)}
                className="flex items-center gap-2 text-xs font-semibold text-ink-500 hover:text-ink-700 transition-colors mb-2"
              >
                <Clock size={12} />
                Export history ({exportHistory.length})
                {showHistory ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              {showHistory && <ExportHistory history={exportHistory} />}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
