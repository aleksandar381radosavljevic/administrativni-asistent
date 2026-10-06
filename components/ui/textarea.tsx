import { cn } from '@/lib/utils/cn';
import { TextareaHTMLAttributes, forwardRef } from 'react';

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'input-base w-full rounded-lg px-4 py-3 text-sm bg-paper border border-clay-dark text-ink placeholder-ink-muted focus-ring resize-none',
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = 'Textarea';
export { Textarea };