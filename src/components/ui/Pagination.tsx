"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total?: number;
  totalItems?: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = "results",
  className = "",
}: PaginationProps) {
  const actualTotal = total !== undefined ? total : (totalItems !== undefined ? totalItems : 0);
  const from = actualTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, actualTotal);

  // Keyboard shortcut listener for [ (prev) and ] (next)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "[" && page > 1) {
        e.preventDefault();
        onPageChange(page - 1);
      } else if (e.key === "]" && page < totalPages) {
        e.preventDefault();
        onPageChange(page + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [page, totalPages, onPageChange]);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-2.5 border-t border-rule bg-paper text-xs text-ink-soft select-none ${className}`}
    >
      {/* Left: Row Count Info & Page Size Selector */}
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="text-ink font-bold font-mono">{from}–{to}</strong> of{" "}
          <strong className="text-ink font-bold font-mono">{actualTotal}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-rule">
            <span>Rows:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-7 w-16 text-xs font-bold border-rule bg-sheet">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right: Navigation Controls */}
      <div className="flex items-center gap-1 self-end sm:self-auto">
        <span className="mr-2 text-xs font-medium">
          Page <strong className="text-ink font-bold font-mono">{page}</strong> of{" "}
          <strong className="text-ink font-bold font-mono">{Math.max(1, totalPages)}</strong>
        </span>

        {/* First Page */}
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          className="h-7 w-7 p-0 text-ink hover:bg-sheet rounded-[2px]"
          aria-label="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-7 px-2 text-xs font-bold border-rule bg-paper hover:bg-sheet rounded-[2px] flex items-center gap-1"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Prev</span>
        </Button>

        {/* Next Page */}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-7 px-2 text-xs font-bold border-rule bg-paper hover:bg-sheet rounded-[2px] flex items-center gap-1"
          aria-label="Next page"
        >
          <span className="hidden md:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        {/* Last Page */}
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="h-7 w-7 p-0 text-ink hover:bg-sheet rounded-[2px]"
          aria-label="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
