import React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string
}

export function Badge({ className, color, style, children, ...props }: BadgeProps) {
  const customStyle = color
    ? {
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
        ...style,
      }
    : style

  return (
    <span
      className={cn(
        'inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border border-outline-variant bg-surface-container text-on-surface-variant',
        className
      )}
      style={customStyle}
      {...props}
    >
      {children}
    </span>
  )
}
