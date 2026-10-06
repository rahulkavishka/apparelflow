"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Actor } from "@/lib/auth/session";
import {
  Scissors,
  CheckCircle2,
  Layers,
  BookOpen,
  Clock,
  History,
  AlertTriangle,
  FileText,
  PanelLeftClose,
  Menu,
} from "lucide-react";
import { useOrdersList } from "@/hooks/useOrders";
import { useVerificationQueue } from "@/hooks/useVerification";
import { useSewingQueue } from "@/hooks/useSewing";
import { UserMenu } from "./UserMenu";

interface SidebarProps {
  actor: Actor;
  className?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenShortcuts?: () => void;
}

function SidebarContent({
  actor,
  className = "",
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  onOpenShortcuts,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status");
  const currentStartedFilter = searchParams.get("startedFilter");

  // Load counts for active views only (role-gated to avoid 403s)
  const isSupervisor = actor.role === "cutting_supervisor";
  const isVerifier = actor.role === "cutting_verifier";
  const isSewing = actor.role === "sewing_supervisor";

  const { data: supervisorOrders } = useOrdersList({ page: 1, pageSize: 1, enabled: isSupervisor });
  const { data: verifierQueue } = useVerificationQueue({ page: 1, pageSize: 1, enabled: isVerifier });
  const { data: sewingQueue } = useSewingQueue({ page: 1, pageSize: 1, enabled: isSewing });

  const supervisorCounts = supervisorOrders?.meta?.counts;
  const verifierCount = verifierQueue?.total ?? 0;
  const sewingCounts = sewingQueue?.meta?.counts;

  return (
    <aside
      className={`bg-paper border-r border-rule flex flex-col h-full select-none transition-all duration-200 ${collapsed ? "w-16" : "w-56"
        } ${className}`}
    >
      {/* Brand Header */}
      <div className="h-12 px-3 flex items-center justify-between border-b border-rule bg-sheet/50 shrink-0">
        {collapsed ? (
          <div className="w-full flex items-center justify-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-sm hover:bg-sheet text-ink hover:text-vat transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Link
              href="/"
              onClick={onNavigate}
              className="flex items-center gap-2.5 font-display text-lg font-bold text-ink hover:opacity-90 overflow-hidden"
              title="ApparelFlow ERP"
            >
              <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0 overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="ApparelFlow Logo"
                  width={28}
                  height={28}
                  className="w-7 h-7 object-contain"
                  priority
                />
              </div>
              <span className="tracking-tight text-ink font-bold">ApparelFlow</span>
            </Link>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1 rounded hover:bg-sheet text-ink-soft hover:text-ink transition-colors cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Supervisor Navigation */}
        {isSupervisor && (
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 py-1 text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                Cutting Floor
              </div>
            )}

            <Link
              href="/supervisor/orders"
              onClick={onNavigate}
              title={`Cutting orders (${supervisorCounts?.ALL ?? 0})`}
              className={`flex items-center ${collapsed ? "justify-center p-2" : "justify-between px-2.5 py-2"} rounded-[3px] text-[13px] font-semibold transition-colors ${(pathname === "/supervisor/orders" && !currentStatus) ||
                  (pathname.startsWith("/supervisor/orders/") && !pathname.includes("?"))
                  ? "bg-vat text-paper font-bold shadow-xs"
                  : "text-ink hover:bg-sheet hover:text-ink"
                }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Scissors className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">Cutting orders</span>}
              </div>
              {!collapsed && supervisorCounts && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-xs font-mono font-bold shrink-0 ${(pathname === "/supervisor/orders" && !currentStatus) ||
                      pathname.startsWith("/supervisor/orders/")
                      ? "bg-paper/20 text-paper"
                      : "bg-sheet text-ink-soft"
                    }`}
                >
                  {supervisorCounts.ALL}
                </span>
              )}
            </Link>

            <Link
              href="/supervisor/recipes"
              onClick={onNavigate}
              title="Recipes"
              className={`flex items-center ${collapsed ? "justify-center p-2" : "justify-between px-2.5 py-2"} rounded-[3px] text-[13px] font-semibold transition-colors ${pathname.startsWith("/supervisor/recipes")
                  ? "bg-vat text-paper font-bold shadow-xs"
                  : "text-ink hover:bg-sheet hover:text-ink"
                }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpen className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">Recipes</span>}
              </div>
            </Link>

            {/* Quick Views / Saved Views (always visible in both expanded & collapsed modes) */}
            <div className="pt-2 space-y-0.5">
              {collapsed ? (
                <div className="my-1.5 border-t border-rule/60" />
              ) : (
                <div className="px-2.5 py-1 text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                  Saved views
                </div>
              )}

              <Link
                href="/supervisor/orders?status=CUTTING_IN_PROGRESS"
                onClick={onNavigate}
                title={`In progress (${supervisorCounts?.CUTTING_IN_PROGRESS ?? 0})`}
                className={`flex items-center ${collapsed ? "justify-center p-2" : "justify-between px-2.5 py-1.5"} rounded-[3px] text-xs transition-colors ${pathname === "/supervisor/orders" && currentStatus === "CUTTING_IN_PROGRESS"
                    ? "bg-sheet font-bold text-ink border-l-2 border-vat pl-2"
                    : "text-ink hover:bg-sheet font-medium"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-ink-soft" />
                  {!collapsed && <span>In progress</span>}
                </div>
                {!collapsed && supervisorCounts && (
                  <span className="text-[10px] font-mono text-ink-soft">
                    {supervisorCounts.CUTTING_IN_PROGRESS}
                  </span>
                )}
              </Link>

              <Link
                href="/supervisor/orders?status=PENDING_VERIFICATION"
                onClick={onNavigate}
                title={`Pending gate (${supervisorCounts?.PENDING_VERIFICATION ?? 0})`}
                className={`flex items-center ${collapsed ? "justify-center p-2" : "justify-between px-2.5 py-1.5"} rounded-[3px] text-xs transition-colors ${pathname === "/supervisor/orders" && currentStatus === "PENDING_VERIFICATION"
                    ? "bg-sheet font-bold text-ink border-l-2 border-vat pl-2"
                    : "text-ink hover:bg-sheet font-medium"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-ink-soft" />
                  {!collapsed && <span>Pending gate</span>}
                </div>
                {!collapsed && supervisorCounts && (
                  <span className="text-[10px] font-mono text-ink-soft">
                    {supervisorCounts.PENDING_VERIFICATION}
                  </span>
                )}
              </Link>

              <Link
                href="/supervisor/orders?status=REJECTED"
                onClick={onNavigate}
                title={`Rejected (Re-cut) (${supervisorCounts?.REJECTED ?? 0})`}
                className={`flex items-center ${collapsed ? "justify-center p-2 relative" : "justify-between px-2.5 py-1.5"} rounded-[3px] text-xs transition-colors ${pathname === "/supervisor/orders" && currentStatus === "REJECTED"
                    ? "bg-short-bg font-bold text-short-fg border-l-2 border-short-edge pl-2"
                    : "text-short-fg hover:bg-short-bg/30 font-bold"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-short-fg" />
                  {!collapsed && <span>Rejected (Re-cut)</span>}
                </div>
                {!collapsed && supervisorCounts && supervisorCounts.REJECTED > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-short-edge text-paper font-bold">
                    {supervisorCounts.REJECTED}
                  </span>
                )}
                {collapsed && supervisorCounts && supervisorCounts.REJECTED > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-short-edge ring-1 ring-paper" />
                )}
              </Link>

              <Link
                href="/supervisor/orders?status=VERIFIED"
                onClick={onNavigate}
                title={`Verified (${supervisorCounts?.VERIFIED ?? 0})`}
                className={`flex items-center ${collapsed ? "justify-center p-2" : "justify-between px-2.5 py-1.5"} rounded-[3px] text-xs transition-colors ${pathname === "/supervisor/orders" && currentStatus === "VERIFIED"
                    ? "bg-match-bg font-bold text-match-fg border-l-2 border-match-edge pl-2"
                    : "text-ink hover:bg-sheet font-medium"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-match-fg" />
                  {!collapsed && <span>Verified</span>}
                </div>
                {!collapsed && supervisorCounts && (
                  <span className="text-[10px] font-mono text-ink-soft">
                    {supervisorCounts.VERIFIED}
                  </span>
                )}
              </Link>
            </div>
          </div>
        )}

        {/* Verifier Navigation */}
        {isVerifier && (
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 py-1 text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                Verification Gate
              </div>
            )}

            <Link
              href="/verifier/queue"
              onClick={onNavigate}
              title={`Verification queue (${verifierCount})`}
              className={`flex items-center ${collapsed ? "justify-center p-2 relative" : "justify-between px-2.5 py-2"} rounded-[3px] text-[13px] font-semibold transition-colors ${pathname === "/verifier/queue" || pathname.startsWith("/verifier/orders/")
                  ? "bg-vat text-paper font-bold shadow-xs"
                  : "text-ink hover:bg-sheet hover:text-ink"
                }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Clock className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">Verification queue</span>}
              </div>
              {!collapsed && verifierCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-xs font-mono font-bold shrink-0 ${pathname.startsWith("/verifier/queue") || pathname.startsWith("/verifier/orders/")
                      ? "bg-paper text-vat"
                      : "bg-vat text-paper"
                    }`}
                >
                  {verifierCount}
                </span>
              )}
              {collapsed && verifierCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-vat ring-1 ring-paper" />
              )}
            </Link>

            <Link
              href="/verifier/history"
              onClick={onNavigate}
              title="Decision history"
              className={`flex items-center ${collapsed ? "justify-center p-2" : "justify-between px-2.5 py-2"} rounded-[3px] text-[13px] font-semibold transition-colors ${pathname.startsWith("/verifier/history")
                  ? "bg-vat text-paper font-bold shadow-xs"
                  : "text-ink hover:bg-sheet hover:text-ink"
                }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <History className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">Decision history</span>}
              </div>
            </Link>

            <Link
              href="/verifier/recipes"
              onClick={onNavigate}
              title="Recipe specifications"
              className={`flex items-center ${collapsed ? "justify-center p-2" : "justify-between px-2.5 py-2"} rounded-[3px] text-[13px] font-semibold transition-colors ${pathname.startsWith("/verifier/recipes")
                  ? "bg-vat text-paper font-bold shadow-xs"
                  : "text-ink hover:bg-sheet hover:text-ink"
                }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpen className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">Recipe specifications</span>}
              </div>
            </Link>
          </div>
        )}

        {/* Sewing Navigation */}
        {isSewing && (
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 py-1 text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                Sewing Assembly
              </div>
            )}

            <Link
              href="/sewing/queue"
              onClick={onNavigate}
              title={`Sewing queue (${sewingCounts?.all ?? 0})`}
              className={`flex items-center ${collapsed ? "justify-center p-2" : "justify-between px-2.5 py-2"} rounded-[3px] text-[13px] font-semibold transition-colors ${(pathname === "/sewing/queue" && (!currentStartedFilter || currentStartedFilter === "all")) ||
                  pathname.startsWith("/sewing/orders/")
                  ? "bg-vat text-paper font-bold shadow-xs"
                  : "text-ink hover:bg-sheet hover:text-ink"
                }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Layers className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">Sewing queue</span>}
              </div>
              {!collapsed && sewingCounts && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-xs font-mono font-bold shrink-0 ${(pathname === "/sewing/queue" && (!currentStartedFilter || currentStartedFilter === "all")) ||
                      pathname.startsWith("/sewing/orders/")
                      ? "bg-paper/20 text-paper"
                      : "bg-sheet text-ink-soft"
                    }`}
                >
                  {sewingCounts.all}
                </span>
              )}
            </Link>

            {/* Quick Views / Assembly Stages */}
            <div className="pt-2 space-y-0.5">
              {collapsed ? (
                <div className="my-1.5 border-t border-rule/60" />
              ) : (
                <div className="px-2.5 py-1 text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                  Assembly stages
                </div>
              )}

              <Link
                href="/sewing/queue?startedFilter=awaiting"
                onClick={onNavigate}
                title={`Awaiting assembly (${sewingCounts?.awaiting ?? 0})`}
                className={`flex items-center ${collapsed ? "justify-center p-2" : "justify-between px-2.5 py-1.5"} rounded-[3px] text-xs transition-colors ${pathname === "/sewing/queue" && currentStartedFilter === "awaiting"
                    ? "bg-sheet font-bold text-ink border-l-2 border-vat pl-2"
                    : "text-ink hover:bg-sheet font-medium"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-ink-soft" />
                  {!collapsed && <span>Awaiting assembly</span>}
                </div>
                {!collapsed && sewingCounts && (
                  <span className="text-[10px] font-mono text-ink-soft">
                    {sewingCounts.awaiting}
                  </span>
                )}
              </Link>

              <Link
                href="/sewing/queue?startedFilter=started"
                onClick={onNavigate}
                title={`In assembly (${sewingCounts?.started ?? 0})`}
                className={`flex items-center ${collapsed ? "justify-center p-2" : "justify-between px-2.5 py-1.5"} rounded-[3px] text-xs transition-colors ${pathname === "/sewing/queue" && currentStartedFilter === "started"
                    ? "bg-sheet font-bold text-ink border-l-2 border-vat pl-2"
                    : "text-ink hover:bg-sheet font-medium"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-vat" />
                  {!collapsed && <span>In assembly</span>}
                </div>
                {!collapsed && sewingCounts && (
                  <span className="text-[10px] font-mono text-ink-soft">
                    {sewingCounts.started}
                  </span>
                )}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Bottom User Menu with Popup */}
      <div className="p-2 border-t border-rule bg-sheet/40 shrink-0">
        <UserMenu
          actor={actor}
          onOpenShortcuts={onOpenShortcuts}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={<aside className={`w-52 shrink-0 bg-paper border-r border-rule flex flex-col h-full ${props.className || ""}`} />}>
      <SidebarContent {...props} />
    </Suspense>
  );
}
