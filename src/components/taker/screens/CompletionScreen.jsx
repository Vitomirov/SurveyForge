import { Check, Download } from 'lucide-react'

export function CompletionScreen({ onReset, onDownload, isPublic = false }) {
  return (
    <div className="flex-1 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <Check size={32} className="text-emerald-500 sm:hidden" />
          <Check size={36} className="text-emerald-500 hidden sm:block" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-ink-800 mb-3">Survey Complete</h2>
        <p className="text-ink-500 mb-4">
          {isPublic ? 'Thank you for completing this survey. Your responses have been recorded.' : 'All responses captured. Download the CSV to see exactly how this response would be exported.'}
        </p>
        {!isPublic && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <p className="text-xs text-amber-700 font-medium">👁 Preview mode — download exports this single test response</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3">
          {!isPublic && <button onClick={onReset} className="btn-ghost border border-ink-200 justify-center">← Restart</button>}
          <button onClick={onDownload} className="btn-primary flex items-center gap-2 justify-center">
            <Download size={14} /> Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}
