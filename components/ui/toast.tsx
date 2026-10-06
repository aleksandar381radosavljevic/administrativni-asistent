import { cn } from '@/lib/utils/cn';
import { HTMLAttributes } from 'react';

interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  type?: 'success' | 'error' | 'warning' | 'info';
  icon?: React.ReactNode;
}

const Toast = ({ className, type = 'info', icon, children, ...props }: ToastProps) => {
  const variants = {
    success: 'bg-sage-soft text-sage',
    error: 'bg-rust-soft text-rust',
    warning: 'bg-honey-soft text-[#b5851f]',
    info: 'bg-amber-soft text-amber',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg px-4 py-3',
        variants[type],
        className
      )}
      {...props}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
};

export { Toast };