export function AppHeaderShell({ children, className = '' }) {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-ink-200/80 sticky top-0 z-30 safe-top">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`min-h-[4.25rem] py-3 flex items-center gap-4 lg:gap-6 ${className}`}>
          {children}
        </div>
      </div>
    </header>
  )
}

export function AppHeaderDivider({ className = '' }) {
  return (
    <div
      className={`hidden md:block h-8 w-px bg-ink-200 shrink-0 ${className}`}
      aria-hidden="true"
    />
  )
}
