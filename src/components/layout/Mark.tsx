import { cn } from '@/lib/utils'

export function Mark({ className }: { className?: string }) {
  return (
    <img
      src="/logo-patch.png"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn('object-contain select-none dark:invert', className)}
    />
  )
}
