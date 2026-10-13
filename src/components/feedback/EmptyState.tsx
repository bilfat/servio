import React from "react";
import Link from "next/link";
import { FolderOpen, IconProps } from "@phosphor-icons/react";

export interface EmptyStateActionConfig {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon?: React.ComponentType<IconProps>;
  title: string;
  description: string;
  action?: React.ReactNode | EmptyStateActionConfig;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
}: EmptyStateProps) {
  const renderAction = () => {
    if (!action) return null;
    if (React.isValidElement(action)) return action;
    if (typeof action === "object" && "label" in action) {
      const config = action as EmptyStateActionConfig;
      if (config.href) {
        return (
          <Link
            href={config.href}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-colors inline-block"
          >
            {config.label}
          </Link>
        );
      }
      return (
        <button
          type="button"
          onClick={config.onClick}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-colors inline-block"
        >
          {config.label}
        </button>
      );
    }
    return action as React.ReactNode;
  };

  return (
    <div className="glass-card rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto flex flex-col items-center justify-center space-y-4 border border-slate-200/80 my-6">
      <div className="w-16 h-16 rounded-2xl bg-sky/60 text-primary flex items-center justify-center border border-sky-200">
        <Icon size={32} weight="duotone" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-display font-bold text-neutral-dark">
          {title}
        </h3>
        <p className="text-xs text-neutral-slate leading-relaxed max-w-sm">
          {description}
        </p>
      </div>
      {action && <div className="pt-2">{renderAction()}</div>}
    </div>
  );
}
