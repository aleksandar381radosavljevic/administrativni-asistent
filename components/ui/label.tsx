import { cn } from '@/lib/utils/cn';
import { LabelHTMLAttributes } from 'react';

const Label = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn(
      'text-sm font-semibold text-ink block mb-2',
      className
    )}
    {...props}
  />
);

export { Label };