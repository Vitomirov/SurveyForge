import { useState, useCallback, useEffect } from 'react'
import { Dashboard, LoginPage, SurveyBuilder, SurveyPreview } from '@/components'
import { ErrorBoundary } from '@/components/shared'
import { INITIAL_STATE } from '@/store/surveyStore'
import { getSession, logout } from '@/utils/authStore'
import { loadSurvey } from '@/utils/surveyLibrary'
import { useApi } from '@/config/api'
import { getPublicSurvey } from '@/api/surveys'

function libraryEntryToState(entry) {
  return {
    ...INITIAL_STATE,
    survey:        entry.survey,
    items:         entry.items || [],
    activeItemId:  null,
    focusOptionId: null,
    isDirty:       false,
    showPreview:   false,
  }
}

// ─── Parse hash for public survey-taking route ──────────────────────────────
// Format: #/take/SURVEY_ID
function parseHash() {
  const hash = window.location.hash || ''
  const m    = hash.match(/^#\/take\/([^/]+)$/)
  return m ? m[1] : null
}

export default function App() {
  const [session,      setSession]      = useState(() => getSession())
  const [view,         setView]         = useState('dashboard')
  const [builderState, setBuilderState] = useState(null)
  const [builderRevision, setBuilderRevision] = useState(null)
  const [previewEntry, setPreviewEntry] = useState(null)
  // Public survey-taking state
  const [publicSurveyId, setPublicSurveyId] = useState(() => parseHash())
  const [publicEntry,    setPublicEntry]    = useState(null)
  const [publicError,    setPublicError]    = useState(null)

  // Load survey for public route on mount / hash change
  useEffect(() => {
    const onHash = () => setPublicSurveyId(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!publicSurveyId) { setPublicEntry(null); setPublicError(null); return }

    if (useApi) {
      let cancelled = false
      getPublicSurvey(publicSurveyId)
        .then(data => {
          if (cancelled) return
          setPublicEntry({ survey: data.survey, items: data.items || [] })
          setPublicError(null)
        })
        .catch(() => {
          if (cancelled) return
          setPublicError('Survey not found. The link may be incorrect or the survey may have been removed.')
          setPublicEntry(null)
        })
      return () => { cancelled = true }
    }

    const entry = loadSurvey(publicSurveyId)
    if (!entry) {
      setPublicError('Survey not found. The link may be incorrect or the survey may have been removed.')
      setPublicEntry(null)
    } else {
      setPublicEntry(entry)
      setPublicError(null)
    }
  }, [publicSurveyId])

  // ── Public survey route — no login required ─────────────────────────────
  if (publicSurveyId) {
    if (publicError) {
      return (
        <div className="min-h-screen bg-ink-50 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-ink-800 mb-2">Survey not found</h2>
            <p className="text-ink-500">{publicError}</p>
          </div>
        </div>
      )
    }
    if (!publicEntry) {
      return (
        <div className="min-h-screen bg-ink-50 flex items-center justify-center">
          <div className="text-ink-400 text-sm">Loading survey…</div>
        </div>
      )
    }
    // Survey found — SurveyPreview handles closed/draft status internally
    return (
      <ErrorBoundary title="Survey error">
        <SurveyPreview
          survey={publicEntry.survey}
          items={publicEntry.items || []}
          onClose={null}
          isPublic={true}
        />
      </ErrorBoundary>
    )
  }

  // ── Admin routes — login required ───────────────────────────────────────
  if (!session) {
    return <LoginPage onLogin={s => setSession(s)} />
  }

  const handleLogout = () => {
    logout()
    setSession(null)
    setView('dashboard')
  }

  const openBuilder = useCallback((entry = null) => {
    setBuilderRevision(entry?.revision ?? null)
    setBuilderState(entry ? libraryEntryToState(entry) : null)
    setView('builder')
  }, [])

  const openPreview = useCallback((entry) => {
    setPreviewEntry(entry)
    setView('preview')
  }, [])

  const backToDashboard = useCallback(() => {
    setBuilderState(null)
    setBuilderRevision(null)
    setPreviewEntry(null)
    setView('dashboard')
  }, [])

  if (view === 'builder') {
    return (
      <ErrorBoundary title="Builder error" onReset={backToDashboard}>
        <SurveyBuilder
          initialState={builderState}
          initialRevision={builderRevision}
          onBackToDashboard={backToDashboard}
        />
      </ErrorBoundary>
    )
  }

  if (view === 'preview' && previewEntry) {
    return (
      <ErrorBoundary title="Preview error" onReset={backToDashboard}>
        <SurveyPreview
          survey={previewEntry.survey}
          items={previewEntry.items || []}
          onClose={backToDashboard}
          isPublic={false}
        />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary title="Dashboard error" onReset={() => setView('dashboard')}>
      <Dashboard
        session={session}
        onLogout={handleLogout}
        onNewSurvey={() => openBuilder(null)}
        onOpenSurvey={(entry) => openBuilder(entry)}
        onPreviewSurvey={(entry) => openPreview(entry)}
      />
    </ErrorBoundary>
  )
}
