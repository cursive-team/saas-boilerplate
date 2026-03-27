import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error = false, ...props }, ref) => {
    const baseStyles =
      'block w-full rounded-lg border px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-colors';

    const stateStyles = error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500';

    return <input ref={ref} className={`${baseStyles} ${stateStyles} ${className}`} {...props} />;
  }
);

Input.displayName = 'Input';
