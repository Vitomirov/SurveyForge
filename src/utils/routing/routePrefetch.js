import { getSession } from '../data/authStore.js'
import { parseTakeHash } from './appRoute.js'

const started = new Set()

/** Fire a dynamic import once — shares module cache with React.lazy. */
export function prefetchModule(importFn) {
  const key = importFn.toString()
  if (started.has(key)) return
  started.add(key)
  importFn()
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
  prefetchModule(() => import('@/components/builder/editors/choice/ChoiceEditor.jsx'))
  prefetchModule(() => import('@/components/builder/editors/basic/OpenTextEditor.jsx'))
}

export function prefetchCommonQuestions() {
  prefetchModule(() => import('@/components/taker/questions/choice/SingleSelectQ.jsx'))
  prefetchModule(() => import('@/components/taker/questions/basic/OpenTextQ.jsx'))
}
