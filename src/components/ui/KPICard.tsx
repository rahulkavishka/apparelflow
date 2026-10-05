import React from "react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  subtext?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "default" | "match" | "excess" | "short" | "vat" | "positive";
  className?: string;
}

export function KPICard({
  title,
  label,
  value,
  subtitle,
  subtext,
  badge,
  icon,
  variant = "default",
  className,
}: KPICardProps) {
  const displayTitle = title || label || "";
  const displaySubtext = subtitle || subtext;

  const variantStyles: Record<string, string> = {
    default: "bg-paper border-rule text-ink",
    match: "bg-match-bg/40 border-match-edge/60 text-match-fg",
    positive: "bg-match-bg/40 border-match-edge/60 text-match-fg",
    excess: "bg-excess-bg/40 border-excess-edge/60 text-excess-fg",
    short: "bg-short-bg/40 border-short-edge/60 text-short-fg",
    vat: "bg-vat-tint/20 border-vat/40 text-vat",
  };

  return (
    <div
      className={cn(
        "rounded-xs border p-3.5 space-y-1 transition-all bg-paper shadow-none select-none",
        variantStyles[variant] || variantStyles.default,
        className
      )}
    >
      <div className="flex items-center justify-between text-xs font-bold text-ink-soft">
        <span className="uppercase tracking-wider text-[10px]">{displayTitle}</span>
        {icon && <span className="text-ink-soft">{icon}</span>}
      </div>

      <div className="flex items-baseline justify-between gap-2 pt-0.5">
        <span className="font-display text-2xl font-bold tabular-nums text-ink tracking-tight">
          {value}
        </span>
        {badge}
      </div>

      {displaySubtext && (
        <p className="text-[11px] text-ink-soft leading-tight truncate">
          {displaySubtext}
        </p>
      )}
    </div>
  );
}
