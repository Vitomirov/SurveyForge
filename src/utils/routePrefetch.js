import { getSession } from '@/utils/authStore'

const started = new Set()

/** Fire a dynamic import once — shares module cache with React.lazy. */
export function prefetchModule(importFn) {
  const key = importFn.toString()
  if (started.has(key)) return
  started.add(key)
  importFn()
}

export function parseTakeHash() {
  const hash = window.location.hash || ''
  const m = hash.match(/^#\/take\/([^/]+)$/)
  return m ? m[1] : null
}

/** Prefetch the route chunk(s) most likely needed next. */
export function prefetchForRoute({ session, publicSurveyId } = {}) {
  const pub = publicSurveyId ?? parseTakeHash()
  const sess = session ?? getSession()

  if (pub) {
    prefetchModule(() => import('@/components/taker/SurveyPreview.jsx'))
    prefetchCommonQuestions()
    return
  }
  if (sess) {
    prefetchModule(() => import('@/components/dashboard/Dashboard.jsx'))
    prefetchModule(() => import('@/components/builder/SurveyBuilder.jsx'))
    prefetchCommonEditors()
    return
  }
  prefetchModule(() => import('@/components/auth/LoginPage.jsx'))
}

export const prefetchDashboard = () =>
  prefetchModule(() => import('@/components/dashboard/Dashboard.jsx'))

export const prefetchBuilder = () =>
  prefetchModule(() => import('@/components/builder/SurveyBuilder.jsx'))

export const prefetchPreview = () =>
  prefetchModule(() => import('@/components/taker/SurveyPreview.jsx'))

/** Default question type + common editor — loaded when builder opens. */
export function prefetchCommonEditors() {
  prefetchModule(() => import('@/components/builder/editors/ChoiceEditor.jsx'))
  prefetchModule(() => import('@/components/builder/editors/OpenTextEditor.jsx'))
}

export function prefetchCommonQuestions() {
  prefetchModule(() => import('@/components/taker/questions/SingleSelectQ.jsx'))
  prefetchModule(() => import('@/components/taker/questions/OpenTextQ.jsx'))
}
