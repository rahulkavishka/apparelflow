"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Rows, AlignJustify } from "lucide-react";

export type TableDensity = "compact" | "comfortable";

interface DensityToggleProps {
  density: TableDensity;
  onDensityChange?: (density: TableDensity) => void;
  onChange?: (density: TableDensity) => void;
  className?: string;
}

export function DensityToggle({
  density,
  onDensityChange,
  onChange,
  className = "",
}: DensityToggleProps) {
  const handleChange = onDensityChange || onChange || (() => {});

  return (
    <div
      className={`inline-flex items-center rounded-[2px] border border-rule bg-paper p-0.5 select-none ${className}`}
      role="group"
      aria-label="Table row density"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleChange("compact")}
        className={`h-6 px-2 text-[11px] font-bold rounded-[2px] flex items-center gap-1 ${
          density === "compact"
            ? "bg-sheet text-ink font-bold shadow-none"
            : "text-ink-soft hover:text-ink"
        }`}
        title="Compact (40px rows)"
        aria-pressed={density === "compact"}
      >
        <Rows className="w-3 h-3" />
        <span className="hidden sm:inline">Compact</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleChange("comfortable")}
        className={`h-6 px-2 text-[11px] font-bold rounded-[2px] flex items-center gap-1 ${
          density === "comfortable"
            ? "bg-sheet text-ink font-bold shadow-none"
            : "text-ink-soft hover:text-ink"
        }`}
        title="Comfortable (48px rows)"
        aria-pressed={density === "comfortable"}
      >
        <AlignJustify className="w-3 h-3" />
        <span className="hidden sm:inline">Comfortable</span>
      </Button>
    </div>
  );
}
