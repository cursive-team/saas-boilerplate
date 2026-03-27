import { forwardRef, type ImgHTMLAttributes } from 'react';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className = '', src, fallback = '?', size = 'md', alt = 'Avatar', ...props }, ref) => {
    const sizes = {
      sm: 'h-8 w-8 text-sm',
      md: 'h-10 w-10 text-base',
      lg: 'h-16 w-16 text-xl',
      xl: 'h-24 w-24 text-3xl',
    };

    return (
      <div
        ref={ref}
        className={`relative overflow-hidden rounded-full bg-gray-100 ${sizes[size]} ${className}`}
      >
        {src ? (
          <img src={src} alt={alt} className="h-full w-full object-cover" {...props} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400 font-medium">
            {fallback.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
