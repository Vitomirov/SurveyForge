import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { MARKETING_DEMO_NOTICE } from '../content/marketingContent'

export function DemoNotice() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(MARKETING_DEMO_NOTICE.storageKey) === '1') return
      setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [])

  const dismiss = () => {
    setOpen(false)
    try {
      localStorage.setItem(MARKETING_DEMO_NOTICE.storageKey, '1')
    } catch {
      /* ignore */
    }
  }

  if (!open) return null

  return (
    <div className="mkt-demo-notice" role="dialog" aria-modal="true" aria-labelledby="mkt-demo-notice-title">
      <button type="button" className="mkt-demo-notice__backdrop" aria-label="Close notice" onClick={dismiss} />
      <div className="mkt-demo-notice__panel">
        <button
          type="button"
          className="mkt-demo-notice__close"
          onClick={dismiss}
          aria-label={MARKETING_DEMO_NOTICE.dismissLabel}
        >
          <X size={18} strokeWidth={2.25} aria-hidden />
        </button>
        <p className="mkt-demo-notice__eyebrow">Under construction</p>
        <h2 id="mkt-demo-notice-title" className="mkt-demo-notice__title">
          {MARKETING_DEMO_NOTICE.title}
        </h2>
        <p className="mkt-demo-notice__body">{MARKETING_DEMO_NOTICE.body}</p>
        <button type="button" className="btn btn-primary mkt-demo-notice__ok" onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  )
}
