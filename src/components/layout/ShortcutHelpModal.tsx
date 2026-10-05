"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ShortcutHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUT_SECTIONS = [
  {
    title: "Global navigation",
    shortcuts: [
      { key: "Ctrl + K", desc: "Open global command palette & search" },
      { key: "?", desc: "Open keyboard shortcut cheatsheet" },
      { key: "Esc", desc: "Close open modal, drawer or palette" },
    ],
  },
  {
    title: "Table & list navigation",
    shortcuts: [
      { key: "/", desc: "Focus table search input" },
      { key: "[ / ]", desc: "Previous / Next page" },
      { key: "↑ / ↓", desc: "Navigate rows" },
      { key: "Space", desc: "Select / deselect row checkbox" },
      { key: "Enter", desc: "Open selected order in detail view" },
    ],
  },
  {
    title: "Verification terminal",
    shortcuts: [
      { key: "Enter / ↓", desc: "Confirm current count and focus next component" },
      { key: "Shift + Enter / ↑", desc: "Focus previous component count" },
      { key: "Ctrl + Enter", desc: "Trigger batch approval (when gate is open)" },
    ],
  },
];

export function ShortcutHelpModal({ open, onOpenChange }: ShortcutHelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] p-5 shadow-xl rounded-[4px] border border-rule">
        <DialogHeader className="border-b border-rule pb-2.5">
          <DialogTitle className="text-lg font-bold text-ink">
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                {section.title}
              </h4>
              <div className="divide-y divide-rule border border-rule rounded-[2px] bg-paper">
                {section.shortcuts.map((s) => (
                  <div key={s.key} className="px-3 py-2 flex items-center justify-between text-xs">
                    <span className="text-ink font-medium">{s.desc}</span>
                    <kbd className="font-mono text-[11px] font-bold text-ink bg-sheet border border-rule px-1.5 py-0.5 rounded-[2px]">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
