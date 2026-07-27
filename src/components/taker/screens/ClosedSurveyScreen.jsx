export function ClosedSurveyScreen({ settings }) {
  const title   = settings?.closedTitle   || 'This survey is now closed.'
  const message = settings?.closedMessage || 'Thank you for your interest. This survey is no longer accepting responses.'
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🔒</span>
        </div>
        <h2 className="text-2xl font-bold text-ink-800 mb-3">{title}</h2>
        <p className="text-ink-500 leading-relaxed">{message}</p>
      </div>
    </div>
  )
}
