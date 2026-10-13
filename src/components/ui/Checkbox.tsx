"use client";

import React, { forwardRef, useId } from "react";
import { Check } from "@phosphor-icons/react";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className = "", id, checked, disabled, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    return (
      <div className="space-y-1 text-left font-body">
        <label
          htmlFor={checkboxId}
          className={`flex items-start gap-3 select-none ${
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          } ${className}`}
        >
          <div className="relative flex items-center justify-center shrink-0 mt-0.5">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              checked={checked}
              disabled={disabled}
              className="peer sr-only"
              {...props}
            />
            <div
              className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center ${
                checked
                  ? "bg-primary border-primary text-white shadow-servio-xs"
                  : "bg-white border-slate-300 peer-focus:border-primary peer-focus:ring-2 peer-focus:ring-primary/20"
              } ${error ? "border-error" : ""}`}
            >
              {checked && <Check size={12} weight="bold" />}
            </div>
          </div>

          {(label || description) && (
            <div className="text-xs">
              {label && (
                <span className="font-semibold text-neutral-dark font-display leading-tight block">
                  {label}
                </span>
              )}
              {description && (
                <span className="text-[11px] text-neutral-slate leading-relaxed block mt-0.5">
                  {description}
                </span>
              )}
            </div>
          )}
        </label>

        {error && <p className="text-[11px] text-error font-medium pl-8">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
