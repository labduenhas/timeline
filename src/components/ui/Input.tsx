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
          <label htmlFor={inputId} className="block text-xs font-medium text-gray-300">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full bg-gray-900/80 border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all',
            error && 'border-rose-500 focus:ring-rose-500/50 focus:border-rose-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
