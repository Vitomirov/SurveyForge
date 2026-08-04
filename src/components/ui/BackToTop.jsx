import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowUp } from 'lucide-react'

const SCROLL_THRESHOLD = 400

function pageScrollTop() {
  return window.scrollY
    || document.documentElement.scrollTop
    || document.body.scrollTop
    || 0
}

function elementScrollTop(el) {
  if (!el || el === document) return pageScrollTop()
  if (el === document.documentElement || el === document.body) return pageScrollTop()
  return el.scrollTop || 0
}

function scrollElementToTop(el) {
  if (!el || el === document) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (typeof el.scrollTo === 'function') {
    el.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  el.scrollTop = 0
}

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  const scrollTargetRef = useRef(document.scrollingElement || document.documentElement)

  const updateVisibility = useCallback((target) => {
    const pageTop = pageScrollTop()
    let maxScroll = pageTop
    let nextTarget = document.scrollingElement || document.documentElement

    if (target && target !== document && target !== document.documentElement && target !== document.body) {
      const targetTop = elementScrollTop(target)
      if (targetTop > maxScroll) {
        maxScroll = targetTop
        nextTarget = target
      }
    }

    scrollTargetRef.current = nextTarget
    setVisible(maxScroll > SCROLL_THRESHOLD)
  }, [])

  useEffect(() => {
    const onScroll = (event) => updateVisibility(event.target)

    updateVisibility(document.documentElement)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [updateVisibility])

  const handleClick = () => {
    scrollElementToTop(scrollTargetRef.current)
    scrollElementToTop(document.scrollingElement)
    scrollElementToTop(document.documentElement)
    scrollElementToTop(document.body)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`hidden lg:flex fixed bottom-8 right-8 z-50 w-11 h-11 items-center justify-center bg-white border border-ink-200 rounded-full shadow-lg shadow-ink-900/10 text-ink-600 hover:text-brand-600 hover:border-brand-300 hover:shadow-xl transition-all focus-ring active:scale-95 ${
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <ArrowUp size={20} />
    </button>
  )
}
