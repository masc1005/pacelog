import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'cyan' | 'green' | 'amber' | 'crimson' | 'purple' | 'neutral';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'cyan',
  size = 'md',
  pulse = false,
  children,
  ...props
}) => {
  const variants = {
    cyan: 'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/30',
    green: 'bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/30',
    amber: 'bg-[#FFB800]/10 text-[#FFB800] border-[#FFB800]/30',
    crimson: 'bg-[#FF3366]/10 text-[#FF3366] border-[#FF3366]/30',
    purple: 'bg-[#7B2CBF]/10 text-[#A855F7] border-[#7B2CBF]/30',
    neutral: 'bg-[#1A1E26] text-gray-400 border-[#2B3242]',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 font-mono font-medium',
    md: 'text-xs px-2.5 py-1 font-mono font-semibold tracking-wider',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 rounded-full border uppercase select-none transition-colors',
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
