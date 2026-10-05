"use client";

import React, { useState } from "react";
import { Actor } from "@/lib/auth/session";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ShortcutHelpModal } from "./ShortcutHelpModal";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface AppShellProps {
  actor: Actor;
  children: React.ReactNode;
}

export function AppShell({ actor, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-chalk flex flex-row">
      {/* Desktop Sidebar (visible on lg+) */}
      <div className="hidden lg:block h-screen sticky top-0 shrink-0 z-20">
        <Sidebar
          actor={actor}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />
      </div>

      {/* Mobile Drawer (visible on < lg) */}
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent
          hideCloseButton
          className="p-0 w-72 max-w-[85vw] h-full fixed left-0 top-0 translate-x-0 translate-y-0 rounded-none border-r border-rule bg-paper z-50 overflow-hidden data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 duration-200"
        >
          <DialogTitle className="sr-only">Navigation Menu</DialogTitle>
          <DialogDescription className="sr-only">Main application sidebar</DialogDescription>
          <Sidebar
            actor={actor}
            onNavigate={() => setMobileMenuOpen(false)}
            onOpenShortcuts={() => {
              setMobileMenuOpen(false);
              setShortcutsOpen(true);
            }}
            className="border-r-0 w-full h-full"
          />
        </DialogContent>
      </Dialog>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TopBar */}
        <TopBar
          actor={actor}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />

        {/* Scrollable Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Shortcut Help Modal */}
      <ShortcutHelpModal
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </div>
  );
}
