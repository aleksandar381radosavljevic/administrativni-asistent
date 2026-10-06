import { cn } from '@/lib/utils/cn';
import { InputHTMLAttributes, forwardRef } from 'react';
import { Check } from 'lucide-react';

const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
        <div className= "relative inline-flex items-center" >
        <input
        ref={ ref }
        type = "checkbox"
        className = "sr-only"
        { ...props }
    />
    <div
        className={
    cn(
          'h-5 w-5 rounded border-2 border-clay-dark bg-paper transition-all',
        props.checked && 'border-amber bg-amber',
    className
        )}
      >
{
    props.checked && (
        <Check className="h-4 w-4 text-paper absolute inset-0.5" />
        )
}
    </div>
    </div>
  )
);

Checkbox.displayName = 'Checkbox';
export { Checkbox };