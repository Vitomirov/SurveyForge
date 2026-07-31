// Branded full-page skeleton — reuse everywhere Suspense wraps a route/view
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 p-6">
      <div className="w-10 h-10 rounded-xl bg-brand-100 animate-pulse" />
      <p className="text-sm text-ink-400">{label}</p>
    </div>
  )
}
