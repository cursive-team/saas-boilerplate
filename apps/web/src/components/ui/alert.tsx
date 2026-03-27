import { forwardRef, type HTMLAttributes } from 'react';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'warning' | 'info';
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'info', children, ...props }, ref) => {
    const baseStyles = 'rounded-lg p-3 text-sm';

    const variants = {
      success: 'bg-green-50 text-green-600',
      error: 'bg-red-50 text-red-600',
      warning: 'bg-yellow-50 text-yellow-600',
      info: 'bg-blue-50 text-blue-600',
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={`${baseStyles} ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
