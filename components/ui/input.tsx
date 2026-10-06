import { cn } from '@/lib/utils/cn';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'input-base w-full rounded-lg px-4 py-3 text-sm bg-paper border border-clay-dark text-ink placeholder-ink-muted focus-ring',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';
export { Input };