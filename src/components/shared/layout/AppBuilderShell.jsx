import { APP_SHELL_MAX_WIDTH } from '@/constants/layout'
import { AppLeadingZone } from '@/components/shared/layout/AppLeadingZone.jsx'

export const APP_SHELL_PADDING = 'px-4 sm:px-6 lg:px-8'

/** Leading brand column + main pane (divider is the pane's left border on md+). */
export const APP_SHELL_GRID =
  'grid grid-cols-[auto_1fr] gap-x-3 md:gap-x-4 lg:gap-x-6'

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
      <div className={`${APP_SHELL_GRID} ${gridClassName}`}>
        <AppLeadingZone
          showBack={showBack}
          onBack={onBack}
          onLogoClick={onLogoClick ?? onBack}
          className="invisible pointer-events-none"
          aria-hidden="true"
        />
        <div className={`${paneBase} ${paneClassName}`}>
          {children}
        </div>
      </div>
    </AppShell>
  )
}
