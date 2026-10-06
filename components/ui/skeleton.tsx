import { cn } from '@/lib/utils/cn';
import { HTMLAttributes } from 'react';

const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('skeleton bg-clay rounded-lg animate-pulse-subtle', className)}
    {...props}
  />
);

export { Skeleton };