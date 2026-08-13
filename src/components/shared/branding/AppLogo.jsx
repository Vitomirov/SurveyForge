import logoUrl from '@/assets/brand/logo.svg'
import { APP_NAME } from '@/constants/branding'

const HEIGHT = {
  sm: 'h-7',
  md: 'h-9',
  lg: 'h-11',
}

export function AppLogo({
  onClick,
  size = 'md',
  className = '',
  title = `Back to ${APP_NAME}`,
}) {
  const img = (
    <img
      src={logoUrl}
      alt={APP_NAME}
      className={`${HEIGHT[size]} w-auto max-w-[7.5rem] sm:max-w-[10rem] md:max-w-none object-contain object-left ${className}`}
      draggable={false}
    />
  )

  if (!onClick) return img

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center shrink-0 rounded-lg hover:opacity-90 active:opacity-80 transition-opacity focus-ring"
    >
      {img}
    </button>
  )
}
