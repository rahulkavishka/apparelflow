"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Actor } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AppHeaderProps {
  actor: Actor;
}

const DEMO_ACCOUNTS = [
  { role: "cutting_supervisor", label: "Cutting supervisor (Nimali)", email: "supervisor@apparelflow.demo", pass: "Supervisor@123", path: "/supervisor/orders" },
  { role: "cutting_verifier", label: "Cutting verifier (Kasun)", email: "verifier@apparelflow.demo", pass: "Verifier@123", path: "/verifier/queue" },
  { role: "sewing_supervisor", label: "Sewing supervisor (Dilani)", email: "sewing@apparelflow.demo", pass: "Sewing@123", path: "/sewing/queue" },
];

export function AppHeader({ actor }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleRoleSwitch = async (targetRole: string) => {
    const target = DEMO_ACCOUNTS.find((a) => a.role === targetRole);
    if (!target) return;

    try {
      // 1. Logout
      await fetch("/api/auth/logout", { method: "POST" });
      // 2. Login as new persona
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target.email, password: target.pass }),
      });

      if (!res.ok) throw new Error("Failed to switch role");

      toast.success(`Switched role to ${target.label}`);
      router.push(target.path);
      router.refresh();
    } catch {
      toast.error("Failed to switch role");
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Signed out.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const formatRoleTitle = (role: string) => {
    switch (role) {
      case "cutting_supervisor":
        return "Cutting supervisor";
      case "cutting_verifier":
        return "Cutting verifier";
      case "sewing_supervisor":
        return "Sewing supervisor";
      default:
        return role;
    }
  };

  // Nav links based on current role
  const getNavLinks = () => {
    switch (actor.role) {
      case "cutting_supervisor":
        return [
          { href: "/supervisor/orders", label: "Cutting orders" },
        ];
      case "cutting_verifier":
        return [
          { href: "/verifier/queue", label: "Verification queue" },
          { href: "/verifier/history", label: "History" },
        ];
      case "sewing_supervisor":
        return [
          { href: "/sewing/queue", label: "Sewing queue" },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="shrink-0 bg-chalk border-b border-rule">
      {/* 56px Top Vat-Deep Bar */}
      <header className="h-14 bg-vat-deep px-4 sm:px-6 flex items-center justify-between text-paper">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="font-display text-2xl font-semibold text-paper tracking-normal hover:opacity-95">
            ApparelFlow
          </Link>
          <span className="text-sm text-vat-tint hidden sm:inline">
            Cutting gate
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-paper leading-tight">{actor.fullName}</div>
            <div className="text-xs text-vat-tint leading-tight">{formatRoleTitle(actor.role)}</div>
          </div>

          {/* Switch Role Dropdown */}
          <div className="w-48 sm:w-56">
            <Select value={actor.role} onValueChange={handleRoleSwitch}>
              <SelectTrigger className="h-9 text-xs font-bold border-rule bg-paper text-ink">
                <SelectValue placeholder="Switch role" />
              </SelectTrigger>
              <SelectContent>
                {DEMO_ACCOUNTS.map((acc) => (
                  <SelectItem key={acc.role} value={acc.role} className="text-xs">
                    {acc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-xs font-bold text-paper hover:bg-vat hover:text-paper h-9"
          >
            Sign out
          </Button>
        </div>
      </header>

      {/* Role Navigation Tabs */}
      <nav aria-label="Role Navigation" className="max-w-300 mx-auto px-4 sm:px-6 flex gap-6">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`py-3 text-sm font-bold border-b-2 transition-colors ${
                isActive
                  ? "border-vat text-vat"
                  : "border-transparent text-ink-soft hover:text-ink hover:border-rule"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
