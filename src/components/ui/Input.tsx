"use client";

import React, { forwardRef, useId } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      className = "",
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5 text-left font-body">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-neutral-dark font-display"
          >
            {label}
            {props.required && <span className="text-secondary ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-muted">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full py-2.5 text-xs rounded-xl bg-white border transition-all text-neutral-dark placeholder:text-neutral-muted focus:outline-none min-h-[44px] ${
              leftIcon ? "pl-10" : "pl-3.5"
            } ${rightIcon ? "pr-10" : "pr-3.5"} ${
              error
                ? "border-error focus:ring-2 focus:ring-error/20 focus:border-error"
                : "border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-servio-xs"
            } ${
              disabled ? "bg-slate-100 text-neutral-disabled cursor-not-allowed border-slate-200" : ""
            } ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-muted">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-[11px] text-error font-medium flex items-center gap-1">
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-neutral-slate">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
