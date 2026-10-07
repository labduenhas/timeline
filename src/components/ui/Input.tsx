import React, { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(7)

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-on-surface-variant">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all',
            error && 'border-rose-600 focus:ring-rose-600/30 focus:border-rose-600',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
