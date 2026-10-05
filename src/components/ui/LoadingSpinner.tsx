import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg";
  label?: string;
  vertical?: boolean;
}

export function LoadingSpinner({
  size = "md",
  label,
  vertical = true,
  className,
  ...props
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: "w-3.5 h-3.5",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  return (
    <div
      role="status"
      aria-label={label || "Loading..."}
      className={cn(
        "flex items-center justify-center text-ink-soft",
        vertical ? "flex-col gap-2" : "flex-row gap-2",
        className
      )}
      {...props}
    >
      <Loader2 className={cn("animate-spin text-vat shrink-0", sizeClasses[size])} />
      {label && <span className="text-xs font-medium text-ink-soft">{label}</span>}
      <span className="sr-only">{label || "Loading..."}</span>
    </div>
  );
}

export function TableLoadingRow({
  colSpan,
  label = "Loading data...",
  className,
}: {
  colSpan: number;
  label?: string;
  className?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn("py-12 px-4 text-center", className)}>
        <LoadingSpinner size="md" label={label} />
      </td>
    </tr>
  );
}
