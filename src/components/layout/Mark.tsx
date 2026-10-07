import { cn } from '@/lib/utils'
import { useSite } from '@/context/SiteContext'

export function Mark({ className }: { className?: string }) {
  const { settings } = useSite()
  const src = settings.logo_url || '/logo-patch.png'
  const invert = settings.logo_invert !== '0'

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn('object-contain select-none', invert && 'dark:invert', className)}
    />
  )
}
