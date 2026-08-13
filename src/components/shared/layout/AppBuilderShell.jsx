import { APP_SHELL_MAX_WIDTH } from '@/constants/layout'
import { AppLeadingZone } from '@/components/shared/layout/AppLeadingZone.jsx'

export const APP_SHELL_PADDING = 'px-4 sm:px-6 lg:px-8'

/** Leading brand column + main pane. Used by headers (logo is always visible). */
export const APP_SHELL_GRID =
  'grid grid-cols-[auto_1fr] grid-rows-[minmax(0,1fr)] gap-x-2 sm:gap-x-3 md:gap-x-4 lg:gap-x-6 min-h-0'

/** Body grid: full-width on small screens; aligns to header logo column from md up. */
export const APP_BODY_GRID =
  'grid grid-cols-1 md:grid-cols-[auto_1fr] grid-rows-[minmax(0,1fr)] md:gap-x-4 lg:gap-x-6 min-h-0'

export const APP_MAIN_PANE =
  'min-w-0 md:border-l md:border-ink-200 md:pl-4 lg:pl-6'

/** Builder main pane — no divider; content edge aligns with grid column. */
export const APP_BUILDER_PANE = 'min-w-0'

export function AppShell({ children, className = '' }) {
  return (
    <div
      className={`mx-auto w-full ${APP_SHELL_PADDING} ${className}`}
      style={{ maxWidth: APP_SHELL_MAX_WIDTH }}
    >
      {children}
    </div>
  )
}

/** @deprecated Use AppShell */
export const AppBuilderShell = AppShell

/** @deprecated Use APP_SHELL_GRID */
export const APP_BUILDER_GRID = APP_SHELL_GRID

export function AppAlignedBody({
  children,
  className = '',
  gridClassName = '',
  paneClassName = '',
  showBack = false,
  onBack,
  onLogoClick,
  withDivider = true,
}) {
  const paneBase = withDivider ? APP_MAIN_PANE : APP_BUILDER_PANE

  return (
    <AppShell className={className}>
      <div className={`${APP_BODY_GRID} ${gridClassName}`}>
        <div className="hidden md:contents">
          <AppLeadingZone
            showBack={showBack}
            onBack={onBack}
            onLogoClick={onLogoClick ?? onBack}
            className="invisible pointer-events-none"
            aria-hidden="true"
          />
        </div>
        <div className={`${paneBase} min-h-0 lg:overflow-hidden ${paneClassName}`}>
          {children}
        </div>
      </div>
    </AppShell>
  )
}
