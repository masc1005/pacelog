import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'tactile' | 'primary' | 'sage' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'tactile',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'relative inline-flex items-center justify-center font-display font-bold tracking-wider uppercase transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B1117] disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-[2px] cursor-pointer active:scale-[0.98]';

    const variants = {
      // Stitch Signature Action Button (Orange Gradient with top highlight)
      tactile:
        'btn-tactile focus:ring-[#FF6B35]',
      // Stitch Sage Green Neon
      sage:
        'bg-[#D4F684] text-[#051424] hover:bg-[#B8D96B] shadow-[0_0_20px_rgba(212,246,132,0.3)] focus:ring-[#D4F684]',
      primary:
        'btn-tactile focus:ring-[#FF6B35]',
      secondary:
        'bg-[#161C24] text-[#D4E4FA] hover:bg-[#1C2B3C] border border-[#1F2937] hover:border-[#454839] focus:ring-[#D4F684]',
      outline:
        'bg-transparent text-[#D4E4FA] hover:bg-[#161C24] border border-[#1F2937] hover:border-[#D4F684]/50 focus:ring-[#D4F684]',
      ghost:
        'bg-transparent text-[#C5C8B4] hover:text-white hover:bg-[#161C24] focus:ring-gray-400',
      danger:
        'bg-[#FFB4AB] text-[#690005] hover:bg-[#FF8577] shadow-[0_0_20px_rgba(255,180,171,0.3)] focus:ring-[#FFB4AB]',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8 font-mono',
      md: 'text-xs px-4 py-2.5 gap-2 h-10',
      lg: 'text-sm px-6 py-3.5 gap-2.5 h-12',
      icon: 'p-2 h-10 w-10 justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span className="font-mono text-xs">processando...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
