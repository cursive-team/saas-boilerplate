// Stateless, reusable UI primitives
// All components use Tailwind CSS with the shared config (tailwind.config.ts)
// Changing primary colors in the config will update all components

export { Alert, type AlertProps } from './alert';
export { Avatar, type AvatarProps } from './avatar';
export { Button, type ButtonProps } from './button';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  type CardProps,
  type CardHeaderProps,
  type CardTitleProps,
  type CardDescriptionProps,
  type CardContentProps,
} from './card';
export { Input, type InputProps } from './input';
export { Label, type LabelProps } from './label';
export { Spinner, type SpinnerProps } from './spinner';
export { ToastProvider, useToast } from './toast';
