import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'sage' | 'orange' | 'blue' | 'cyan' | 'green' | 'amber' | 'crimson' | 'purple' | 'neutral';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'sage',
  size = 'md',
  pulse = false,
  children,
  ...props
}) => {
  const variants = {
    sage: 'bg-[#D4F684]/15 text-[#D4F684] border-[#D4F684]/30',
    orange: 'bg-[#FF6B35]/15 text-[#FF6B35] border-[#FF6B35]/30',
    blue: 'bg-[#5CA9E6]/15 text-[#5CA9E6] border-[#5CA9E6]/30',
    cyan: 'bg-[#5CA9E6]/15 text-[#5CA9E6] border-[#5CA9E6]/30',
    green: 'bg-[#D4F684]/15 text-[#D4F684] border-[#D4F684]/30',
    amber: 'bg-[#FFB800]/15 text-[#FFB800] border-[#FFB800]/30',
    crimson: 'bg-[#FFB4AB]/15 text-[#FFB4AB] border-[#FFB4AB]/30',
    purple: 'bg-[#7B2CBF]/15 text-[#A855F7] border-[#7B2CBF]/30',
    neutral: 'bg-[#161C24] text-[#C5C8B4] border-[#1F2937]',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 font-mono font-medium tracking-widest',
    md: 'text-xs px-2.5 py-1 font-mono font-semibold tracking-wider',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 rounded-[2px] border uppercase select-none transition-colors font-mono',
          variants[variant],
          sizes[size],
          className
        )
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {children}
    </span>
  );
};
