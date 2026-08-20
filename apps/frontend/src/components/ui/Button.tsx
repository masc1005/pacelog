import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glow';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
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
      'relative inline-flex items-center justify-center font-sans font-semibold tracking-wide uppercase transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#08090C] disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-lg cursor-pointer';

    const variants = {
      primary:
        'bg-[#00F0FF] text-black hover:bg-[#00F0FF]/90 focus:ring-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] active:scale-[0.98]',
      glow:
        'bg-[#39FF14] text-black hover:bg-[#39FF14]/90 focus:ring-[#39FF14] shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:shadow-[0_0_30px_rgba(57,255,20,0.5)] active:scale-[0.98]',
      secondary:
        'bg-[#1A1E26] text-white hover:bg-[#232834] border border-[#2B3242] focus:ring-[#00F0FF] active:scale-[0.98]',
      outline:
        'bg-transparent text-white hover:bg-[#1A1E26] border border-[#2B3242] hover:border-[#00F0FF]/50 focus:ring-[#00F0FF] active:scale-[0.98]',
      ghost:
        'bg-transparent text-gray-400 hover:text-white hover:bg-[#1A1E26] focus:ring-gray-400 active:scale-[0.98]',
      danger:
        'bg-[#FF3366] text-white hover:bg-[#FF3366]/90 focus:ring-[#FF3366] shadow-[0_0_20px_rgba(255,51,102,0.3)] active:scale-[0.98]',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
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
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processando...</span>
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
