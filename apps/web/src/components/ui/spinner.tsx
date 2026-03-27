import { type HTMLAttributes } from 'react';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ className = '', size = 'md', ...props }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
  };

  return (
    <div
      className={`animate-spin rounded-full border-primary-600 border-t-transparent ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
