import React from "react";
import { cn } from "@/lib/utils";

/** Keyboard hint chip. 14px minimum per DESIGN §5.1; ink-soft on sheet passes AA. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-xs border border-rule bg-sheet px-1.5 text-sm font-bold leading-none text-ink-soft",
        className
      )}
    >
      {children}
    </kbd>
  );
}
