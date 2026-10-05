"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Actor } from "@/lib/auth/session";
import { toast } from "sonner";
import {
  Search,
  Scissors,
  CheckCircle2,
  Layers,
  BookOpen,
  History,
  UserCheck,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: Actor;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Navigation" | "Orders" | "Switch account" | "Actions";
  icon: React.ReactNode;
  onSelect: () => void;
}

export function CommandPalette({ open, onOpenChange, actor }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [orderResults, setOrderResults] = useState<Array<{ id: string; orderNo: string; status: string; fabricRollId: string }>>([]);
  const [isSearchingOrders, setIsSearchingOrders] = useState(false);

  // Search orders when query looks like an order or roll
  useEffect(() => {
    if (!query || query.length < 2) {
      setOrderResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOrders(true);
      try {
        if (actor.role === "cutting_supervisor") {
          const res = await fetch(`/api/orders?q=${encodeURIComponent(query)}&pageSize=5`);
          const json = await res.json();
          if (res.ok && json.data?.orders) {
            setOrderResults(
              json.data.orders.map((o: any) => ({
                id: o.id,
                orderNo: o.orderNo,
                status: o.status,
                fabricRollId: o.fabricRollId,
              }))
            );
          }
        } else if (actor.role === "cutting_verifier") {
          const res = await fetch(`/api/verification/queue?q=${encodeURIComponent(query)}&pageSize=5`);
          const json = await res.json();
          if (res.ok && json.data?.queue) {
            setOrderResults(
              json.data.queue.map((o: any) => ({
                id: o.id,
                orderNo: o.orderNo,
                status: o.status,
                fabricRollId: o.fabricRollId,
              }))
            );
          }
        } else if (actor.role === "sewing_supervisor") {
          const res = await fetch(`/api/sewing/queue?q=${encodeURIComponent(query)}&pageSize=5`);
          const json = await res.json();
          if (res.ok && json.data?.orders) {
            setOrderResults(
              json.data.orders.map((o: any) => ({
                id: o.id,
                orderNo: o.orderNo,
                status: o.status,
                fabricRollId: o.fabricRollId,
              }))
            );
          }
        }
      } catch {
        // Silently catch search errors in palette
      } finally {
        setIsSearchingOrders(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, actor.role]);

  const handleRoleSwitch = async (targetRole: string, email: string, pass: string, path: string) => {
    onOpenChange(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      if (!res.ok) throw new Error("Failed to switch role");
      toast.success(`Switched role to ${targetRole}`);
      router.push(path);
      router.refresh();
    } catch {
      toast.error("Failed to switch role");
    }
  };

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  // Build command list
  const baseCommands: CommandItem[] = [];

  // Role Navigation items
  if (actor.role === "cutting_supervisor") {
    baseCommands.push(
      {
        id: "nav-orders",
        title: "Go to Cutting orders",
        subtitle: "View all cutting batches, drafts, and rejected items",
        category: "Navigation",
        icon: <Scissors className="w-4 h-4 text-vat" />,
        onSelect: () => handleNavigate("/supervisor/orders"),
      },
      {
        id: "nav-recipes",
        title: "Go to Recipes",
        subtitle: "Garment specifications, fabric multipliers, and components",
        category: "Navigation",
        icon: <BookOpen className="w-4 h-4 text-vat" />,
        onSelect: () => handleNavigate("/supervisor/recipes"),
      }
    );
  } else if (actor.role === "cutting_verifier") {
    baseCommands.push(
      {
        id: "nav-queue",
        title: "Go to Verification queue",
        subtitle: "Awaiting physical component count verification",
        category: "Navigation",
        icon: <CheckCircle2 className="w-4 h-4 text-vat" />,
        onSelect: () => handleNavigate("/verifier/queue"),
      },
      {
        id: "nav-history",
        title: "Go to Verification history",
        subtitle: "Audit log of approved and rejected batches",
        category: "Navigation",
        icon: <History className="w-4 h-4 text-vat" />,
        onSelect: () => handleNavigate("/verifier/history"),
      },
      {
        id: "nav-recipes",
        title: "Go to Recipes",
        subtitle: "Recipe specifications reference for verifiers",
        category: "Navigation",
        icon: <BookOpen className="w-4 h-4 text-vat" />,
        onSelect: () => handleNavigate("/verifier/recipes"),
      }
    );
  } else if (actor.role === "sewing_supervisor") {
    baseCommands.push({
      id: "nav-sewing",
      title: "Go to Sewing queue",
      subtitle: "Verified batches released for line assembly",
      category: "Navigation",
      icon: <Layers className="w-4 h-4 text-vat" />,
      onSelect: () => handleNavigate("/sewing/queue"),
    });
  }

  // Switch Account items
  if (actor.role !== "cutting_supervisor") {
    baseCommands.push({
      id: "switch-supervisor",
      title: "Switch to Cutting supervisor (Nimali)",
      subtitle: "supervisor@apparelflow.demo",
      category: "Switch account",
      icon: <UserCheck className="w-4 h-4 text-ink-soft" />,
      onSelect: () =>
        handleRoleSwitch(
          "Cutting supervisor",
          "supervisor@apparelflow.demo",
          "Supervisor@123",
          "/supervisor/orders"
        ),
    });
  }
  if (actor.role !== "cutting_verifier") {
    baseCommands.push({
      id: "switch-verifier",
      title: "Switch to Cutting verifier (Kasun)",
      subtitle: "verifier@apparelflow.demo",
      category: "Switch account",
      icon: <UserCheck className="w-4 h-4 text-ink-soft" />,
      onSelect: () =>
        handleRoleSwitch(
          "Cutting verifier",
          "verifier@apparelflow.demo",
          "Verifier@123",
          "/verifier/queue"
        ),
    });
  }
  if (actor.role !== "sewing_supervisor") {
    baseCommands.push({
      id: "switch-sewing",
      title: "Switch to Sewing supervisor (Dilani)",
      subtitle: "sewing@apparelflow.demo",
      category: "Switch account",
      icon: <UserCheck className="w-4 h-4 text-ink-soft" />,
      onSelect: () =>
        handleRoleSwitch(
          "Sewing supervisor",
          "sewing@apparelflow.demo",
          "Sewing@123",
          "/sewing/queue"
        ),
    });
  }

  // Filter commands by query
  const filteredCommands = query
    ? baseCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(query.toLowerCase()))
    )
    : baseCommands;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-[560px] p-0 overflow-hidden shadow-2xl rounded-[4px] border border-rule gap-0"
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">
          Quick search across orders, pages, and accounts
        </DialogDescription>

        {/* Seamless Search Bar */}
        <div className="flex items-center px-3.5 border-b border-rule bg-paper">
          {isSearchingOrders ? (
            <Loader2 className="w-4 h-4 text-vat animate-spin shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-ink-soft shrink-0" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, order number, or search..."
            style={{ outline: "none", border: "none", boxShadow: "none" }}
            className="w-full h-12 bg-transparent px-2.5 text-xs text-ink placeholder:text-ink-faint border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none shadow-none font-sans"
            autoFocus
          />
          <div className="flex items-center gap-1.5 shrink-0 pl-1">

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 flex items-center justify-center rounded-[2px] text-ink-soft hover:text-ink hover:bg-sheet transition-colors cursor-pointer"
              aria-label="Close command palette"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2 divide-y divide-rule/60">
          {/* Order Search Results */}
          {orderResults.length > 0 && (
            <div className="py-2 first:pt-1">
              <div className="px-2 pb-1.5 text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Matching Orders
              </div>
              {orderResults.map((o) => {
                const targetPath =
                  actor.role === "cutting_supervisor"
                    ? `/supervisor/orders/${o.id}`
                    : actor.role === "cutting_verifier"
                      ? `/verifier/orders/${o.id}`
                      : `/sewing/orders/${o.id}`;

                return (
                  <button
                    key={o.id}
                    onClick={() => handleNavigate(targetPath)}
                    className="w-full text-left px-2.5 py-2 rounded-[2px] hover:bg-sheet flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-ink group-hover:text-vat">
                        {o.orderNo}
                      </div>
                      <div className="text-[11px] text-ink-soft">
                        Roll: {o.fabricRollId} · Status: {o.status}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-soft group-hover:text-vat opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Regular Commands */}
          {filteredCommands.length > 0 && (
            <div className="py-2 first:pt-1 space-y-1">
              <div className="px-2 pb-1 text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Quick Actions
              </div>
              {filteredCommands.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onSelect}
                  className="w-full text-left px-2.5 py-2 rounded-[2px] hover:bg-sheet flex items-center gap-3 group transition-colors cursor-pointer"
                >
                  <div className="p-1 rounded-[2px] bg-sheet group-hover:bg-paper border border-rule shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-ink group-hover:text-vat">
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div className="text-[11px] text-ink-soft truncate">{item.subtitle}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {filteredCommands.length === 0 && orderResults.length === 0 && (
            <div className="p-6 text-center text-xs text-ink-soft">
              No matching commands or orders for &quot;{query}&quot;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-rule bg-sheet/40 text-[11px] text-ink-soft flex items-center justify-between select-none">
          <span>Search orders, recipes & actions</span>
          <span>Press <kbd className="font-mono text-[10px] bg-paper px-1 py-0.5 border border-rule rounded">Esc</kbd> to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
