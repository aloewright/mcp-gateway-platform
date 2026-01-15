import * as React from 'react'

import { cn } from '@/lib/utils'

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'h-4 w-4 rounded border border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-600',
          className
        )}
        {...props}
      />
    )
  }
)
Checkbox.displayName = 'Checkbox'
