import type { LucideIcon } from 'lucide-react';
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'warning';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children?: React.ReactNode;
  onClick: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  fullWidth = false,
  className = '',
  disabled = false,
}) => {
  const baseClasses =
    'flex items-center justify-center font-medium shadow-lg transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none cursor-pointer';

  const sizeClasses = {
    sm: 'gap-1 px-2 py-2 text-xs rounded-md',
    md: 'gap-2 px-4 py-2 text-sm rounded-md',
    lg: 'gap-3 px-8 py-4 text-lg rounded-xl',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 focus:ring-blue-400/50',
    secondary:
      'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-100 hover:from-gray-500 hover:to-gray-600 focus:ring-gray-400/50',
    warning:
      'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-500 hover:to-red-500 focus:ring-orange-400/50',
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';

  const buttonClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabled ? disabledClasses : ''} ${className} ${fullWidth ? 'w-full' : ''}`;

  return (
    <button onClick={onClick} className={buttonClasses} disabled={disabled}>
      {Icon && (
        <Icon className={`${iconSizeClasses[size]} transition-transform`} />
      )}
      {children && <span>{children}</span>}
    </button>
  );
};
