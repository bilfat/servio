"use client";

import React from "react";
import { X } from "@phosphor-icons/react";

export interface ChipProps {
  label: string;
  count?: number | string;
  isSelected?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Chip({
  label,
  count,
  isSelected = false,
  onToggle,
  onRemove,
  icon,
  disabled = false,
  className = "",
}: ChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all select-none border min-h-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
        isSelected
          ? "bg-primary text-white border-primary shadow-servio-xs scale-[1.02]"
          : "bg-white text-neutral-slate border-slate-200 hover:border-slate-300 hover:text-neutral-dark hover:bg-slate-50"
      } ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>

      {count !== undefined && (
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            isSelected
              ? "bg-white/20 text-white"
              : "bg-slate-100 text-neutral-slate"
          }`}
        >
          {count}
        </span>
      )}

      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 transition-colors"
        >
          <X size={12} weight="bold" />
        </span>
      )}
    </button>
  );
}

export interface TagSelectorProps {
  tags: { id: string; label: string; count?: number }[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  multiple?: boolean;
  className?: string;
}

export function TagSelector({
  tags,
  selectedIds,
  onChange,
  multiple = true,
  className = "",
}: TagSelectorProps) {
  const handleToggle = (id: string) => {
    if (multiple) {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((item) => item !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    } else {
      onChange(selectedIds.includes(id) ? [] : [id]);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {tags.map((tag) => (
        <Chip
          key={tag.id}
          label={tag.label}
          count={tag.count}
          isSelected={selectedIds.includes(tag.id)}
          onToggle={() => handleToggle(tag.id)}
        />
      ))}
    </div>
  );
}
