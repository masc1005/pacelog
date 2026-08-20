import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: 'cyan' | 'green' | 'amber' | 'crimson' | 'purple' | 'none';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  glow = 'none',
  interactive = false,
  children,
  ...props
}) => {
  const glows = {
    none: 'border-[#1E232E]',
    cyan: 'border-[#00F0FF]/30 shadow-[0_0_20px_rgba(0,240,255,0.08)]',
    green: 'border-[#39FF14]/30 shadow-[0_0_20px_rgba(57,255,20,0.08)]',
    amber: 'border-[#FFB800]/30 shadow-[0_0_20px_rgba(255,184,0,0.08)]',
    crimson: 'border-[#FF3366]/30 shadow-[0_0_20px_rgba(255,51,102,0.08)]',
    purple: 'border-[#7B2CBF]/30 shadow-[0_0_20px_rgba(123,44,191,0.08)]',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'bg-[#0E1117] rounded-xl border p-5 transition-all duration-200 text-white',
          glows[glow],
          interactive &&
            'hover:bg-[#141822] hover:border-[#2B3242] active:scale-[0.99] cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
