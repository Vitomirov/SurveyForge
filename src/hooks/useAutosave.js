import { useEffect, useRef } from 'react'
import { upsertSurvey } from '@/utils/surveyLibrary'

const DEFAULT_DELAY_MS = 400

/**
 * Debounced autosave — persists survey state after typing pauses.
 * Flushes pending changes on unmount so nothing is lost when leaving the builder.
 */
export function useAutosave({ survey, items, delayMs = DEFAULT_DELAY_MS, enabled = true }) {
  const timerRef = useRef(null)
  const latestRef = useRef({ survey, items })

  latestRef.current = { survey, items }

  useEffect(() => {
    if (!enabled || !survey?.id) return undefined

    timerRef.current = setTimeout(() => {
      const { survey: s, items: it } = latestRef.current
      if (!s?.id) return
      upsertSurvey({
        id: s.id,
        survey: s,
        items: it,
        savedAt: new Date().toISOString(),
      })
    }, delayMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [survey, items, delayMs, enabled])

  useEffect(() => {
    return () => {
      const { survey: s, items: it } = latestRef.current
      if (!s?.id) return
      upsertSurvey({
        id: s.id,
        survey: s,
        items: it,
        savedAt: new Date().toISOString(),
      })
    }
  }, [])
}
