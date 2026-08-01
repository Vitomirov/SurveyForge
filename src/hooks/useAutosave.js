import { useEffect, useRef, useState } from 'react'
import { upsertSurvey } from '@/utils/surveyLibrary'
import { patchSurvey } from '@/api/surveys'
import { ApiError } from '@/api/client'
import { useApi } from '@/config/api'

const DEFAULT_DELAY_MS = 400

function snapshotPayload(survey, items) {
  return {
    survey: JSON.stringify(survey),
    items: JSON.stringify(items),
  }
}

function buildPatch(survey, items, lastSaved) {
  const current = snapshotPayload(survey, items)
  const patch = {}
  if (current.survey !== lastSaved.survey) patch.survey = survey
  if (current.items !== lastSaved.items) patch.items = items
  return patch
}

async function saveToApi(id, patch, revisionRef) {
  try {
    const result = await patchSurvey(id, {
      ...patch,
      revision: revisionRef.current,
    })
    revisionRef.current = result.revision
    return 'saved'
  } catch (err) {
    if (err instanceof ApiError && err.status === 409 && err.body?.revision != null) {
      revisionRef.current = err.body.revision
      const result = await patchSurvey(id, {
        ...patch,
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
  const lastSavedRef = useRef(snapshotPayload(survey, items))
  const [saveStatus, setSaveStatus] = useState('idle')

  latestRef.current = { survey, items }

  useEffect(() => {
    if (initialRevision != null) revisionRef.current = initialRevision
  }, [initialRevision])

  useEffect(() => {
    lastSavedRef.current = snapshotPayload(survey, items)
  }, [survey?.id])

  const enqueueSave = (payload) => {
    if (!payload.survey?.id) return

    const patch = buildPatch(payload.survey, payload.items, lastSavedRef.current)
    if (!patch.survey && !patch.items) return

    if (!useApi) {
      upsertSurvey({
        id: payload.survey.id,
        survey: payload.survey,
        items: payload.items,
        savedAt: new Date().toISOString(),
      })
      lastSavedRef.current = snapshotPayload(payload.survey, payload.items)
      return
    }

    // The API creates the survey on its first PATCH, which needs the whole document.
    const body = revisionRef.current == null
      ? { survey: payload.survey, items: payload.items }
      : patch

    setSaveStatus('saving')
    saveChainRef.current = saveChainRef.current
      .then(() => saveToApi(payload.survey.id, body, revisionRef))
      .then(() => {
        lastSavedRef.current = snapshotPayload(payload.survey, payload.items)
        setSaveStatus('saved')
      })
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
