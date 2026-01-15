import * as React from 'react'

import { cn } from '@/lib/utils'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', type, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      default: 'bg-primary-600 text-white hover:bg-primary-700',
      outline:
        'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50',
    }

    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={cn(base, variants[variant], className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
