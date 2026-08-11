import { useEffect, useRef, useCallback } from 'react'
import { buildEmbedMessage, EMBED_EVENTS } from '@shared/embedProtocol.js'

export function useEmbedMessaging({ enabled, surveyId }) {
  const rootRef = useRef(null)
  const lastHeight = useRef(0)

  const post = useCallback((type, payload = {}) => {
    if (!enabled || window.parent === window) return
    window.parent.postMessage(
      buildEmbedMessage(type, { surveyId, ...payload }),
      '*',
    )
  }, [enabled, surveyId])

  useEffect(() => {
    if (!enabled) return
    post(EMBED_EVENTS.READY, { height: document.documentElement.scrollHeight })
  }, [enabled, post])

  useEffect(() => {
    if (!enabled || !rootRef.current) return
    const node = rootRef.current
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(node.getBoundingClientRect().height)
      if (Math.abs(height - lastHeight.current) < 4) return
      lastHeight.current = height
      post(EMBED_EVENTS.RESIZE, { height })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, post])

  return { rootRef, postCompleted: () => post(EMBED_EVENTS.COMPLETED), postTerminated: () => post(EMBED_EVENTS.TERMINATED) }
}
