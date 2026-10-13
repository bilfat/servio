"use client";

import React, { forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { CircleNotch } from "@phosphor-icons/react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "gradient"
  | "outline"
  | "ghost"
  | "soft"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark shadow-servio-xs active:bg-primary-dark",
  secondary:
    "bg-secondary text-white hover:bg-secondary-dark shadow-servio-xs active:bg-secondary-dark",
  gradient:
    "brand-gradient-hover text-white shadow-servio-sm font-semibold",
  outline:
    "border border-slate-300 bg-white text-neutral-dark hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100",
  ghost:
    "bg-transparent text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70 active:bg-slate-200/60",
  soft:
    "bg-sky text-primary hover:bg-sky/80 active:bg-sky-200/80 font-semibold",
  danger:
    "bg-error text-white hover:bg-red-600 shadow-servio-xs active:bg-red-700",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5 min-h-[36px]",
  md: "px-4 py-2 text-xs font-semibold rounded-xl gap-2 min-h-[44px]",
  lg: "px-6 py-3 text-sm font-semibold rounded-xl gap-2.5 min-h-[50px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center font-display transition-colors select-none focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${
          isDisabled ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer"
        } ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <CircleNotch size={18} weight="bold" className="animate-spin text-current" />
            <span>Memproses...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children && <span>{children}</span>}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
