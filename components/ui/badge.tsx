import { cn } from '@/lib/utils/cn';
import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'online' | 'in-person' | 'by-mail' | 'required' | 'optional' | 'success' | 'warning' | 'error';
}

const Badge = ({ className, variant = 'optional', ...props }: BadgeProps) => {
  const variants = {
    online: 'bg-sage-soft text-sage',
    'in-person': 'bg-amber-soft text-amber',
    'by-mail': 'bg-honey-soft text-[#b5851f]',
    required: 'bg-amber-soft text-amber',
    optional: 'bg-clay text-ink-muted',
    success: 'bg-sage-soft text-sage',
    warning: 'bg-honey-soft text-[#b5851f]',
    error: 'bg-rust-soft text-rust',
  };

  return (
    <span
      className={cn(
        'badge inline-block rounded-full px-3 py-1 text-xs font-bold',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export { Badge };