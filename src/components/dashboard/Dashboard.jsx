import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import React from 'react'
import {
  Plus, Search, Settings, Filter, MoreVertical,
  Copy, Trash2, ExternalLink, ChevronUp, ChevronDown,
  Layers, BarChart3, Clock, CheckCircle2, XCircle,
  PlayCircle, PauseCircle, Edit3, Eye, LogOut,
} from 'lucide-react'
import {
  loadLibrary, deleteSurvey, duplicateSurvey,
} from '@/utils/surveyLibrary'
import { useApi } from '@/config/api'
import {
  getSurvey, deleteSurveyApi, migrateLocalLibrary,
  metaToLibraryEntry, payloadToLibraryEntry, patchSurvey,
} from '@/api/surveys'
import { getDashboard } from '@/api/dashboard'
import { fetchClients, fetchTopics } from '@/api/platform'
import {
  loadClients, loadTopics,
  SURVEY_TYPES, SURVEY_STATUSES,
} from '@/utils/platformStore'
import { loadResponses } from '@/utils/responseStore'
import { PlatformSettings } from '@/components/dashboard'

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000)   return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000)return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' })
}

function StatusBadge({ statusId }) {
  const s = SURVEY_STATUSES.find(x => x.id === statusId) || SURVEY_STATUSES[0]
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>
      {s.label}
    </span>
  )
}

function SortIcon({ field, sort }) {
  if (sort.field !== field) return <ChevronUp size={12} className="text-ink-200" />
  return sort.dir === 'asc'
    ? <ChevronUp size={12} className="text-brand-500" />
    : <ChevronDown size={12} className="text-brand-500" />
}

// ─── Context menu ──────────────────────────────────────────────────────────
function SurveyMenu({ surveyId, onOpen, onPreview, onDuplicate, onDelete }) {
  const [open, setOpen]   = useState(false)
  const [pos,  setPos]    = useState({ top: 0, right: 0 })
  const btnRef            = React.useRef(null)

  const handleOpen = (e) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen(o => !o)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-1.5 text-ink-400 hover:text-ink-700 hover:bg-ink-100 rounded-lg transition-all"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-white border border-ink-200 rounded-xl shadow-xl py-1 w-48"
            style={{ top: pos.top, right: pos.right }}
          >
            <button onClick={() => { setOpen(false); onOpen() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-ink-50 text-ink-700">
              <Edit3 size={14} /> Open in builder
            </button>
            <button onClick={() => { setOpen(false); onPreview() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-ink-50 text-ink-700">
              <Eye size={14} /> Preview
            </button>
            <button onClick={() => { setOpen(false); onDuplicate() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-ink-50 text-ink-700">
              <Copy size={14} /> Duplicate
            </button>
            <div className="border-t border-ink-100 my-1" />
            <button onClick={() => { setOpen(false); onDelete() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-rose-50 text-rose-600">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}
    </>
  )
}

// ─── Stats bar ─────────────────────────────────────────────────────────────
function StatsBar({ surveys }) {
  const counts = useMemo(() => {
    const c = { total: surveys.length, draft: 0, live: 0, paused: 0, closed: 0 }
    surveys.forEach(s => { if (c[s.survey?.status] !== undefined) c[s.survey?.status]++ })
    return c
  }, [surveys])

  const cards = [
    { label: 'Total surveys', value: counts.total, icon: Layers,       color: 'text-brand-600 bg-brand-50' },
    { label: 'Live',          value: counts.live,  icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Draft',         value: counts.draft, icon: Edit3,        color: 'text-ink-600 bg-ink-100' },
    { label: 'Paused',        value: counts.paused, icon: PauseCircle, color: 'text-amber-600 bg-amber-50' },
    { label: 'Closed',        value: counts.closed, icon: XCircle,     color: 'text-rose-600 bg-rose-50' },
  ]

  return (
    <div className="grid grid-cols-5 gap-3 mb-6">
      {cards.map(card => (
        <div key={card.label} className="card px-4 py-3 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
            <card.icon size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-ink-800 leading-none">{card.value}</p>
            <p className="text-xs text-ink-400 mt-0.5">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
export function Dashboard({ onOpenSurvey, onNewSurvey, onPreviewSurvey, session, onLogout }) {
  const [tick, setTick]             = useState(0)
  const [apiSurveys, setApiSurveys] = useState([])
  const [apiClients, setApiClients] = useState([])
  const [apiTopics,  setApiTopics]  = useState([])
  const [apiLoading, setApiLoading] = useState(useApi)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterTopic,  setFilterTopic]  = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [sort, setSort]             = useState({ field: 'updatedAt', dir: 'desc' })
  const [showSettings, setShowSettings] = useState(false)
  const [deleteId, setDeleteId]     = useState(null)
  const migrateAttemptedRef = useRef(false)

  const refresh = useCallback(async ({ allowMigrate = false } = {}) => {
    if (!useApi) {
      setTick(t => t + 1)
      return
    }
    setApiLoading(true)
    try {
      let data = await getDashboard()
      if (data.surveys.length === 0 && allowMigrate && !migrateAttemptedRef.current) {
        migrateAttemptedRef.current = true
        const local = loadLibrary()
        if (local.length > 0) {
          await migrateLocalLibrary(local)
          data = await getDashboard()
        }
      }
      setApiSurveys(data.surveys.map(metaToLibraryEntry))
      const [clients, topics] = await Promise.all([fetchClients(), fetchTopics()])
      setApiClients(clients)
      setApiTopics(topics)
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setApiLoading(false)
    }
  }, [])

  useEffect(() => {
    if (useApi) refresh({ allowMigrate: true })
  }, [refresh])

  const surveys = useMemo(
    () => (useApi ? apiSurveys : loadLibrary()),
    [useApi, apiSurveys, tick]
  )
  const clients = useMemo(
    () => (useApi ? apiClients : loadClients()),
    [useApi, apiClients, tick]
  )
  const topics = useMemo(
    () => (useApi ? apiTopics : loadTopics()),
    [useApi, apiTopics, tick]
  )

  const clientMap = useMemo(() =>
    Object.fromEntries(clients.map(c => [c.id, c.name])), [clients])
  const topicMap  = useMemo(() =>
    Object.fromEntries(topics.map(t => [t.id, t.name])),  [topics])
  const typeMap   = Object.fromEntries(SURVEY_TYPES.map(t => [t.id, t.label]))

  // Response counts per survey
  const responseCounts = useMemo(() => {
    if (useApi) {
      return Object.fromEntries(
        surveys.map(s => {
          const id = s.survey?.id || s.id
          return [id, s.stats || { total: 0, complete: 0, terminated: 0, partial: 0 }]
        })
      )
    }
    return Object.fromEntries(
      surveys.map(s => {
        const all = loadResponses(s.survey?.id || s.id)
        return [s.survey?.id || s.id, {
          total:      all.length,
          complete:   all.filter(r => r.status === 'complete').length,
          terminated: all.filter(r => r.status === 'terminated').length,
          partial:    all.filter(r => r.status === 'partial').length,
        }]
      })
    )
  }, [useApi, surveys, tick])

  // Filter + sort
  const displayed = useMemo(() => {
    let list = [...surveys]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        (s.survey?.title || '').toLowerCase().includes(q) ||
        (s.survey?.internalName || '').toLowerCase().includes(q) ||
        (s.survey?.surveyCode || '').toLowerCase().includes(q)
      )
    }
    if (filterStatus) list = list.filter(s => (s.survey?.status || 'draft') === filterStatus)
    if (filterClient) list = list.filter(s => s.survey?.clientId === filterClient)
    if (filterTopic)  list = list.filter(s => s.survey?.topicId  === filterTopic)
    if (filterType)   list = list.filter(s => s.survey?.surveyType === filterType)

    list.sort((a, b) => {
      let av = '', bv = ''
      switch (sort.field) {
        case 'title':      av = a.survey?.title || ''; bv = b.survey?.title || ''; break
        case 'code':       av = a.survey?.surveyCode || ''; bv = b.survey?.surveyCode || ''; break
        case 'status':     av = a.survey?.status || ''; bv = b.survey?.status || ''; break
        case 'client':     av = clientMap[a.survey?.clientId] || ''; bv = clientMap[b.survey?.clientId] || ''; break
        case 'responses':  av = responseCounts[a.survey?.id]?.total || 0; bv = responseCounts[b.survey?.id]?.total || 0; break
        case 'updatedAt':  av = a.survey?.updatedAt || ''; bv = b.survey?.updatedAt || ''; break
        default: av = a.survey?.updatedAt || ''; bv = b.survey?.updatedAt || ''
      }
      const cmp = typeof av === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return list
  }, [surveys, search, filterStatus, filterClient, filterTopic, filterType, sort, responseCounts, clientMap])

  const toggleSort = (field) =>
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' })

  const handleOpenSurvey = async (entry) => {
    if (!useApi) {
      onOpenSurvey(entry)
      return
    }
    try {
      const full = await getSurvey(entry.id || entry.survey?.id)
      onOpenSurvey(payloadToLibraryEntry(entry.id || entry.survey?.id, full))
    } catch (err) {
      console.error('Failed to load survey', err)
    }
  }

  const handlePreviewSurvey = async (entry) => {
    if (!useApi) {
      onPreviewSurvey(entry)
      return
    }
    try {
      const full = await getSurvey(entry.id || entry.survey?.id)
      onPreviewSurvey(payloadToLibraryEntry(entry.id || entry.survey?.id, full))
    } catch (err) {
      console.error('Failed to load survey for preview', err)
    }
  }

  const handleDuplicate = async (id) => {
    if (!useApi) {
      duplicateSurvey(id)
      refresh()
      return
    }
    try {
      const full = await getSurvey(id)
      const now = new Date().toISOString()
      const newId = crypto.randomUUID?.() ||
        `sv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const cloneSurvey = {
        ...JSON.parse(JSON.stringify(full.survey)),
        id: newId,
        internalName: (full.survey.internalName || full.survey.title || '') + ' (copy)',
        surveyCode: full.survey.surveyCode ? full.survey.surveyCode + '_COPY' : '',
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      }
      const cloneItems = JSON.parse(JSON.stringify(full.items || []))
      await patchSurvey(newId, { survey: cloneSurvey, items: cloneItems })
      refresh()
    } catch (err) {
      console.error('Failed to duplicate survey', err)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    if (useApi) {
      try {
        await deleteSurveyApi(deleteId)
        deleteSurvey(deleteId) // keep localStorage in sync so migrate won't resurrect it
        setDeleteId(null)
        refresh()
      } catch (err) {
        console.error('Failed to delete survey', err)
      }
      return
    }
    deleteSurvey(deleteId)
    setDeleteId(null)
    refresh()
  }

  const activeFilters = [filterStatus, filterClient, filterTopic, filterType].filter(Boolean).length

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-ink-200 sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Layers size={14} className="text-white" />
            </div>
            <span className="font-bold text-ink-800 tracking-tight">SurveyForge</span>
          </div>
          <div className="w-px h-5 bg-ink-100" />
          <span className="text-sm font-semibold text-ink-600">Survey Dashboard</span>
          <div className="ml-auto flex items-center gap-2">
            {session && (
              <span className="text-xs text-ink-400 hidden md:block">
                Signed in as <strong className="text-ink-600">{session.name || session.username}</strong>
              </span>
            )}
            <button
              onClick={() => { setShowSettings(true); refresh() }}
              className="btn-ghost"
              title="Platform settings — manage clients, topics, users"
            >
              <Settings size={15} /> Settings
            </button>
            {onLogout && (
              <button onClick={onLogout} className="btn-ghost text-ink-400" title="Sign out">
                <LogOut size={15} />
              </button>
            )}
            <button onClick={onNewSurvey} className="btn-primary">
              <Plus size={15} /> New Survey
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-6">
        <StatsBar surveys={surveys} />

        {/* Filters bar */}
        <div className="card p-3 mb-4 flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 bg-ink-50 rounded-lg px-3 py-1.5 flex-1 min-w-48">
            <Search size={14} className="text-ink-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, internal name or code…"
              className="bg-transparent border-none outline-none text-sm flex-1 text-ink-700 placeholder:text-ink-400"
            />
          </div>

          {/* Filter dropdowns */}
          {[
            { label: 'Status', value: filterStatus, setter: setFilterStatus,
              options: SURVEY_STATUSES.map(s => ({ value: s.id, label: s.label })) },
            { label: 'Client', value: filterClient, setter: setFilterClient,
              options: clients.map(c => ({ value: c.id, label: c.name })) },
            { label: 'Topic', value: filterTopic, setter: setFilterTopic,
              options: topics.map(t => ({ value: t.id, label: t.name })) },
            { label: 'Type', value: filterType, setter: setFilterType,
              options: SURVEY_TYPES.map(t => ({ value: t.id, label: t.label })) },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-1.5">
              <Filter size={12} className="text-ink-400" />
              <select
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                className={`text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 ${
                  f.value ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600'
                }`}
              >
                <option value="">All {f.label}s</option>
                {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}

          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterStatus(''); setFilterClient(''); setFilterTopic(''); setFilterType('') }}
              className="text-xs text-rose-500 hover:text-rose-700 px-2 py-1 hover:bg-rose-50 rounded-lg transition-all"
            >
              Clear {activeFilters} filter{activeFilters !== 1 ? 's' : ''}
            </button>
          )}

          <span className="text-xs text-ink-400 ml-auto shrink-0">
            {displayed.length} of {surveys.length}
          </span>
        </div>

        {/* Empty state */}
        {apiLoading && (
          <div className="flex items-center justify-center py-24 text-sm text-ink-400">
            Loading surveys…
          </div>
        )}

        {!apiLoading && surveys.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
              <Layers size={28} className="text-brand-400" />
            </div>
            <h3 className="text-base font-semibold text-ink-700 mb-1">No surveys yet</h3>
            <p className="text-sm text-ink-400 mb-6">Create your first survey to get started.</p>
            <button onClick={onNewSurvey} className="btn-primary">
              <Plus size={15} /> Create first survey
            </button>
          </div>
        )}

        {/* Table */}
        {!apiLoading && surveys.length > 0 && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60">
                  {[
                    { field: 'code',      label: 'Code',        w: 'w-28' },
                    { field: 'title',     label: 'Survey',      w: 'flex-1' },
                    { field: 'status',    label: 'Status',      w: 'w-24' },
                    { field: 'client',    label: 'Client',      w: 'w-24' },
                    { field: null,        label: 'Topic / Type', w: 'w-36' },
                    { field: 'responses', label: 'Responses',   w: 'w-28' },
                    { field: 'updatedAt', label: 'Modified',    w: 'w-28' },
                    { field: null,        label: '',             w: 'w-10' },
                  ].map((col, i) => (
                    <th
                      key={i}
                      onClick={col.field ? () => toggleSort(col.field) : undefined}
                      className={`px-4 py-2.5 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider ${col.w} ${col.field ? 'cursor-pointer hover:text-ink-700 select-none' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.field && <SortIcon field={col.field} sort={sort} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-sm text-ink-400">
                      No surveys match the current filters.
                    </td>
                  </tr>
                )}
                {displayed.map(entry => {
                  const sv     = entry.survey || {}
                  const qCount = entry.questionCount ??
                    (entry.items || []).filter(i => i.itemType === 'question').length
                  const rc     = responseCounts[sv.id] || { total: 0, complete: 0 }
                  return (
                    <tr
                      key={sv.id}
                      className="border-b border-ink-50 hover:bg-ink-50/50 transition-colors cursor-pointer group"
                      onClick={() => handleOpenSurvey(entry)}
                    >
                      {/* Code */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-semibold text-ink-500 bg-ink-100 px-1.5 py-0.5 rounded">
                          {sv.surveyCode || '—'}
                        </span>
                      </td>

                      {/* Title + internal name */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink-800 truncate max-w-xs">
                          {sv.title || 'Untitled Survey'}
                        </p>
                        {sv.internalName && (
                          <p className="text-xs text-ink-400 truncate max-w-xs mt-0.5">
                            {sv.internalName}
                          </p>
                        )}
                        <p className="text-xs text-ink-300 mt-0.5">{qCount} question{qCount !== 1 ? 's' : ''}</p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge statusId={sv.status || 'draft'} />
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3 text-xs text-ink-600">
                        {clientMap[sv.clientId] || <span className="text-ink-300">—</span>}
                      </td>

                      {/* Topic + Type */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {sv.topicId && (
                            <p className="text-xs text-ink-600">{topicMap[sv.topicId]}</p>
                          )}
                          {sv.surveyType && (
                            <span className="text-xs font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                              {typeMap[sv.surveyType]}
                            </span>
                          )}
                          {!sv.topicId && !sv.surveyType && <span className="text-ink-300 text-xs">—</span>}
                        </div>
                      </td>

                      {/* Responses */}
                      <td className="px-4 py-3">
                        {rc.total > 0 ? (
                          <div>
                            <p className="text-sm font-bold text-ink-700">{rc.total}</p>
                            <p className="text-xs text-ink-400">{rc.complete} complete</p>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-300">No data</span>
                        )}
                      </td>

                      {/* Modified */}
                      <td className="px-4 py-3 text-xs text-ink-500">
                        <div className="flex items-center gap-1">
                          <Clock size={11} className="text-ink-300" />
                          {fmtDate(sv.updatedAt)}
                        </div>
                      </td>

                      {/* Menu */}
                      <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                        <SurveyMenu
                          surveyId={sv.id}
                          onOpen={() => handleOpenSurvey(entry)}
                          onPreview={() => handlePreviewSurvey(entry)}
                          onDuplicate={() => handleDuplicate(sv.id)}
                          onDelete={() => setDeleteId(sv.id)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-rose-500" />
            </div>
            <h3 className="text-base font-bold text-ink-800 mb-2">Delete this survey?</h3>
            <p className="text-sm text-ink-500 mb-6">
              This removes the survey and all its stored responses permanently. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 btn-ghost border border-ink-200">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform settings modal */}
      {showSettings && (
        <PlatformSettings onClose={() => { setShowSettings(false); refresh() }} />
      )}
    </div>
  )
}
