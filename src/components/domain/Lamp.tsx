import React from "react";
import { ItemStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface LampProps {
  status: ItemStatus | null; // null represents uncounted
  variance?: number;
  className?: string;
}

export function Lamp({ status, variance, className }: LampProps) {
  if (status === "GREEN") {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="shrink-0">
          <circle cx="12" cy="12" r="11" fill="#2E7D4B" />
          <path
            d="M7 12.5l3.2 3.2L17 9"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="rounded-[2px] bg-match-bg px-2 py-0.5 text-sm font-bold text-match-fg">
          Match
        </span>
      </div>
    );
  }

  if (status === "YELLOW") {
    const varText = variance !== undefined && variance > 0 ? ` +${variance}` : "";
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="shrink-0">
          <circle cx="12" cy="12" r="11" fill="#A87A00" />
          <path
            d="M12 7v10M7 12h10"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
        <span className="rounded-[2px] bg-excess-bg px-2 py-0.5 text-sm font-bold text-excess-fg">
          Excess{varText}
        </span>
      </div>
    );
  }

  if (status === "RED") {
    const varText = variance !== undefined ? ` −${Math.abs(variance)}` : "";
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="shrink-0">
          <circle cx="12" cy="12" r="11" fill="#B8382D" />
          <path
            d="M7 12h10"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
        <span className="rounded-[2px] bg-short-bg px-2 py-0.5 text-sm font-bold text-short-fg">
          Short{varText}
        </span>
      </div>
    );
  }

  // Not counted
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="shrink-0">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="#7B8793"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
      </svg>
      <span className="rounded-[2px] bg-none-bg px-2 py-0.5 text-sm font-bold text-none-fg">
        Not counted
      </span>
    </div>
  );
}
