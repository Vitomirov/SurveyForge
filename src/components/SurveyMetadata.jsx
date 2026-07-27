import { useState, useEffect } from 'react'
import { Tag, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  SURVEY_TYPES, SURVEY_STATUSES,
  loadClients, loadTopics,
} from '../utils/platformStore.js'
import { isSurveyCodeTaken } from '../utils/surveyLibrary.js'

const CODE_RE = /^[A-Z0-9_-]{1,20}$/i

export function SurveyMetadata({ survey, dispatch }) {
  const [clients, setClients] = useState(loadClients)
  const [topics,  setTopics]  = useState(loadTopics)
  const [codeError, setCodeError] = useState('')

  // Reload platform lists when the panel opens
  useEffect(() => {
    setClients(loadClients())
    setTopics(loadTopics())
  }, [])

  const set = (field, value) =>
    dispatch({ type: 'SET_SURVEY_FIELD', field, value })

  const validateCode = (code) => {
    if (!code) { setCodeError(''); return }
    if (!CODE_RE.test(code)) { setCodeError('Letters, numbers, - and _ only. Max 20 chars.'); return }
    if (isSurveyCodeTaken(code, survey.id)) { setCodeError('This code is already used by another survey.'); return }
    setCodeError('')
  }

  const statusMeta = SURVEY_STATUSES.find(s => s.id === (survey.status || 'draft'))

  return (
    <div className="mt-3 border-t border-ink-100 pt-3">
      <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Tag size={12} /> Internal Labels
        <span className="ml-1 text-ink-300 font-normal normal-case tracking-normal">— visible to admins only</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Internal name */}
        <div className="col-span-2">
          <label className="text-xs text-ink-500 mb-1 block">Internal name</label>
          <input
            type="text"
            value={survey.internalName || ''}
            onChange={e => set('internalName', e.target.value)}
            placeholder="e.g. Brand tracking UK Q1 2026 — internal use only"
            className="input-base text-sm"
          />
        </div>

        {/* Survey code */}
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Survey code</label>
          <div className="relative">
            <input
              type="text"
              value={survey.surveyCode || ''}
              onChange={e => { set('surveyCode', e.target.value.toUpperCase()); validateCode(e.target.value) }}
              placeholder="e.g. DMR2026172"
              className={`input-base text-sm font-mono pr-7 ${codeError ? 'border-rose-400 focus:ring-rose-400' : ''}`}
            />
            {survey.surveyCode && !codeError && (
              <CheckCircle2 size={14} className="absolute right-2 top-2.5 text-emerald-500 pointer-events-none" />
            )}
            {codeError && (
              <AlertCircle size={14} className="absolute right-2 top-2.5 text-rose-500 pointer-events-none" />
            )}
          </div>
          {codeError && <p className="text-xs text-rose-500 mt-1">{codeError}</p>}
        </div>

        {/* Status */}
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Status</label>
          <div className="flex items-center gap-2">
            <select
              value={survey.status || 'draft'}
              onChange={e => set('status', e.target.value)}
              className="input-base text-sm flex-1"
            >
              {SURVEY_STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            {statusMeta && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${statusMeta.color}`}>
                {statusMeta.label}
              </span>
            )}
          </div>
        </div>

        {/* Client */}
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Client</label>
          <select
            value={survey.clientId || ''}
            onChange={e => set('clientId', e.target.value)}
            className="input-base text-sm"
          >
            <option value="">— Select client —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Topic</label>
          <select
            value={survey.topicId || ''}
            onChange={e => set('topicId', e.target.value)}
            className="input-base text-sm"
          >
            <option value="">— Select topic —</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Survey type */}
        <div className="col-span-2">
          <label className="text-xs text-ink-500 mb-1 block">Survey type</label>
          <div className="flex gap-2 flex-wrap">
            {SURVEY_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => set('surveyType', survey.surveyType === t.id ? '' : t.id)}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg border-2 transition-all ${
                  survey.surveyType === t.id
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-ink-200 text-ink-600 hover:border-ink-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
