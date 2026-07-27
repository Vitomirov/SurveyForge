import { UserX, Zap, Download } from 'lucide-react'

export function TerminationScreen({ settings, terminatedBy, onReset, onDownload, isPublic = false }) {
  const title   = settings?.terminateTitle   || 'Thank you for your time.'
  const message = settings?.terminateMessage || 'Unfortunately, you do not qualify for this survey.'
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
          {terminatedBy?.blockTitle ? <Zap size={36} className="text-rose-500" /> : <UserX size={36} className="text-rose-500" />}
        </div>
        <h2 className="text-2xl font-bold text-ink-800 mb-3">{title}</h2>
        <p className="text-ink-500 mb-4 leading-relaxed">{message}</p>
        {terminatedBy?.blockTitle && (
          <p className="text-xs text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">
            Triggered by: <strong>{terminatedBy.blockTitle}</strong>
          </p>
        )}
        {!isPublic && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <p className="text-xs text-amber-700 font-medium">👁 Preview mode — this is the screen-out page respondents will see</p>
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          {!isPublic && <button onClick={onReset} className="btn-ghost border border-ink-200">← Restart</button>}
          <button onClick={onDownload} className="btn-primary flex items-center gap-2">
            <Download size={14} /> Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}
