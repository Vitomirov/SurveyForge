import { X } from 'lucide-react'

/**
 * Shared modal shell: dimmed overlay, rounded card, icon header with title/
 * subtitle, close button, scrollable body, and an optional footer.
 *
 * Pass `footer={null}` to hide the footer, or a node to override the default
 * "Done" button.
 */
export function Modal({
  icon: Icon,
  iconClass = 'bg-brand-600',
  title,
  subtitle,
  onClose,
  maxWidth = 'max-w-3xl',
  bodyClassName = '',
  footer,
  children,
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl w-full ${maxWidth} shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100 shrink-0">
          {Icon && (
            <div className={`w-8 h-8 rounded-lg ${iconClass} flex items-center justify-center`}>
              <Icon size={16} className="text-white" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-base font-bold text-ink-800">{title}</h2>
            {subtitle && <p className="text-xs text-ink-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-100 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto p-5 ${bodyClassName}`}>
          {children}
        </div>

        {footer !== null && (
          <div className="px-5 pb-5 flex justify-end shrink-0">
            {footer ?? (
              <button type="button" onClick={onClose} className="btn-primary px-6">Done</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
