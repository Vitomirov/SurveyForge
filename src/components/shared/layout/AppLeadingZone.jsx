import { ArrowLeft } from 'lucide-react'
import { AppLogo } from '@/components/shared/branding/AppLogo.jsx'

export const BACK_SLOT = 'w-9 h-9 shrink-0 flex items-center justify-center'

/** Back arrow or dashboard spacer — first grid column only (logo lives in the main pane). */
export function AppBackSlot({
  showBack = false,
  onBack,
  className = '',
  ...props
}) {
  if (showBack) {
    return (
      <button
        type="button"
        onClick={onBack}
        title="Back to dashboard"
        className={`${BACK_SLOT} p-2 text-ink-500 hover:text-ink-800 hover:bg-ink-50 rounded-lg transition-colors focus-ring ${className}`}
        {...props}
      >
        <ArrowLeft size={20} />
      </button>
    )
  }

  return (
    <div
      className={`${BACK_SLOT} hidden md:flex ${className}`}
      aria-hidden="true"
      {...props}
    />
  )
}

/** @deprecated Prefer AppBackSlot + AppLogo in separate grid columns for alignment. */
export function AppLeadingZone({
  showBack = false,
  onBack,
  onLogoClick,
  className = '',
  ...props
}) {
  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${className}`} {...props}>
      <AppBackSlot showBack={showBack} onBack={onBack} />
      <AppLogo onClick={onLogoClick ?? onBack} size="md" />
    </div>
  )
}
