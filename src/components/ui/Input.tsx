import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon, ...props }, ref) => {
    return (
      <div className="w-full animate-fadeIn">
        {label && (
          <label className="block text-[12px] font-medium text-smoke mb-1.5 tracking-[-0.24px]">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-[14px] flex items-center pointer-events-none text-smoke/70">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'block w-full rounded-[12px] border border-ash-mist bg-paper-white px-[16px] py-[12px] text-[16px] text-graphite tracking-[-0.32px] placeholder:text-smoke/40',
              'focus:ring-2 focus:ring-signal-blue/50 focus:border-signal-blue focus:outline-none outline-none',
              'disabled:bg-ash-mist disabled:text-smoke/60 disabled:cursor-not-allowed',
              'transition-all duration-150',
              icon && 'pl-[42px]',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-[12px] text-red-600 tracking-[-0.24px]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-[12px] text-smoke tracking-[-0.24px]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
