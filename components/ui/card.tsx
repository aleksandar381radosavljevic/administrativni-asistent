import { cn } from '@/lib/utils/cn';
import { HTMLAttributes } from 'react';

const Card = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'card-base bg-paper rounded-lg shadow-sm p-4',
      className
    )}
    {...props}
  />
);

export { Card };