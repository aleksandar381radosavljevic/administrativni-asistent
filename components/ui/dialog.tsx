import { cn } from '@/lib/utils/cn';
import { HTMLAttributes } from 'react';

interface DialogProps extends HTMLAttributes<HTMLDivElement> {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: string;
    children?: React.ReactNode;
}

const Dialog = ({
    open = false,
    onOpenChange,
    title,
    children,
    className,
    ...props
}: DialogProps) => {
    if (!open) return null;

    return (
        <>
        {/* Backdrop */ }
        < div
        className = "fixed inset-0 z-40 bg-black/30"
    onClick = {() => onOpenChange?.(false)}
      />

{/* Modal */ }
<div
        className={
    cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-paper p-6 shadow-lg',
        className
    )
}
{...props }
      >
    { title && (
        <h2 className="text-heading mb-4" > { title } </h2>
        )}
{ children }
</div>
    </>
  );
};

export { Dialog };