import { lazy, Suspense, useMemo } from 'react'

export function LazyComponent({ loader, fallback = null, ...props }) {
  const Component = useMemo(() => lazy(loader), [loader])
  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  )
}
