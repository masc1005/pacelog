import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      leftIcon,
      isPassword = false,
      type = 'text',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left font-sans">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-mono font-medium tracking-wider uppercase text-gray-400 select-none flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center justify-center text-gray-500 pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            disabled={disabled}
            className={twMerge(
              clsx(
                'w-full bg-[#11141B] text-white placeholder-gray-600 rounded-lg px-3.5 py-2.5 text-sm font-sans transition-all duration-200 border border-[#232834]',
                'focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] focus:bg-[#141822]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                leftIcon && 'pl-10',
                isPassword && 'pr-10',
                error && 'border-[#FF3366] focus:border-[#FF3366] focus:ring-[#FF3366]',
                className
              )
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 p-1 text-gray-500 hover:text-gray-300 focus:outline-none transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs font-sans text-[#FF3366] flex items-center gap-1 animate-fadeIn">
            <span>•</span> {error}
          </p>
        )}

        {!error && helperText && (
          <p className="text-xs font-mono text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
