import { useEffect, useRef, useState } from 'react'
import { upsertSurvey } from '@/utils/data/surveyLibrary'
import { getSurvey, patchSurvey } from '@/api/survey/surveys'
import { ApiError } from '@/api/client'
import { useApi } from '@/config/api'
import { clearNewSurveyDraft } from '@/utils/data/surveyDrafts'

const DEFAULT_DELAY_MS = 400

export function isRevisionConflict(err) {
  return err instanceof ApiError && err.status === 409 && err.body?.revision != null
}

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
  const result = await patchSurvey(id, {
    ...patch,
    revision: revisionRef.current,
  })
  revisionRef.current = result.revision
  return result
}

async function reloadAfterConflict(id, revisionRef, lastSavedRef) {
  const remote = await getSurvey(id)
  if (remote?.revision != null) revisionRef.current = remote.revision
  lastSavedRef.current = snapshotPayload(remote.survey, remote.items || [])
  return remote
}

/**
 * Debounced autosave — localStorage or API PATCH when VITE_USE_API=true.
 * Saves are serialized to avoid revision conflicts from overlapping PATCHes.
 * A 409 refetches the server copy and hydrates the builder; the stale local
 * patch is never replayed against the new revision.
 */
export function useAutosave({
  survey,
  items,
  revision: initialRevision = null,
  delayMs = DEFAULT_DELAY_MS,
  enabled = true,
  onSaved,
  onConflict,
}) {
  const timerRef = useRef(null)
  const latestRef = useRef({ survey, items })
  const revisionRef = useRef(initialRevision)
  const saveChainRef = useRef(Promise.resolve())
  const lastSavedRef = useRef(snapshotPayload(survey, items))
  const onSavedRef = useRef(onSaved)
  const onConflictRef = useRef(onConflict)
  const [saveStatus, setSaveStatus] = useState('idle')

  latestRef.current = { survey, items }
  onSavedRef.current = onSaved
  onConflictRef.current = onConflict

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
      const entry = upsertSurvey({
        id: payload.survey.id,
        survey: payload.survey,
        items: payload.items,
        savedAt: new Date().toISOString(),
      })
      const saved = entry.find(s => s.id === payload.survey.id)
      lastSavedRef.current = snapshotPayload(saved?.survey || payload.survey, payload.items)
      onSavedRef.current?.({ publicPath: saved?.survey?.publicPath }, payload)
      return
    }

    const body = revisionRef.current == null
      ? { survey: payload.survey, items: payload.items }
      : patch

    setSaveStatus('saving')
    saveChainRef.current = saveChainRef.current
      .then(() => saveToApi(payload.survey.id, body, revisionRef))
      .then((result) => {
        const savedSurvey = result.publicPath
          ? { ...payload.survey, publicPath: result.publicPath }
          : payload.survey
        lastSavedRef.current = snapshotPayload(savedSurvey, payload.items)
        clearNewSurveyDraft(payload.survey.id)
        setSaveStatus('saved')
        onSavedRef.current?.(result, payload)
      })
      .catch(async (err) => {
        if (!isRevisionConflict(err)) {
          setSaveStatus('error')
          return
        }
        try {
          const remote = await reloadAfterConflict(
            payload.survey.id,
            revisionRef,
            lastSavedRef,
          )
          setSaveStatus('conflict')
          onConflictRef.current?.(remote)
        } catch {
          setSaveStatus('error')
        }
      })
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
