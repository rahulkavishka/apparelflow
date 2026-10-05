"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Actor } from "@/lib/auth/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { LogOut, ChevronUp } from "lucide-react";

interface UserMenuProps {
  actor: Actor;
  onOpenShortcuts?: () => void;
  collapsed?: boolean;
  className?: string;
}

export function UserMenu({ actor, collapsed = false, className = "" }: UserMenuProps) {
  const router = useRouter();

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const formatRoleTitle = (role: string) => {
    switch (role) {
      case "cutting_supervisor":
        return "Cutting Supervisor";
      case "cutting_verifier":
        return "Cutting Verifier";
      case "sewing_supervisor":
        return "Sewing Supervisor";
      default:
        return role;
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Signed out successfully.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`w-full flex items-center ${collapsed ? "justify-center p-1.5" : "justify-between p-2"} rounded-[4px] hover:bg-sheet transition-colors cursor-pointer select-none text-left border border-transparent hover:border-rule ${className}`}
          aria-label="User profile and account settings"
          title={collapsed ? `${actor.fullName} (${formatRoleTitle(actor.role)})` : undefined}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-[3px] bg-vat text-paper text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
              {getInitials(actor.fullName)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-ink truncate leading-tight">
                  {actor.fullName}
                </div>
                <div className="text-[11px] text-ink-soft truncate">
                  {formatRoleTitle(actor.role)}
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <ChevronUp className="w-3.5 h-3.5 text-ink-soft shrink-0 ml-1" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={collapsed ? "end" : "start"}
        side={collapsed ? "right" : "top"}
        sideOffset={6}
        className="w-52 p-1.5 shadow-xl border border-rule bg-paper rounded-[4px]"
      >
        <DropdownMenuLabel className="font-normal px-2.5 py-2">
          <div className="font-bold text-xs text-ink">{actor.fullName}</div>
          <div className="text-[11px] text-ink-soft font-medium">{formatRoleTitle(actor.role)}</div>
          <div className="text-[11px] text-ink-soft/80 font-mono mt-0.5 truncate">{actor.email}</div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-xs py-2 cursor-pointer text-short-fg hover:text-short-fg hover:bg-short-bg/30 flex items-center gap-2 font-semibold"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
