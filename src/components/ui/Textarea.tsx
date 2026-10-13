"use client";

import React, { forwardRef, useId } from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      showCount = false,
      maxLength,
      value,
      className = "",
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const currentLength = typeof value === "string" ? value.length : 0;

    return (
      <div className="w-full space-y-1.5 text-left font-body">
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={textareaId}
              className="block text-xs font-semibold text-neutral-dark font-display"
            >
              {label}
              {props.required && <span className="text-secondary ml-1">*</span>}
            </label>
          )}

          {showCount && maxLength && (
            <span className="text-[10px] text-neutral-muted">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>

        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          rows={props.rows || 4}
          className={`w-full p-3.5 text-xs rounded-xl bg-white border transition-all text-neutral-dark placeholder:text-neutral-muted focus:outline-none resize-y ${
            error
              ? "border-error focus:ring-2 focus:ring-error/20 focus:border-error"
              : "border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-servio-xs"
          } ${
            disabled ? "bg-slate-100 text-neutral-disabled cursor-not-allowed border-slate-200" : ""
          } ${className}`}
          {...props}
        />

        {error ? (
          <p className="text-[11px] text-error font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-neutral-slate">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
