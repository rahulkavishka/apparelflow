"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface RecipeOption {
  id: string;
  recipeCode: string;
  name: string;
  category?: string;
  stdFabricYards?: number;
  wastageCap?: number;
}

interface RecipeComboboxProps {
  recipes: RecipeOption[];
  value: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function RecipeCombobox({
  recipes,
  value,
  onChange,
  allowAll = false,
  allLabel = "All recipes",
  placeholder = "Select a garment recipe...",
  className = "",
  disabled = false,
  id,
}: RecipeComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  const selectedRecipe = recipes.find((r) => r.id === value);
  const isAllSelected = allowAll && (value === "ALL" || !value);

  // Filter recipes based on search
  const filteredRecipes = recipes.filter((r) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.recipeCode.toLowerCase().includes(q) ||
      (r.category && r.category.toLowerCase().includes(q))
    );
  });

  const handleSelect = (recipeId: string) => {
    onChange(recipeId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(allowAll ? "ALL" : "");
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full h-9 px-3 py-1.5 rounded-[3px] border text-left flex items-center justify-between gap-2 text-xs font-medium transition-all bg-paper cursor-pointer select-none ${
          disabled ? "opacity-50 cursor-not-allowed bg-disabled-bg" : "hover:border-ink-soft/60 focus:outline-none focus:ring-1 focus:ring-vat"
        } ${isOpen ? "border-vat ring-1 ring-vat" : "border-rule"}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate text-ink flex items-center gap-1.5 flex-1">
          {isAllSelected ? (
            <span className="font-semibold text-ink">{allLabel}</span>
          ) : selectedRecipe ? (
            <>
              <span className="font-bold text-ink">{selectedRecipe.name}</span>
              <span className="text-[11px] font-mono text-ink-soft">({selectedRecipe.recipeCode})</span>
            </>
          ) : (
            <span className="text-ink-faint">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {!isAllSelected && selectedRecipe && !disabled && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-sheet text-ink-soft hover:text-ink cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-ink-soft transition-transform duration-150 ${isOpen ? "rotate-180 text-vat" : ""}`} />
        </div>
      </button>

      {/* Dropdown Popover with Crisp High-Contrast Elevation */}
      {isOpen && (
        <div className="absolute left-0 right-0 sm:right-auto top-full mt-1.5 w-full sm:w-auto sm:min-w-[300px] max-w-[calc(100vw-32px)] bg-paper rounded-[6px] border border-ink/20 shadow-[0_16px_40px_rgba(15,23,42,0.24),_0_2px_8px_rgba(15,23,42,0.1)] ring-1 ring-black/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box inside dropdown with distinct header styling */}
          <div className="p-2.5 border-b border-rule bg-sheet flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-ink-soft shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name, code or category..."
              className="w-full bg-transparent text-xs text-ink placeholder:text-ink-soft/70 outline-none border-none shadow-none focus:outline-none focus:ring-0 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-ink-soft hover:text-ink p-0.5 rounded cursor-pointer"
                aria-label="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Scrollable list with max-height and distinct separator */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-rule/50 bg-paper" role="listbox">
            {allowAll && !searchTerm && (
              <button
                type="button"
                onClick={() => handleSelect("ALL")}
                className={`w-full text-left px-2.5 py-2 rounded-[3px] text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isAllSelected ? "bg-vat text-paper font-bold" : "text-ink hover:bg-sheet"
                }`}
                role="option"
                aria-selected={isAllSelected}
              >
                <span>{allLabel}</span>
                {isAllSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {filteredRecipes.map((r) => {
              const isSelected = value === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelect(r.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-[2px] text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-vat text-paper font-bold"
                      : "text-ink hover:bg-sheet"
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="font-bold truncate flex items-center gap-1.5">
                      <span>{r.name}</span>
                      <span className={`text-[10px] font-mono px-1 py-0.2 rounded border ${
                        isSelected ? "bg-paper/20 border-paper/30 text-paper" : "bg-sheet border-rule text-ink-soft"
                      }`}>
                        {r.recipeCode}
                      </span>
                    </div>
                    {r.category && (
                      <span className={`text-[11px] truncate ${isSelected ? "text-paper/80" : "text-ink-soft"}`}>
                        {r.category} {r.stdFabricYards ? `· ${r.stdFabricYards.toFixed(2)} yds` : ""}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}

            {filteredRecipes.length === 0 && (
              <div className="p-4 text-center text-xs text-ink-soft">
                No recipes matching &quot;{searchTerm}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
