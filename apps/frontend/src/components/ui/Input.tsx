import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  errorCode?: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
  variant?: 'precision' | 'boxed';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      errorCode,
      leftIcon,
      isPassword = false,
      variant = 'precision',
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
      <div className="w-full flex flex-col gap-1.5 text-left font-mono">
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              'text-[11px] font-mono font-medium uppercase tracking-wider select-none flex items-center justify-between',
              error ? 'text-[#FFB4AB]' : 'text-[#C5C8B4]'
            )}
          >
            <span>{label}</span>
            {error && errorCode && <span className="text-[#FFB4AB]">{errorCode}</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div
              className={clsx(
                'absolute left-0 bottom-2.5 flex items-center justify-center pointer-events-none',
                error ? 'text-[#FFB4AB]' : 'text-[#8F9380]'
              )}
            >
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
                variant === 'precision'
                  ? 'input-precision w-full pb-2 text-sm text-[#D4E4FA] placeholder-[#4D5767]'
                  : 'w-full bg-[#161C24] text-[#D4E4FA] placeholder-[#4D5767] rounded-[2px] px-3.5 py-2.5 text-sm border border-[#1F2937] focus:outline-none focus:border-[#D4F684]',
                leftIcon && (variant === 'precision' ? 'pl-6' : 'pl-10'),
                isPassword && 'pr-8',
                error && 'error border-b-[#FFB4AB]',
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
              className="absolute right-0 bottom-2.5 p-1 text-[#8F9380] hover:text-[#D4F684] focus:outline-none transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>

        {error && (
          <p className="text-[11px] font-mono text-[#FFB4AB] flex items-center gap-1 mt-0.5">
            <span>•</span> {error}
          </p>
        )}

        {!error && helperText && (
          <p className="text-[11px] font-mono text-[#8F9380] mt-0.5">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
