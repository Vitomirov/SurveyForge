import { ArrowLeft } from 'lucide-react'
import { AppLogo } from '@/components/shared/branding/AppLogo.jsx'

const BACK_SLOT = 'w-9 h-9 shrink-0 flex items-center justify-center'

/** Logo slot is fixed across dashboard (spacer) and builder (back arrow). */
export function AppLeadingZone({
  showBack = false,
  onBack,
  onLogoClick,
  className = '',
  ...props
}) {
  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${className}`} {...props}>
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          title="Back to dashboard"
          className={`${BACK_SLOT} p-2 text-ink-500 hover:text-ink-800 hover:bg-ink-50 rounded-lg transition-colors focus-ring`}
        >
          <ArrowLeft size={20} />
        </button>
      ) : (
        <div className={BACK_SLOT} aria-hidden="true" />
      )}
      <AppLogo onClick={onLogoClick ?? onBack} size="md" />
    </div>
  )
}
