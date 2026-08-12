import { AppAlignedBody } from '@/components/shared/layout/AppBuilderShell.jsx'

export function AppContentShell({ children, className = '', innerClassName = '' }) {
  return (
    <AppAlignedBody
      className={className}
      paneClassName={innerClassName}
      withDivider={false}
    >
      {children}
    </AppAlignedBody>
  )
}
