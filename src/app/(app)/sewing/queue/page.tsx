"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stamp } from "@/components/domain/Stamp";
import { OrderNo } from "@/components/domain/OrderNo";
import { RelativeTime } from "@/components/domain/RelativeTime";
import { KPICard } from "@/components/ui/KPICard";
import { FilterChips, FilterChipOption } from "@/components/ui/FilterChips";
import { Pagination } from "@/components/ui/Pagination";
import { DensityToggle, TableDensity } from "@/components/ui/DensityToggle";
import { TableLoadingRow } from "@/components/ui/LoadingSpinner";
import { useSewingQueue, useStartSewing } from "@/hooks/useSewing";
import { toast } from "sonner";
import { OrderStatus } from "@prisma/client";
import { Search, Layers, Play, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

function SewingQueueContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const startedParam = (searchParams.get("startedFilter") as "all" | "awaiting" | "started" | null) || "all";
  const searchParam = searchParams.get("q") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const pageSizeParam = parseInt(searchParams.get("pageSize") || "10", 10);

  const [startedFilter, setStartedFilter] = useState<"all" | "awaiting" | "started">(startedParam);
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [page, setPage] = useState(pageParam || 1);
  const [pageSize, setPageSize] = useState(pageSizeParam || 10);
  const [density, setDensity] = useState<TableDensity>("compact");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync state when URL searchParams change
  useEffect(() => {
    const currentFilter = searchParams.get("startedFilter") as "all" | "awaiting" | "started" | null;
    if (currentFilter && ["all", "awaiting", "started"].includes(currentFilter)) {
      setStartedFilter(currentFilter);
    } else {
      setStartedFilter("all");
    }

    const currentQ = searchParams.get("q") || "";
    setSearchQuery(currentQ);

    const currentPage = parseInt(searchParams.get("page") || "1", 10);
    setPage(currentPage || 1);
  }, [searchParams]);

  const updateUrlParams = useCallback(
    (updates: { startedFilter?: string; q?: string; page?: number; pageSize?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.startedFilter !== undefined) {
        if (updates.startedFilter && updates.startedFilter !== "all") {
          params.set("startedFilter", updates.startedFilter);
        } else {
          params.delete("startedFilter");
        }
      }
      if (updates.q !== undefined) {
        if (updates.q.trim()) params.set("q", updates.q.trim());
        else params.delete("q");
      }
      if (updates.page !== undefined) {
        if (updates.page > 1) params.set("page", String(updates.page));
        else params.delete("page");
      }
      if (updates.pageSize !== undefined) {
        if (updates.pageSize !== 10) params.set("pageSize", String(updates.pageSize));
        else params.delete("pageSize");
      }

      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const { data, isLoading, refetch } = useSewingQueue({
    startedFilter,
    q: searchQuery ? searchQuery.trim() : undefined,
    page,
    pageSize,
  });

  const orders = data?.orders || [];
  const meta = data?.meta || {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    counts: { awaiting: 0, started: 0, all: 0 },
  };

  const handleFilterChange = (val: "all" | "awaiting" | "started") => {
    setStartedFilter(val);
    setPage(1);
    updateUrlParams({ startedFilter: val, page: 1 });
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
    updateUrlParams({ q: val, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlParams({ page: newPage });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    updateUrlParams({ pageSize: newPageSize, page: 1 });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["sewingQueue"] });
      await refetch();
      toast.success("Sewing queue refreshed.");
    } catch {
      toast.error("Failed to refresh sewing queue.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleStartSewingQuick = async (e: React.MouseEvent, orderId: string, orderNo: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/sewing/orders/${orderId}/start`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to start assembly");
      toast.success(`Sewing assembly started for batch ${orderNo}.`);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start assembly";
      toast.error(msg);
    }
  };

  const filterOptions: FilterChipOption<"all" | "awaiting" | "started">[] = [
    { value: "all", label: "All verified batches", count: meta.counts.all },
    { value: "awaiting", label: "Awaiting assembly", count: meta.counts.awaiting },
    { value: "started", label: "In assembly", count: meta.counts.started, badgeVariant: "vat" },
  ];

  const cellPaddingClass = density === "compact" ? "py-2 px-3 text-xs" : "py-3.5 px-3.5 text-sm";
  const headerPaddingClass = density === "compact" ? "py-2 px-3 text-xs" : "py-3 px-3.5 text-xs";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Sewing assembly queue
          </h1>
          <p className="text-xs text-ink-soft">
            Verified cutting bundles released from the quality gate, ready for line loading and garment assembly.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className="h-8 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-vat" : ""}`} />
          <span>Refresh queue</span>
        </Button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KPICard
          title="Total verified batches"
          value={meta.counts.all}
          subtitle="Cleared from verification gate"
          icon={<Layers className="w-4 h-4" />}
        />
        <KPICard
          title="Awaiting sewing start"
          value={meta.counts.awaiting}
          subtitle="Ready to load on line"
          variant="default"
          icon={<Clock className="w-4 h-4" />}
        />
        <KPICard
          title="Currently in assembly"
          value={meta.counts.started}
          subtitle="Active on sewing floor"
          variant="vat"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
      </div>

      {/* Filter Chips */}
      <FilterChips
        options={filterOptions}
        selectedValue={startedFilter}
        onSelect={handleFilterChange}
      />

      {/* Search & Tooling Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-paper p-2.5 rounded-[2px] border border-rule">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-ink-soft absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search sewing batches by Order #, Roll ID, or Style..."
            className="pl-8 h-8 text-xs bg-sheet/40"
          />
        </div>

        <div className="hidden md:flex items-center gap-2 self-end sm:self-auto">
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      </div>

      {/* Sewing Queue Table (Desktop) & Responsive Cards (Mobile) */}
      <div className="border border-rule rounded-[2px] bg-paper overflow-hidden shadow-none">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-sheet border-b border-rule">
              <tr>
                <th className={`${headerPaddingClass} pl-4 font-bold text-ink-soft`}>Order</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Recipe</th>
                <th className={`${headerPaddingClass} text-right font-bold text-ink-soft`}>Batch qty</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Verified by</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Verified at</th>
                <th className={`${headerPaddingClass} text-right font-bold text-ink-soft`}>Wastage</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Assembly stage</th>
                <th className={`${headerPaddingClass} pr-4 text-right font-bold text-ink-soft`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {isLoading ? (
                <TableLoadingRow colSpan={8} label="Loading sewing queue..." />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-ink-soft">
                    {searchQuery || startedFilter !== "all"
                      ? "No verified batches match the active filter."
                      : "No verified batches in queue. Batches appear here after verifier approval."}
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isInAssembly = Boolean(o.sewingStartedAt);

                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-row-hover transition-colors"
                    >
                      <td className={`${cellPaddingClass} pl-4 font-bold text-ink whitespace-nowrap`}>
                        <Link
                          href={`/sewing/orders/${o.id}`}
                          className="hover:underline text-ink"
                        >
                          <OrderNo orderNo={o.orderNo} />
                        </Link>
                      </td>

                      <td className={`${cellPaddingClass} text-ink whitespace-nowrap`}>
                        <span className="font-bold">{o.recipe.name}</span>{" "}
                        <span className="text-[11px] text-ink-soft">({o.recipe.recipeCode})</span>
                      </td>

                      <td className={`${cellPaddingClass} text-right font-display text-sm font-bold tabular-nums text-ink`}>
                        {o.targetQty}
                      </td>

                      <td className={`${cellPaddingClass} font-bold text-ink whitespace-nowrap`}>
                        {o.verifier?.fullName || "—"}
                      </td>

                      <td className={`${cellPaddingClass} text-ink-soft whitespace-nowrap font-medium`}>
                        <RelativeTime value={o.verifiedAt} />
                      </td>

                      <td className={`${cellPaddingClass} text-right tabular-nums text-ink font-bold`}>
                        {o.wastagePct !== null ? `${o.wastagePct.toFixed(2)}%` : "—"}
                      </td>

                      {/* Assembly Stage Badge */}
                      <td className={`${cellPaddingClass} whitespace-nowrap`}>
                        {isInAssembly ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[11px] font-bold bg-vat text-paper">
                            In assembly
                          </span>
                        ) : (
                          <Stamp status={OrderStatus.VERIFIED} />
                        )}
                      </td>

                      {/* Actions */}
                      <td className={`${cellPaddingClass} pr-4 text-right whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-1.5">
                          {!isInAssembly && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => handleStartSewingQuick(e, o.id, o.orderNo)}
                              className="h-7 text-xs px-2.5 font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3 h-3" />
                              <span>Start</span>
                            </Button>
                          )}

                          <Link href={`/sewing/orders/${o.id}`} className="inline-flex">
                            <Button variant="secondary" size="sm" className="h-7 text-xs px-2.5 font-bold cursor-pointer">
                              View batch
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (< md screens) */}
        <div className="md:hidden divide-y divide-rule">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-ink-soft">
              Loading sewing queue...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-soft">
              {searchQuery || startedFilter !== "all"
                ? "No verified batches match active filter."
                : "No verified batches in queue."}
            </div>
          ) : (
            orders.map((o) => {
              const isInAssembly = Boolean(o.sewingStartedAt);

              return (
                <div
                  key={o.id}
                  className="p-3.5 space-y-2.5 bg-paper hover:bg-sheet/40 transition-colors"
                >
                  {/* Card Header: Order # + Assembly Stage */}
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/sewing/orders/${o.id}`}
                      className="font-bold text-ink hover:underline text-sm"
                    >
                      <OrderNo orderNo={o.orderNo} />
                    </Link>
                    {isInAssembly ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[11px] font-bold bg-vat text-paper">
                        In assembly
                      </span>
                    ) : (
                      <Stamp status={OrderStatus.VERIFIED} />
                    )}
                  </div>

                  {/* Recipe & Roll */}
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="font-bold text-ink truncate">
                      {o.recipe.name}{" "}
                      <span className="font-mono text-[11px] text-ink-soft">({o.recipe.recipeCode})</span>
                    </div>
                    <span className="font-mono text-[11px] bg-sheet px-1.5 py-0.5 rounded border border-rule shrink-0">
                      Roll: {o.fabricRollId}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-sheet/40 p-2 rounded border border-rule/60 text-center">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Batch Qty</div>
                      <div className="font-display font-bold text-sm text-ink">{o.targetQty}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Wastage</div>
                      <div className="font-mono text-xs font-bold text-ink">
                        {o.wastagePct !== null ? `${o.wastagePct.toFixed(1)}%` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Verified At</div>
                      <div className="text-[11px] text-ink-soft mt-0.5">
                        <RelativeTime value={o.verifiedAt} />
                      </div>
                    </div>
                  </div>

                  {/* Verifier footer & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-rule/40 text-xs">
                    <span className="text-ink-soft">
                      Verified by <strong className="text-ink font-semibold">{o.verifier?.fullName || "Verifier"}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {!isInAssembly && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => handleStartSewingQuick(e, o.id, o.orderNo)}
                          className="h-7 text-xs px-2.5 font-bold flex items-center gap-1 bg-vat text-paper hover:bg-vat/90"
                        >
                          <Play className="w-3 h-3" />
                          <span>Start</span>
                        </Button>
                      )}

                      <Link href={`/sewing/orders/${o.id}`}>
                        <Button variant="secondary" size="sm" className="h-7 text-xs px-2.5 font-bold">
                          View details →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Integrated Pagination Bar */}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={meta.total}
          totalPages={meta.totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}

export default function SewingQueuePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">Loading sewing assembly queue...</div>}>
      <SewingQueueContent />
    </Suspense>
  );
}
