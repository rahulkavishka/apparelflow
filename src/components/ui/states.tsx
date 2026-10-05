import React from "react";
import { cn } from "@/lib/utils";

interface StateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Empty state: what is missing, what to do. Left aligned, no illustration (DESIGN §9.7). */
export function EmptyState({ title, description, action, className }: StateProps) {
  return (
    <div className={cn("px-4 py-10 space-y-2", className)}>
      <p className="text-base font-bold text-ink">{title}</p>
      {description && <p className="text-sm text-ink-soft max-w-[70ch]">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

/** Error state with a retry action. Announced politely to assistive tech. */
export function ErrorState({ title, description, action, className }: StateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "border-l-4 border-l-short-edge border border-rule bg-short-bg px-4 py-3 space-y-1",
        className
      )}
    >
      <p className="text-sm font-bold text-short-fg">{title}</p>
      {description && <p className="text-sm text-ink max-w-[70ch]">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
