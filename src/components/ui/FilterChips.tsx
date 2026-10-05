import React from "react";

export interface FilterChipOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  badgeVariant?: "default" | "match" | "excess" | "short" | "vat";
}

interface FilterChipsProps<T extends string = string> {
  options: FilterChipOption<T>[];
  selectedValue?: T;
  value?: T;
  onSelect?: (value: T) => void;
  onChange?: (value: T) => void;
  className?: string;
}

export function FilterChips<T extends string = string>({
  options,
  selectedValue,
  value,
  onSelect,
  onChange,
  className = "",
}: FilterChipsProps<T>) {
  const activeValue = selectedValue !== undefined ? selectedValue : value;
  const handleSelect = onSelect || onChange || (() => {});

  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 select-none ${className}`}>
      {options.map((opt) => {
        const isSelected = activeValue === opt.value;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className={`h-7 px-2.5 rounded-xs text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 border ${
              isSelected
                ? "bg-vat text-paper border-vat"
                : "bg-paper text-ink hover:bg-sheet border-rule"
            }`}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`font-mono text-[10px] px-1.5 py-0.2 rounded-xs font-bold ${
                  isSelected
                    ? "bg-paper/20 text-paper"
                    : opt.badgeVariant === "short"
                    ? "bg-short-bg text-short-fg font-bold"
                    : opt.badgeVariant === "match"
                    ? "bg-match-bg text-match-fg font-bold"
                    : "bg-sheet text-ink-soft"
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
