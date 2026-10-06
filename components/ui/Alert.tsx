import { cn } from '@/lib/utils/cn';
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { HTMLAttributes } from 'react';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
    type?: 'info' | 'warning' | 'error' | 'success';
    title?: string;
}

const Alert = ({ className, type = 'info', title, children, ...props }: AlertProps) => {
    const variants = {
        info: 'bg-amber-soft text-amber border-l-4 border-amber',
        warning: 'bg-honey-soft text-[#b5851f] border-l-4 border-honey',
        error: 'bg-rust-soft text-rust border-l-4 border-rust',
        success: 'bg-sage-soft text-sage border-l-4 border-sage',
    };

    const icons = {
        info: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    error: <AlertTriangle className="w-5 h-5" />,
    success: <CheckCircle className="w-5 h-5" />,
    };

    return (
        <div
      className= {
        cn(
        'flex gap-3 rounded-lg px-4 py-3',
            variants[type],
            className
        )
    }
    {...props }
    >
        <span className="flex-shrink-0" > { icons[type]} </span>
            < div className = "flex-1" >
                { title && <p className="font-semibold" > { title } </p>
}
<p className="text-sm" > { children } </p>
    </div>
    </div>
  );
};

export { Alert };