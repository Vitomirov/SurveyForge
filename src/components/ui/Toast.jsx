import { createContext, useContext, useState, useCallback } from 'react'
import { Check, X, AlertCircle } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: Check,
  error: AlertCircle,
  info: AlertCircle,
}

const STYLES = {
  success: 'bg-ink-900 text-white border-ink-700',
  error: 'bg-rose-600 text-white border-rose-500',
  info: 'bg-white text-ink-800 border-ink-200 shadow-lg',
}

function ToastItem({ id, message, type, onDismiss }) {
  const Icon = ICONS[type] || Check
  return (
    <div
      role="status"
      aria-live="polite"
      className={`toast-enter flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium shadow-xl pointer-events-auto ${STYLES[type] || STYLES.success}`}
    >
      <Icon size={15} className="shrink-0 opacity-90" />
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="ml-1 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(({ message, type = 'success', duration = 2800 }) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev.slice(-2), { id, message, type }])
    setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col-reverse items-center gap-2 pointer-events-none safe-bottom"
        aria-label="Notifications"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
