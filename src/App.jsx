import { useState, useEffect, lazy, Suspense } from 'react'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { PageLoader, useToast } from '@/components/ui'
import { INITIAL_STATE } from '@/store/initialState'
import { newSurveyId } from '@/store/id'
import { getSession, logout } from '@/utils/authStore'
import { onAuthInvalidated } from '@/api/authEvents'
import { AUTH_ERRORS } from '@/constants/authCopy'
import { useApi } from '@/config/api'
import { prefetchForRoute } from '@/utils/routePrefetch'
import { useRoute, nav } from '@/utils/appRoute'
import { SURVEY_NOT_FOUND_MESSAGE, SURVEY_NOT_FOUND_TITLE } from '@/constants/errors'

const LoginPage     = lazy(() => import('@/components/auth/LoginPage.jsx'))
const Dashboard     = lazy(() => import('@/components/dashboard/Dashboard.jsx'))
const SurveyBuilder = lazy(() => import('@/components/builder/SurveyBuilder.jsx'))
const SurveyPreview = lazy(() => import('@/components/taker/SurveyPreview.jsx'))

prefetchForRoute()

/** Load the survey named by the route — public payload for the taker link. */
async function fetchEntry(view, id, { byPath = false, clientDomain = null } = {}) {
  if (useApi) {
    const { getSurvey, getPublicSurvey, getPublicSurveyByPath, payloadToLibraryEntry } =
      await import('@/api/surveys')
    const payload = view === 'take'
      ? (byPath
        ? await getPublicSurveyByPath(id, clientDomain)
        : await getPublicSurvey(id))
      : await getSurvey(id)
    return payloadToLibraryEntry(id, payload)
  }
  const { loadSurvey, loadSurveyByPublicPath } = await import('@/utils/surveyLibrary')
  if (view === 'take' && byPath) return loadSurveyByPublicPath(id, clientDomain)
  return loadSurvey(id)
}

/** Survey for the current route: 'loading' | 'ready' | 'missing' | 'error'. */
function useSurveyEntry(view, id, { byPath = false, clientDomain = null } = {}) {
  const [state, setState] = useState(() => ({ status: id ? 'loading' : 'ready', entry: null }))

  useEffect(() => {
    if (!id) { setState({ status: 'ready', entry: null }); return }
    let alive = true
    setState({ status: 'loading', entry: null })
    fetchEntry(view, id, { byPath, clientDomain })
      .then(entry => { if (alive) setState({ status: entry ? 'ready' : 'missing', entry }) })
      .catch(err  => { if (alive) setState({ status: err?.status === 404 ? 'missing' : 'error', entry: null }) })
    return () => { alive = false }
  }, [view, id, byPath, clientDomain])

  return state
}

/** Shared shell — error recovery around a lazily loaded view. */
function Page({ title, label, onReset, children }) {
  return (
    <ErrorBoundary title={title} onReset={onReset}>
      <Suspense fallback={<PageLoader label={label} />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

function NotFound({ onBack }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-ink-800 mb-2">{SURVEY_NOT_FOUND_TITLE}</h2>
        <p className="text-ink-500 mb-4">{SURVEY_NOT_FOUND_MESSAGE}</p>
        {onBack && (
          <button type="button" onClick={onBack} className="text-brand-600 hover:text-brand-700 font-medium">
            Back to dashboard
          </button>
        )}
      </div>
    </div>
  )
}

/** Existing survey, or a blank draft that autosaves under the route's id. */
function builderState(id, entry) {
  return {
    ...INITIAL_STATE,
    survey: entry?.survey || { ...INITIAL_STATE.survey, id },
    items:  entry?.items || [],
  }
}

export default function App() {
  const [session, setSession] = useState(getSession)
  const { toast }             = useToast()
  const { view, id, byPath, clientDomain } = useRoute()
  const isPublic              = view === 'take'
  const { status, entry }     = useSurveyEntry(view, isPublic || session ? id : null, { byPath, clientDomain })

  useEffect(() => {
    return onAuthInvalidated((code) => {
      logout()
      setSession(null)
      nav('dashboard')
      const message = code === 'TOKEN_EXPIRED'
        ? AUTH_ERRORS.sessionExpired
        : AUTH_ERRORS.sessionInvalid
      toast({ message, type: 'error', duration: 4500 })
    })
  }, [toast])

  useEffect(() => {
    prefetchForRoute({ session, publicSurveyId: isPublic ? id : null })
  }, [session, isPublic, id])

  const back = () => nav('dashboard')

  if (isPublic) {
    if (status === 'loading') return <PageLoader label="Loading survey…" />
    if (status !== 'ready')   return <NotFound />
    return (
      <Page title="Survey error" label="Loading survey…">
        <SurveyPreview survey={entry.survey} items={entry.items || []} onClose={null} isPublic />
      </Page>
    )
  }

  if (!session) {
    return (
      <Page title="Sign-in error" label="Loading…">
        <LoginPage onLogin={(s) => { prefetchForRoute({ session: s }); setSession(s) }} />
      </Page>
    )
  }

  if (view === 'builder') {
    if (status === 'loading') return <PageLoader label="Loading builder…" />
    if (status === 'error')   return <NotFound onBack={back} />
    return (
      <Page title="Builder error" label="Loading builder…" onReset={back}>
        <SurveyBuilder
          key={id}
          initialState={builderState(id, entry)}
          initialRevision={entry?.revision ?? null}
          onBackToDashboard={back}
        />
      </Page>
    )
  }

  if (view === 'preview') {
    if (status === 'loading') return <PageLoader label="Loading preview…" />
    if (status !== 'ready')   return <NotFound onBack={back} />
    return (
      <Page title="Preview error" label="Loading preview…" onReset={back}>
        <SurveyPreview survey={entry.survey} items={entry.items || []} onClose={back} isPublic={false} />
      </Page>
    )
  }

  return (
    <Page title="Dashboard error" label="Loading dashboard…" onReset={back}>
      <Dashboard
        session={session}
        onLogout={() => { logout(); setSession(null); nav('dashboard') }}
        onNewSurvey={() => nav('builder', newSurveyId())}
        onOpenSurvey={(surveyId) => nav('builder', surveyId)}
        onPreviewSurvey={(surveyId) => nav('preview', surveyId)}
      />
    </Page>
  )
}
