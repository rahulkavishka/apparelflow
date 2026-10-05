"use client";

import React, { useEffect, useState } from "react";
import { formatDateTime, formatRelative } from "@/lib/format";

interface RelativeTimeProps {
  value: string | null | undefined;
  className?: string;
  fallback?: string;
  /** Show the absolute Asia/Colombo time instead of the relative label. */
  absolute?: boolean;
}

/**
 * "2 h 14 m ago" with the exact factory-time stamp in the tooltip.
 * Re-renders every 30 s so queue ages stay honest without a refetch.
 */
export function RelativeTime({ value, className, fallback = "—", absolute = false }: RelativeTimeProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (absolute) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [absolute]);

  if (!value) return <span className={className}>{fallback}</span>;

  const exact = formatDateTime(value);
  return (
    <time
      dateTime={value}
      title={exact}
      className={className}
      suppressHydrationWarning
    >
      {absolute ? exact : formatRelative(value, now)}
    </time>
  );
}
