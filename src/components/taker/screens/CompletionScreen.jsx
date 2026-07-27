import { Check, Download } from 'lucide-react'

export function CompletionScreen({ onReset, onDownload, isPublic = false }) {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <Check size={36} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-ink-800 mb-3">Survey Complete</h2>
        <p className="text-ink-500 mb-4">
          {isPublic ? 'Thank you for completing this survey. Your responses have been recorded.' : 'All responses captured. Download the CSV to see exactly how this response would be exported.'}
        </p>
        {!isPublic && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <p className="text-xs text-amber-700 font-medium">👁 Preview mode — download exports this single test response</p>
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
