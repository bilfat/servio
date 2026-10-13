import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-1/3 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4 rounded-md" />
      <Skeleton className="h-4 w-1/2 rounded-md" />
      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
        <Skeleton className="h-5 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center justify-between py-3.5 px-4 border-b border-slate-100 animate-pulse">
      <Skeleton className="h-4 w-28 rounded" />
      <Skeleton className="h-4 w-40 rounded" />
      <Skeleton className="h-4 w-20 rounded" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}
