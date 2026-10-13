"use client";

import React, { forwardRef, useId } from "react";
import { CaretDown } from "@phosphor-icons/react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      options = [],
      placeholder,
      className = "",
      id,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full space-y-1.5 text-left font-body">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-neutral-dark font-display"
          >
            {label}
            {props.required && <span className="text-secondary ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={`w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl bg-white border transition-all text-neutral-dark focus:outline-none appearance-none cursor-pointer min-h-[44px] ${
              error
                ? "border-error focus:ring-2 focus:ring-error/20 focus:border-error"
                : "border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-servio-xs"
            } ${
              disabled ? "bg-slate-100 text-neutral-disabled cursor-not-allowed border-slate-200" : ""
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.length > 0
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-neutral-muted">
            <CaretDown size={14} weight="bold" />
          </div>
        </div>

        {error ? (
          <p className="text-[11px] text-error font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-neutral-slate">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
