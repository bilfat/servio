"use client";

import React, { useRef, useState } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

export type CardVariant = "base" | "elevated" | "glass" | "spotlight";

export interface CardProps extends HTMLMotionProps<"div"> {
  variant?: CardVariant;
  interactive?: boolean;
  spotlightColor?: string;
  children: React.ReactNode;
}

export function Card({
  variant = "base",
  interactive = false,
  spotlightColor = "rgba(15, 76, 129, 0.08)",
  children,
  className = "",
  ...props
}: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (variant !== "spotlight" || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "elevated":
        return "bg-white border border-slate-200/80 shadow-servio-md";
      case "glass":
        return "glass-card border border-white/80";
      case "spotlight":
        return "relative bg-white border border-slate-200 shadow-servio-xs overflow-hidden";
      case "base":
      default:
        return "bg-white border border-slate-200 shadow-servio-xs";
    }
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={interactive ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl p-5 sm:p-6 transition-shadow ${getVariantStyles()} ${
        interactive ? "cursor-pointer hover:shadow-servio-md hover:border-slate-300" : ""
      } ${className}`}
      {...props}
    >
      {/* Spotlight Radial Hover Gradient */}
      {variant === "spotlight" && isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightColor}, transparent 70%)`,
          }}
        />
      )}

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
