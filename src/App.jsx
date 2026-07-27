import { useState, useCallback, useEffect } from 'react'
import { Dashboard }      from './components/Dashboard.jsx'
import { SurveyBuilder }  from './components/SurveyBuilder.jsx'
import { SurveyPreview }  from './components/SurveyPreview.jsx'
import { LoginPage }      from './components/LoginPage.jsx'
import { INITIAL_STATE }  from './store/surveyStore.js'
import { getSession, logout } from './utils/authStore.js'
import { loadSurvey }     from './utils/surveyLibrary.js'

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
    const entry = loadSurvey(publicSurveyId)
    if (!entry) { setPublicError('Survey not found. The link may be incorrect or the survey may have been removed.'); setPublicEntry(null) }
    else { setPublicEntry(entry); setPublicError(null) }
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
      <SurveyPreview
        survey={publicEntry.survey}
        items={publicEntry.items || []}
        onClose={null}
        isPublic={true}
      />
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
    setBuilderState(entry ? libraryEntryToState(entry) : null)
    setView('builder')
  }, [])

  const openPreview = useCallback((entry) => {
    setPreviewEntry(entry)
    setView('preview')
  }, [])

  const backToDashboard = useCallback(() => {
    setBuilderState(null)
    setPreviewEntry(null)
    setView('dashboard')
  }, [])

  if (view === 'builder') {
    return (
      <SurveyBuilder
        initialState={builderState}
        onBackToDashboard={backToDashboard}
      />
    )
  }

  if (view === 'preview' && previewEntry) {
    return (
      <SurveyPreview
        survey={previewEntry.survey}
        items={previewEntry.items || []}
        onClose={backToDashboard}
        isPublic={false}
      />
    )
  }

  return (
    <Dashboard
      session={session}
      onLogout={handleLogout}
      onNewSurvey={() => openBuilder(null)}
      onOpenSurvey={(entry) => openBuilder(entry)}
      onPreviewSurvey={(entry) => openPreview(entry)}
    />
  )
}
