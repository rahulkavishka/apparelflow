"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stamp } from "@/components/domain/Stamp";
import { OrderNo } from "@/components/domain/OrderNo";
import { RelativeTime } from "@/components/domain/RelativeTime";
import { KPICard } from "@/components/ui/KPICard";
import { Pagination } from "@/components/ui/Pagination";
import { DensityToggle, TableDensity } from "@/components/ui/DensityToggle";
import { TableLoadingRow } from "@/components/ui/LoadingSpinner";
import { useVerificationQueue } from "@/hooks/useVerification";
import { Search, Clock, ArrowRight, CheckCircle2, ShieldAlert, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function VerifierQueuePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<"submittedAt" | "orderNo" | "targetQty">("submittedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [density, setDensity] = useState<TableDensity>("compact");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useVerificationQueue({
    q: searchQuery ? searchQuery.trim() : undefined,
    sort: sortField,
    dir: sortDir,
    page,
    pageSize,
  });

  const queue = data?.queue || [];
  const meta = data?.meta || {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    totalGarments: 0,
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["verificationQueue"] });
      await refetch();
      toast.success("Verification queue refreshed.");
    } catch {
      toast.error("Failed to refresh queue.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const totalGarments = meta.totalGarments ?? 0;

  const cellPaddingClass = density === "compact" ? "py-2 px-3 text-xs" : "py-3.5 px-3.5 text-sm";
  const headerPaddingClass = density === "compact" ? "py-2 px-3 text-xs" : "py-3 px-3.5 text-xs";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Verification queue
          </h1>
          <p className="text-xs text-ink-soft">
            Incoming cut bundles awaiting physical piece count verification before release to the sewing line.
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
          title="Batches in queue"
          value={meta.total}
          subtitle="Awaiting physical count"
          icon={<Clock className="w-4 h-4" />}
        />
        <KPICard
          title="Garments waiting"
          value={totalGarments}
          subtitle="Total batch units in queue"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <KPICard
          title="Quality Gatekeeper"
          value="Locked Stop"
          subtitle="Zero-defect gate enforcement active"
          variant="vat"
          icon={<ShieldAlert className="w-4 h-4" />}
        />
      </div>

      {/* Search & Tooling Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-paper p-2.5 rounded-[2px] border border-rule">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-ink-soft absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search queue by Order #, Roll ID, or Style..."
            className="pl-8 h-8 text-xs bg-sheet/40"
          />
        </div>

        <div className="hidden md:flex items-center gap-2 self-end sm:self-auto">
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      </div>

      {/* Queue Table (Desktop) & Responsive Cards (Mobile) */}
      <div className="border border-rule rounded-[2px] bg-paper overflow-hidden shadow-none">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-sheet border-b border-rule">
              <tr>
                <th className={`${headerPaddingClass} pl-4 font-bold text-ink-soft`}>Order</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Recipe</th>
                <th className={`${headerPaddingClass} text-right font-bold text-ink-soft`}>Target qty</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Fabric roll</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Waiting since</th>
                <th className={`${headerPaddingClass} text-center font-bold text-ink-soft`}>Counting status</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Gate state</th>
                <th className={`${headerPaddingClass} pr-4 text-right font-bold text-ink-soft`}>Terminal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {isLoading ? (
                <TableLoadingRow colSpan={8} label="Loading verification queue..." />
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-ink-soft">
                    {searchQuery
                      ? "No queue items match your search filter."
                      : "No batches waiting for verification. All cutting orders are clear."}
                  </td>
                </tr>
              ) : (
                queue.map((item) => {
                  const isCountingStarted = item.countedItems > 0;
                  const isFullyCounted = item.countedItems === item.totalItems && item.totalItems > 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-row-hover transition-colors select-none"
                    >
                      <td className={`${cellPaddingClass} pl-4 font-bold text-ink whitespace-nowrap`}>
                        <Link
                          href={`/verifier/orders/${item.id}`}
                          className="hover:underline text-ink"
                        >
                          <OrderNo orderNo={item.orderNo} />
                        </Link>
                      </td>

                      <td className={`${cellPaddingClass} text-ink whitespace-nowrap`}>
                        <span className="font-bold">{item.recipe.name}</span>{" "}
                        <span className="text-[11px] text-ink-soft font-mono">({item.recipe.recipeCode})</span>
                      </td>

                      <td className={`${cellPaddingClass} text-right font-display font-bold tabular-nums text-ink`}>
                        {item.targetQty}
                      </td>

                      <td className={`${cellPaddingClass} font-bold font-mono text-ink whitespace-nowrap`}>
                        {item.fabricRollId}
                      </td>

                      <td className={`${cellPaddingClass} text-ink-soft whitespace-nowrap font-medium`}>
                        <RelativeTime value={item.submittedAt} />
                      </td>

                      {/* Counting Status Progress */}
                      <td className={`${cellPaddingClass} text-center whitespace-nowrap`}>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] font-mono font-bold text-[11px] ${
                            isFullyCounted
                              ? "bg-match-bg text-match-fg border border-match-edge/60"
                              : isCountingStarted
                              ? "bg-vat-tint/40 text-vat border border-vat/30"
                              : "bg-sheet text-ink-soft border border-rule"
                          }`}
                        >
                          {item.countedItems} / {item.totalItems} counted
                        </span>
                      </td>

                      <td className={`${cellPaddingClass} whitespace-nowrap`}>
                        <Stamp status={item.status} />
                      </td>

                      <td className={`${cellPaddingClass} pr-4 text-right whitespace-nowrap`}>
                        <div className="flex items-center justify-end">
                          <Link href={`/verifier/orders/${item.id}`} className="inline-flex">
                            <Button
                              variant="primary"
                              size="sm"
                              className="h-7 text-xs px-2.5 font-bold inline-flex items-center gap-1 bg-vat text-paper hover:bg-vat/90 cursor-pointer"
                            >
                              <span>Open terminal</span>
                              <ArrowRight className="w-3 h-3" />
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
              Loading verification queue...
            </div>
          ) : queue.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-soft">
              {searchQuery
                ? "No queue items match your search filter."
                : "No batches waiting for verification. All cutting orders are clear."}
            </div>
          ) : (
            queue.map((item) => {
              const isCountingStarted = item.countedItems > 0;
              const isFullyCounted = item.countedItems === item.totalItems && item.totalItems > 0;

              return (
                <div
                  key={item.id}
                  className="p-3.5 space-y-2.5 bg-paper hover:bg-sheet/40 transition-colors"
                >
                  {/* Card Header: Order # + Gate Stamp */}
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/verifier/orders/${item.id}`}
                      className="font-bold text-ink hover:underline text-sm"
                    >
                      <OrderNo orderNo={item.orderNo} />
                    </Link>
                    <Stamp status={item.status} />
                  </div>

                  {/* Recipe and Roll details */}
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="font-bold text-ink truncate">
                      {item.recipe.name}{" "}
                      <span className="font-mono text-[11px] text-ink-soft">({item.recipe.recipeCode})</span>
                    </div>
                    <span className="font-mono text-[11px] bg-sheet px-1.5 py-0.5 rounded border border-rule shrink-0">
                      Roll: {item.fabricRollId}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-sheet/40 p-2 rounded border border-rule/60 text-center">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Target Quantity</div>
                      <div className="font-display font-bold text-sm text-ink">{item.targetQty} pcs</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Waiting Since</div>
                      <div className="text-xs font-medium text-ink-soft mt-0.5">
                        <RelativeTime value={item.submittedAt} />
                      </div>
                    </div>
                  </div>

                  {/* Counting Progress Badge */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-ink-soft font-medium">Piece Audit:</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] font-mono font-bold text-[11px] ${
                        isFullyCounted
                          ? "bg-match-bg text-match-fg border border-match-edge/60"
                          : isCountingStarted
                          ? "bg-vat-tint/40 text-vat border border-vat/30"
                          : "bg-sheet text-ink-soft border border-rule"
                      }`}
                    >
                      {item.countedItems} / {item.totalItems} counted
                    </span>
                  </div>

                  {/* Card Action */}
                  <div className="pt-1.5 border-t border-rule/40">
                    <Link href={`/verifier/orders/${item.id}`} className="block w-full">
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full h-8 text-xs font-bold flex items-center justify-center gap-1.5 bg-vat text-paper hover:bg-vat/90 cursor-pointer"
                      >
                        <span>Open verification terminal</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Integrated Pagination Bar - Default 10 */}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={meta.total}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[10, 20, 50]}
          itemLabel="batches"
        />
      </div>
    </div>
  );
}
