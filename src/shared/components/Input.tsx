import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-neutral-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'rounded-md border border-neutral-300 px-4 py-2.5 text-base',
            'focus:border-accent-500 focus:ring-accent-100 focus:ring-2 focus:outline-none',
            'disabled:cursor-not-allowed disabled:bg-neutral-100',
            error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-100',
            className
          )}
          {...props}
        />
        {error && <span className="text-danger-600 text-sm">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
