"use client";

import React, { useState } from "react";
import { Actor } from "@/lib/auth/session";
import { Breadcrumbs } from "./Breadcrumbs";
import { CommandPalette } from "./CommandPalette";
import { Button } from "@/components/ui/button";
import { Search, Menu, RefreshCw, HelpCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TopBarProps {
  actor: Actor;
  onOpenMobileMenu?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  onOpenShortcuts?: () => void;
}

export function TopBar({
  actor,
  onOpenMobileMenu,
  onOpenShortcuts,
}: TopBarProps) {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Listen for global Ctrl+K / Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        onOpenShortcuts?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenShortcuts]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries();
      toast.success("Data refreshed.");
    } catch {
      toast.error("Failed to refresh data.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <>
      <header className="h-12 border-b border-rule bg-paper px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 shrink-0 z-10 select-none">
        {/* Left: Mobile Drawer Hamburger & Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenMobileMenu}
            className="lg:hidden h-8 w-8 p-0 text-ink-soft hover:text-ink cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </Button>

          <Breadcrumbs />
        </div>

        {/* Center/Right: Command Palette Trigger, Shortcuts & Manual Refresh */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Search Button (Ctrl+K) */}
          <button
            type="button"
            onClick={() => setIsPaletteOpen(true)}
            className="h-8 w-8 sm:w-auto px-0 sm:px-2.5 text-xs text-ink-soft hover:text-ink border border-rule bg-sheet/40 hover:bg-sheet flex items-center justify-center gap-2 rounded-[3px] cursor-pointer transition-colors"
            title="Search (Ctrl+K)"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-block text-[10px] font-mono text-ink-soft bg-paper border border-rule px-1.5 py-0.2 rounded-[2px]">
              Ctrl K
            </kbd>
          </button>

          {/* Keyboard Shortcuts Button */}
          {onOpenShortcuts && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenShortcuts}
              className="h-8 w-8 sm:w-auto px-0 sm:px-2 text-xs text-ink-soft hover:text-ink border-rule bg-paper hover:bg-sheet rounded-[3px] flex items-center justify-center gap-1.5 cursor-pointer"
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Shortcuts</span>
              <kbd className="hidden md:inline-block text-[10px] font-mono text-ink-soft bg-sheet border border-rule px-1 py-0.2 rounded-[2px]">
                ?
              </kbd>
            </Button>
          )}

          {/* Sync / Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 sm:w-auto px-0 sm:px-2.5 text-xs text-ink-soft hover:text-ink border-rule bg-paper hover:bg-sheet rounded-[3px] flex items-center justify-center gap-1.5 cursor-pointer"
            title="Refresh active views"
            aria-label="Refresh active views"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-vat" : ""}`} />
            <span className="hidden md:inline">Refresh</span>
          </Button>
        </div>
      </header>

      {/* Global Command Palette */}
      <CommandPalette
        open={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
        actor={actor}
      />
    </>
  );
}
