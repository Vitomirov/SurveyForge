import { Loader2 } from 'lucide-react'

// Compact spinner for modals, panels, and inline Suspense fallbacks
export function InlineLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <Loader2 size={24} className="text-brand-500 animate-spin" />
      <p className="text-sm text-ink-400">{label}</p>
    </div>
  )
}
