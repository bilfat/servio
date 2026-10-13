"use client";

import React, { forwardRef } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  onClear?: () => void;
  sizeVariant?: "default" | "large";
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onClear,
      placeholder = "Cari jasa, provider, produk, atau ceritakan masalahmu...",
      sizeVariant = "default",
      className = "",
      ...props
    },
    ref
  ) => {
    const hasValue = Boolean(value && String(value).length > 0);

    return (
      <div className="relative w-full group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-muted group-focus-within:text-primary transition-colors">
          <MagnifyingGlass
            size={sizeVariant === "large" ? 20 : 18}
            weight="bold"
          />
        </div>

        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full rounded-full bg-white border border-slate-200 text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-servio-sm ${
            sizeVariant === "large"
              ? "pl-12 pr-12 py-3.5 text-sm min-h-[52px]"
              : "pl-11 pr-10 py-2.5 text-xs min-h-[44px]"
          } ${className}`}
          {...props}
        />

        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-muted hover:text-neutral-dark transition-colors"
            title="Bersihkan pencarian"
            aria-label="Bersihkan pencarian"
          >
            <div className="p-1 rounded-full bg-slate-100 hover:bg-slate-200">
              <X size={14} weight="bold" />
            </div>
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
