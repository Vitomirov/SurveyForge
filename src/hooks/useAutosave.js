import { useEffect, useRef, useState } from 'react'
import { upsertSurvey } from '@/utils/surveyLibrary'
import { patchSurvey } from '@/api/surveys'
import { ApiError } from '@/api/client'
import { useApi } from '@/config/api'

const DEFAULT_DELAY_MS = 400

async function saveToApi(s, it, revisionRef) {
  try {
    const result = await patchSurvey(s.id, {
      survey: s,
      items: it,
      revision: revisionRef.current,
    })
    revisionRef.current = result.revision
    return 'saved'
  } catch (err) {
    if (err instanceof ApiError && err.status === 409 && err.body?.revision != null) {
      revisionRef.current = err.body.revision
      const result = await patchSurvey(s.id, {
        survey: s,
        items: it,
        revision: revisionRef.current,
      })
      revisionRef.current = result.revision
      return 'saved'
    }
    throw err
  }
}

/**
 * Debounced autosave — localStorage or API PATCH when VITE_USE_API=true.
 * Saves are serialized to avoid revision conflicts from overlapping PATCHes.
 */
export function useAutosave({
  survey,
  items,
  revision: initialRevision = null,
  delayMs = DEFAULT_DELAY_MS,
  enabled = true,
}) {
  const timerRef = useRef(null)
  const latestRef = useRef({ survey, items })
  const revisionRef = useRef(initialRevision)
  const saveChainRef = useRef(Promise.resolve())
  const [saveStatus, setSaveStatus] = useState('idle')

  latestRef.current = { survey, items }

  useEffect(() => {
    if (initialRevision != null) revisionRef.current = initialRevision
  }, [initialRevision])

  const enqueueSave = (payload) => {
    if (!payload.survey?.id) return

    if (!useApi) {
      upsertSurvey({
        id: payload.survey.id,
        survey: payload.survey,
        items: payload.items,
        savedAt: new Date().toISOString(),
      })
      return
    }

    setSaveStatus('saving')
    saveChainRef.current = saveChainRef.current
      .then(() => saveToApi(payload.survey, payload.items, revisionRef))
      .then(() => setSaveStatus('saved'))
      .catch(() => setSaveStatus('error'))
  }

  useEffect(() => {
    if (!enabled || !survey?.id) return undefined

    timerRef.current = setTimeout(() => {
      enqueueSave(latestRef.current)
    }, delayMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [survey, items, delayMs, enabled])

  useEffect(() => {
    return () => {
      const payload = latestRef.current
      if (!payload.survey?.id) return
      enqueueSave(payload)
    }
  }, [])

  return { saveStatus }
}
