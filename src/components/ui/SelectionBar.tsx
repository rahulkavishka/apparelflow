"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface SelectionActionItem {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  icon?: React.ReactNode;
}

interface SelectionBarProps {
  selectedCount: number;
  totalCount?: number;
  onClearSelection: () => void;
  onSelectAllMatching?: () => void;
  isAllMatchingSelected?: boolean;
  actions?: React.ReactNode | SelectionActionItem[];
  className?: string;
}

export function SelectionBar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAllMatching,
  isAllMatchingSelected,
  actions,
  className = "",
}: SelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-ink text-paper rounded-[4px] px-4 py-2.5 shadow-2xl flex items-center gap-4 border border-paper/10 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-150 select-none ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="bg-vat px-2 py-0.5 rounded-[2px] font-mono font-bold text-paper">
          {selectedCount}
        </span>
        <span>selected</span>

        {onSelectAllMatching && totalCount && totalCount > selectedCount && !isAllMatchingSelected && (
          <button
            type="button"
            onClick={onSelectAllMatching}
            className="text-vat-tint hover:underline ml-1 font-normal cursor-pointer"
          >
            Select all {totalCount} matching
          </button>
        )}
      </div>

      <div className="h-4 w-[1px] bg-paper/20"></div>

      {/* Bulk Action Buttons */}
      <div className="flex items-center gap-2">
        {Array.isArray(actions)
          ? actions.map((act) => (
              <Button
                key={act.label}
                variant={act.variant === "primary" ? "primary" : "secondary"}
                size="sm"
                onClick={act.onClick}
                className="h-7 px-2.5 text-xs font-bold flex items-center gap-1.5"
              >
                {act.icon}
                <span>{act.label}</span>
              </Button>
            ))
          : actions}

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-7 px-2 text-paper/70 hover:text-paper hover:bg-paper/10 text-xs rounded-[2px] flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" />
          <span>Clear</span>
        </Button>
      </div>
    </div>
  );
}
