"use client";

import React from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { Textarea } from "@/components/ui/Textarea";

export type FieldType =
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "toggle"
  | "date";

export interface FieldSchema {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  options?: { value: string; label: string; description?: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface DynamicFieldRendererProps {
  fields: FieldSchema[];
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function DynamicFieldRenderer({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
}: DynamicFieldRendererProps) {
  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const value = values[field.id];
        const error = errors[field.id];

        switch (field.type) {
          case "text":
          case "number":
          case "date":
            return (
              <Input
                key={field.id}
                type={field.type}
                label={field.label}
                placeholder={field.placeholder}
                helperText={field.helperText}
                required={field.required}
                value={typeof value === "string" || typeof value === "number" ? value : ""}
                onChange={(e) =>
                  onChange(
                    field.id,
                    field.type === "number" ? Number(e.target.value) : e.target.value
                  )
                }
                error={error}
                disabled={disabled}
              />
            );

          case "textarea":
            return (
              <Textarea
                key={field.id}
                label={field.label}
                placeholder={field.placeholder}
                helperText={field.helperText}
                required={field.required}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(field.id, e.target.value)}
                error={error}
                disabled={disabled}
              />
            );

          case "select":
            return (
              <Select
                key={field.id}
                label={field.label}
                placeholder={field.placeholder || "Pilih salah satu"}
                helperText={field.helperText}
                required={field.required}
                options={field.options || []}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(field.id, e.target.value)}
                error={error}
                disabled={disabled}
              />
            );

          case "radio":
            return (
              <RadioGroup
                key={field.id}
                name={field.id}
                label={field.label}
                options={field.options || []}
                value={typeof value === "string" ? value : ""}
                onChange={(val) => onChange(field.id, val)}
                error={error}
                disabled={disabled}
              />
            );

          case "checkbox":
            return (
              <Checkbox
                key={field.id}
                label={field.label}
                description={field.helperText}
                checked={Boolean(value)}
                onChange={(e) => onChange(field.id, e.target.checked)}
                error={error}
                disabled={disabled}
              />
            );

          case "toggle":
            return (
              <ToggleSwitch
                key={field.id}
                label={field.label}
                description={field.helperText}
                checked={Boolean(value)}
                onChange={(val) => onChange(field.id, val)}
                disabled={disabled}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
