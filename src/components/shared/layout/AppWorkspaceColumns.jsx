/** Matches BuilderSidebar — keeps dashboard main column width in sync with builder. */
export const WORKSPACE_SIDEBAR_RAIL =
  'hidden lg:block w-64 shrink-0 pl-6'

export function AppWorkspaceColumns({ children, sidebar, className = '' }) {
  return (
    <div className={`flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0 ${className}`}>
      <main className="flex-1 min-w-0 min-h-0 flex flex-col lg:overflow-hidden">{children}</main>
      {sidebar ?? <div className={WORKSPACE_SIDEBAR_RAIL} aria-hidden="true" />}
    </div>
  )
}
