import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'watch' | 'module' | 'simple';
  glow?: 'sage' | 'orange' | 'blue' | 'none';
  interactive?: boolean;
  cornerTagTopLeft?: string;
  cornerTagBottomRight?: string;
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'watch',
  glow = 'none',
  interactive = false,
  cornerTagTopLeft,
  cornerTagBottomRight,
  children,
  ...props
}) => {
  const glows = {
    none: 'border-[#1F2937]',
    sage: 'border-[#D4F684]/40 shadow-[0_0_20px_rgba(212,246,132,0.08)]',
    orange: 'border-[#FF6B35]/40 shadow-[0_0_20px_rgba(255,107,53,0.08)]',
    blue: 'border-[#5CA9E6]/40 shadow-[0_0_20px_rgba(92,169,230,0.08)]',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'relative text-[#D4E4FA] p-5 rounded-[2px] transition-all duration-200',
          variant === 'watch' && 'watch-module bg-[#161C24]',
          variant === 'module' && 'module-border bg-[#161C24]',
          variant === 'simple' && 'bg-[#161C24] border border-[#1F2937]',
          glows[glow],
          interactive &&
            'hover:bg-[#1C2B3C] hover:border-[#454839] active:scale-[0.99] cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {cornerTagTopLeft && (
        <div className="absolute -top-2 left-4 px-1.5 bg-[#161C24] font-mono text-[10px] text-[#8F9380] tracking-wider uppercase select-none z-10 border-x border-[#1F2937]">
          {cornerTagTopLeft}
        </div>
      )}

      {children}

      {cornerTagBottomRight && (
        <div className="absolute -bottom-2 right-4 px-1.5 bg-[#161C24] font-mono text-[10px] text-[#D4F684] tracking-wider uppercase select-none z-10 border-x border-[#1F2937]">
          {cornerTagBottomRight}
        </div>
      )}
    </div>
  );
};
