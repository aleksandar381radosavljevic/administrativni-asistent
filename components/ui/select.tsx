import { cn } from '@/lib/utils/cn';
import { SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'input-base w-full rounded-lg px-4 py-3 text-sm bg-paper border border-clay-dark text-ink placeholder-ink-muted focus-ring appearance-none pr-10',
          className
        )}
        {...props}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
    </div>
  )
);

Select.displayName = 'Select';
export { Select };