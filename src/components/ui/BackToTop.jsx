import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

const SCROLL_THRESHOLD = 400

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`hidden lg:flex fixed bottom-8 right-8 z-40 w-11 h-11 items-center justify-center bg-white border border-ink-200 rounded-full shadow-lg shadow-ink-900/10 text-ink-600 hover:text-brand-600 hover:border-brand-300 hover:shadow-xl transition-all focus-ring active:scale-95 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <ArrowUp size={20} />
    </button>
  )
}
