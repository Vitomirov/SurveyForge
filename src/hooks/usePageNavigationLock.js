import { useState, useEffect, useLayoutEffect, useMemo } from 'react'

/**
 * Starts a per-page countdown when the respondent lands on a page.
 * `visitKey` must change on every navigation event (next, back, cover start).
 */
export function usePageNavigationLock(lockSeconds, visitKey, active = true) {
  const [lockDeadline, setLockDeadline] = useState(null)
  const [tick, setTick] = useState(0)

  useLayoutEffect(() => {
    if (!active || !lockSeconds || lockSeconds <= 0) {
      setLockDeadline(null)
      return
    }
    setLockDeadline(Date.now() + lockSeconds * 1000)
  }, [lockSeconds, visitKey, active])

  useEffect(() => {
    if (!lockDeadline) return

    const timer = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [lockDeadline])

  const remainingSeconds = useMemo(() => {
    if (!lockDeadline) return 0
    return Math.max(0, Math.ceil((lockDeadline - Date.now()) / 1000))
  }, [lockDeadline, tick])

  return {
    isLocked: remainingSeconds > 0,
    remainingSeconds,
  }
}
