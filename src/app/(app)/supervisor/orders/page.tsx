"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stamp } from "@/components/domain/Stamp";
import { OrderNo } from "@/components/domain/OrderNo";
import { CreateOrderModal } from "@/components/domain/CreateOrderModal";
import { RecipeCombobox } from "@/components/domain/RecipeCombobox";
import { KPICard } from "@/components/ui/KPICard";
import { FilterChips, FilterChipOption } from "@/components/ui/FilterChips";
import { Pagination } from "@/components/ui/Pagination";
import { SelectionBar } from "@/components/ui/SelectionBar";
import { DensityToggle, TableDensity } from "@/components/ui/DensityToggle";
import { TableLoadingRow } from "@/components/ui/LoadingSpinner";
import { PeekDrawer, PeekDrawerData } from "@/components/domain/PeekDrawer";
import { useOrdersList, useSubmitOrder, useRecutOrder } from "@/hooks/useOrders";
import { useRecipesList } from "@/hooks/useRecipes";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { OrderStatus } from "@prisma/client";
import {
  Search,
  Plus,
  Scissors,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Send,
} from "lucide-react";

function SupervisorOrdersContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL query parameters
  const statusParam = searchParams.get("status") as OrderStatus | null;
  const recipeParam = searchParams.get("recipeId") || "ALL";
  const searchParam = searchParams.get("q") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const pageSizeParam = parseInt(searchParams.get("pageSize") || "10", 10);

  // Synchronized state - default pageSize is 10
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "ALL">(
    statusParam && ["CUTTING_IN_PROGRESS", "PENDING_VERIFICATION", "REJECTED", "VERIFIED"].includes(statusParam)
      ? statusParam
      : "ALL"
  );
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(recipeParam);
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [page, setPage] = useState(pageParam || 1);
  const [pageSize, setPageSize] = useState(pageSizeParam || 10);
  const [sortField] = useState<"createdAt" | "orderNo" | "targetQty" | "actualFabricYds" | "status">("createdAt");
  const [sortDir] = useState<"asc" | "desc">("desc");
  const [density, setDensity] = useState<TableDensity>("compact");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal & Drawer states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [peekData, setPeekData] = useState<PeekDrawerData | null>(null);

  // Sync state when URL searchParams change
  useEffect(() => {
    const currentStatus = searchParams.get("status") as OrderStatus | null;
    if (currentStatus && ["CUTTING_IN_PROGRESS", "PENDING_VERIFICATION", "REJECTED", "VERIFIED"].includes(currentStatus)) {
      setSelectedStatus(currentStatus);
    } else if (!currentStatus) {
      setSelectedStatus("ALL");
    }

    const currentRecipe = searchParams.get("recipeId") || "ALL";
    setSelectedRecipeId(currentRecipe);

    const currentQ = searchParams.get("q") || "";
    setSearchQuery(currentQ);

    const currentPage = parseInt(searchParams.get("page") || "1", 10);
    setPage(currentPage || 1);

    const currentPageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    setPageSize(currentPageSize || 10);
  }, [searchParams]);

  // Update URL helper
  const updateUrlParams = useCallback(
    (updates: { status?: string; recipeId?: string; q?: string; page?: number; pageSize?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.status !== undefined) {
        if (updates.status && updates.status !== "ALL") params.set("status", updates.status);
        else params.delete("status");
      }
      if (updates.recipeId !== undefined) {
        if (updates.recipeId && updates.recipeId !== "ALL") params.set("recipeId", updates.recipeId);
        else params.delete("recipeId");
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

  // Queries & Mutations
  const { data: recipesData } = useRecipesList();
  const recipes = recipesData || [];

  const { data, isLoading } = useOrdersList({
    status: selectedStatus,
    recipeId: selectedRecipeId !== "ALL" ? selectedRecipeId : undefined,
    q: searchQuery ? searchQuery.trim() : undefined,
    sort: sortField,
    dir: sortDir,
    page,
    pageSize,
  });

  const orders = data?.orders || [];
  const meta = data?.meta || {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    counts: { ALL: 0, CUTTING_IN_PROGRESS: 0, PENDING_VERIFICATION: 0, REJECTED: 0, VERIFIED: 0 },
  };

  const submitOrderMutation = useSubmitOrder();
  const recutOrderMutation = useRecutOrder();

  // Reset page and selection when filters change
  const handleStatusChange = (status: OrderStatus | "ALL") => {
    setSelectedStatus(status);
    setPage(1);
    setSelectedIds(new Set());
    updateUrlParams({ status, page: 1 });
  };

  const handleRecipeChange = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setPage(1);
    setSelectedIds(new Set());
    updateUrlParams({ recipeId, page: 1 });
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

  // Keyboard shortcut: / focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        const searchInput = document.getElementById("order-search-input");
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Row selection handlers
  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === orders.length && orders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  // Single order actions
  const handleSubmitSingle = async (e: React.MouseEvent, orderId: string, orderNo: string) => {
    e.stopPropagation();
    try {
      await submitOrderMutation.mutateAsync(orderId);
      toast.success(`Cutting order ${orderNo} sent to verification gate.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit order";
      toast.error(msg);
    }
  };

  const handleRecutSingle = async (e: React.MouseEvent, orderId: string, orderNo: string) => {
    e.stopPropagation();
    try {
      await recutOrderMutation.mutateAsync(orderId);
      toast.success(`Order ${orderNo} reset to cutting in progress for re-cut.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to trigger re-cut";
      toast.error(msg);
    }
  };

  // Bulk actions
  const handleBulkSubmit = async () => {
    const draftOrders = orders.filter(
      (o) => selectedIds.has(o.id) && o.status === OrderStatus.CUTTING_IN_PROGRESS
    );

    if (draftOrders.length === 0) {
      toast.error("None of the selected orders are in 'Cutting in progress' draft state.");
      return;
    }

    let successCount = 0;
    for (const order of draftOrders) {
      try {
        await submitOrderMutation.mutateAsync(order.id);
        successCount++;
      } catch {
        // Continue with others
      }
    }

    toast.success(`Sent ${successCount} order(s) to verification gate.`);
    setSelectedIds(new Set());
  };

  const handleExportCSV = () => {
    const exportData = orders.filter((o) => selectedIds.size === 0 || selectedIds.has(o.id));
    if (exportData.length === 0) return;

    const headers = ["Order No", "Recipe Code", "Recipe Name", "Quantity", "Roll ID", "Fabric Yards", "Wastage %", "Status", "Created At"];
    const rows = exportData.map((o) => [
      o.orderNo,
      o.recipe.recipeCode,
      `"${o.recipe.name}"`,
      o.targetQty,
      o.fabricRollId,
      o.actualFabricYds.toFixed(2),
      o.wastagePct.toFixed(2),
      o.status,
      new Date(o.createdAt).toISOString(),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `apparelflow_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${exportData.length} cutting order(s) to CSV.`);
  };

  // Status Filter Options with live counts
  const statusOptions: FilterChipOption<OrderStatus | "ALL">[] = [
    { value: "ALL", label: "All orders", count: meta.counts.ALL },
    {
      value: OrderStatus.CUTTING_IN_PROGRESS,
      label: "In progress",
      count: meta.counts.CUTTING_IN_PROGRESS,
    },
    {
      value: OrderStatus.PENDING_VERIFICATION,
      label: "Pending gate",
      count: meta.counts.PENDING_VERIFICATION,
    },
    {
      value: OrderStatus.REJECTED,
      label: "Rejected",
      count: meta.counts.REJECTED,
      badgeVariant: meta.counts.REJECTED > 0 ? "short" : "default",
    },
    {
      value: OrderStatus.VERIFIED,
      label: "Verified",
      count: meta.counts.VERIFIED,
      badgeVariant: "match",
    },
  ];

  // Visual density styling
  const cellPaddingClass = density === "compact" ? "py-2 px-3 text-xs" : "py-3.5 px-3.5 text-sm";
  const headerPaddingClass = density === "compact" ? "py-2 px-3 text-xs" : "py-3 px-3.5 text-xs";

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Cutting orders
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Manage cutting batches, track component multipliers, and submit to verification.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 self-start sm:self-auto h-9 text-xs font-bold bg-vat text-paper hover:bg-vat/90"
        >
          <Plus className="w-4 h-4" />
          <span>Create cutting order</span>
        </Button>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Active orders"
          value={meta.counts.ALL}
          subtext="Total factory batches"
          icon={<Scissors className="w-4 h-4" />}
        />
        <KPICard
          label="Cutting in progress"
          value={meta.counts.CUTTING_IN_PROGRESS}
          subtext="Draft batches on tables"
          icon={<Clock className="w-4 h-4" />}
        />
        <KPICard
          label="Awaiting verification"
          value={meta.counts.PENDING_VERIFICATION}
          subtext="Queue backlog at gate"
          icon={<Clock className="w-4 h-4 text-vat" />}
        />
        <KPICard
          label="Verified for sewing"
          value={meta.counts.VERIFIED}
          subtext="Passed quality gate audit"
          icon={<CheckCircle2 className="w-4 h-4 text-match-fg" />}
          variant="positive"
        />
      </div>

      {/* Filter Tabs / Chips Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-rule pb-2 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-x-auto">
          <FilterChips
            options={statusOptions}
            value={selectedStatus}
            onChange={handleStatusChange}
          />
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      </div>

      {/* Toolbar: Search & Searchable Recipe Combobox */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2.5 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft pointer-events-none" />
            <Input
              id="order-search-input"
              type="text"
              placeholder="Search by Order #, Roll ID, or Recipe... (Press /)"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 text-xs h-9 bg-paper font-sans w-full"
            />
          </div>

          <div className="w-full sm:w-56 shrink-0">
            <RecipeCombobox
              recipes={recipes}
              value={selectedRecipeId}
              onChange={handleRecipeChange}
              allowAll
              allLabel="All recipes"
              placeholder="Filter by recipe..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs h-9 flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
            title="Export filtered records to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* High-Density Data Table (Desktop) & Responsive Cards (Mobile) */}
      <div className="rounded-sm border border-rule bg-paper overflow-hidden shadow-xs">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-sheet border-b border-rule select-none">
              <tr>
                <th className={`${headerPaddingClass} pl-3.5 w-8`}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === orders.length && orders.length > 0}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all rows on page"
                    className="w-3.5 h-3.5 rounded-xs border-rule text-vat cursor-pointer"
                  />
                </th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Order</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Recipe</th>
                <th className={`${headerPaddingClass} text-right font-bold text-ink-soft`}>Target qty</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Fabric roll</th>
                <th className={`${headerPaddingClass} text-right font-bold text-ink-soft`}>Fabric (yds)</th>
                <th className={`${headerPaddingClass} text-right font-bold text-ink-soft`}>Wastage</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Status</th>
                <th className={`${headerPaddingClass} pr-4 text-right font-bold text-ink-soft`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {isLoading ? (
                <TableLoadingRow colSpan={9} label="Loading cutting orders..." />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-ink-soft">
                    {searchQuery || selectedStatus !== "ALL" || selectedRecipeId !== "ALL"
                      ? "No cutting orders matching the active filters."
                      : "No cutting orders found. Click 'Create cutting order' to create the first batch."}
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isSelected = selectedIds.has(o.id);
                  const isRejected = o.status === OrderStatus.REJECTED;

                  return (
                    <tr
                      key={o.id}
                      onClick={() =>
                        setPeekData({
                          id: o.id,
                          orderNo: o.orderNo,
                          status: o.status,
                          targetQty: o.targetQty,
                          fabricRollId: o.fabricRollId,
                          actualFabricYds: o.actualFabricYds,
                          expectedFabricYds: o.expectedFabricYds,
                          wastagePct: o.wastagePct,
                          recipeName: o.recipe.name,
                          recipeCode: o.recipe.recipeCode,
                          wastageCap: o.recipe.wastageCap,
                          createdAt: o.createdAt,
                          submittedAt: o.submittedAt,
                          verifiedAt: o.verifiedAt,
                          lastRejectionReason: o.lastRejectionReason,
                          primaryActionHref: `/supervisor/orders/${o.id}`,
                          primaryActionLabel:
                            o.status === OrderStatus.CUTTING_IN_PROGRESS
                              ? "Edit draft order"
                              : "View full order",
                        })
                      }
                      className={`hover:bg-row-hover transition-colors cursor-pointer select-none ${
                        isSelected ? "bg-vat-tint/30" : ""
                      } ${isRejected ? "border-l-4 border-l-short-edge bg-short-bg/20" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className={`${cellPaddingClass} pl-3.5`} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectRow(o.id, e as any)}
                          aria-label={`Select order ${o.orderNo}`}
                          className="w-3.5 h-3.5 rounded-xs border-rule text-vat cursor-pointer"
                        />
                      </td>

                      {/* Order Number */}
                      <td className={`${cellPaddingClass} font-bold text-ink whitespace-nowrap`}>
                        <Link
                          href={`/supervisor/orders/${o.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline text-ink"
                        >
                          <OrderNo orderNo={o.orderNo} />
                        </Link>
                      </td>

                      {/* Recipe Name & Code */}
                      <td className={`${cellPaddingClass} text-ink whitespace-nowrap`}>
                        <span className="font-bold">{o.recipe.name}</span>{" "}
                        <span className="text-[11px] text-ink-soft font-mono">({o.recipe.recipeCode})</span>
                      </td>

                      {/* Target Qty */}
                      <td className={`${cellPaddingClass} text-right font-display font-bold tabular-nums text-ink`}>
                        {o.targetQty}
                      </td>

                      {/* Fabric Roll ID */}
                      <td className={`${cellPaddingClass} font-mono text-ink-soft whitespace-nowrap`}>
                        {o.fabricRollId}
                      </td>

                      {/* Fabric Yards */}
                      <td className={`${cellPaddingClass} text-right tabular-nums text-ink`}>
                        {o.actualFabricYds.toFixed(2)} yds
                      </td>

                      {/* Wastage */}
                      <td className={`${cellPaddingClass} text-right tabular-nums`}>
                        <span
                          className={`font-semibold ${
                            o.wastagePct > o.recipe.wastageCap
                              ? "text-excess-fg font-bold"
                              : "text-ink"
                          }`}
                        >
                          {o.wastagePct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Status Stamp */}
                      <td className={`${cellPaddingClass} whitespace-nowrap`}>
                        <Stamp status={o.status} />
                      </td>

                      {/* Row Actions */}
                      <td
                        className={`${cellPaddingClass} pr-4 text-right whitespace-nowrap`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {o.status === OrderStatus.CUTTING_IN_PROGRESS && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => handleSubmitSingle(e, o.id, o.orderNo)}
                              disabled={submitOrderMutation.isPending}
                              className="h-6.5 px-2 text-[11px] font-bold cursor-pointer"
                            >
                              Send to gate
                            </Button>
                          )}

                          {o.status === OrderStatus.REJECTED && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => handleRecutSingle(e, o.id, o.orderNo)}
                              disabled={recutOrderMutation.isPending}
                              className="h-6.5 px-2 text-[11px] font-bold border-short-edge text-short-fg hover:bg-short-bg cursor-pointer"
                            >
                              Re-cut
                            </Button>
                          )}

                          {o.status === OrderStatus.PENDING_VERIFICATION && (
                            <span className="text-[11px] text-ink-soft italic">
                              In verifier queue
                            </span>
                          )}

                          {o.status === OrderStatus.VERIFIED && (
                            <span className="text-[11px] text-match-fg font-bold">
                              ✓ Released
                            </span>
                          )}
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
              Loading cutting orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-soft">
              {searchQuery || selectedStatus !== "ALL" || selectedRecipeId !== "ALL"
                ? "No cutting orders matching active filters."
                : "No cutting orders found."}
            </div>
          ) : (
            orders.map((o) => {
              const isSelected = selectedIds.has(o.id);
              const isRejected = o.status === OrderStatus.REJECTED;

              return (
                <div
                  key={o.id}
                  onClick={() =>
                    setPeekData({
                      id: o.id,
                      orderNo: o.orderNo,
                      status: o.status,
                      targetQty: o.targetQty,
                      fabricRollId: o.fabricRollId,
                      actualFabricYds: o.actualFabricYds,
                      expectedFabricYds: o.expectedFabricYds,
                      wastagePct: o.wastagePct,
                      recipeName: o.recipe.name,
                      recipeCode: o.recipe.recipeCode,
                      wastageCap: o.recipe.wastageCap,
                      createdAt: o.createdAt,
                      submittedAt: o.submittedAt,
                      verifiedAt: o.verifiedAt,
                      lastRejectionReason: o.lastRejectionReason,
                      primaryActionHref: `/supervisor/orders/${o.id}`,
                      primaryActionLabel:
                        o.status === OrderStatus.CUTTING_IN_PROGRESS
                          ? "Edit draft order"
                          : "View full order",
                    })
                  }
                  className={`p-3.5 space-y-2.5 transition-colors cursor-pointer ${
                    isSelected ? "bg-vat-tint/30" : "bg-paper hover:bg-sheet/40"
                  } ${isRejected ? "border-l-4 border-l-short-edge bg-short-bg/15" : ""}`}
                >
                  {/* Card Header: Selection Checkbox + Order # + Status Stamp */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectRow(o.id, e as any)}
                          aria-label={`Select order ${o.orderNo}`}
                          className="w-4 h-4 rounded-xs border-rule text-vat cursor-pointer"
                        />
                      </div>
                      <Link
                        href={`/supervisor/orders/${o.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-ink hover:underline text-sm"
                      >
                        <OrderNo orderNo={o.orderNo} />
                      </Link>
                    </div>
                    <Stamp status={o.status} />
                  </div>

                  {/* Recipe & Roll Metadata */}
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="font-bold text-ink truncate">
                      {o.recipe.name}{" "}
                      <span className="font-mono text-[11px] text-ink-soft">({o.recipe.recipeCode})</span>
                    </div>
                    <span className="font-mono text-[11px] bg-sheet px-1.5 py-0.5 rounded border border-rule shrink-0">
                      Roll: {o.fabricRollId}
                    </span>
                  </div>

                  {/* Metrics 3-Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-sheet/40 p-2 rounded border border-rule/60 text-center">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Target Qty</div>
                      <div className="font-display font-bold text-sm text-ink">{o.targetQty}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Fabric</div>
                      <div className="font-mono text-xs font-bold text-ink">{o.actualFabricYds.toFixed(1)} yds</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Wastage</div>
                      <div
                        className={`font-mono text-xs font-bold ${
                          o.wastagePct > o.recipe.wastageCap ? "text-excess-fg" : "text-ink"
                        }`}
                      >
                        {o.wastagePct.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Rejection Alert Box */}
                  {isRejected && o.lastRejectionReason && (
                    <div className="text-xs p-2 rounded bg-short-bg border border-short-edge/40 text-short-fg">
                      <strong className="font-bold">Rejection Note: </strong>
                      {o.lastRejectionReason}
                    </div>
                  )}

                  {/* Bottom Actions */}
                  <div
                    className="flex items-center justify-between pt-1 border-t border-rule/40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={`/supervisor/orders/${o.id}`}
                      className="text-xs font-bold text-vat hover:underline"
                    >
                      {o.status === OrderStatus.CUTTING_IN_PROGRESS ? "Edit batch →" : "View batch →"}
                    </Link>

                    <div className="flex items-center gap-1.5">
                      {o.status === OrderStatus.CUTTING_IN_PROGRESS && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => handleSubmitSingle(e, o.id, o.orderNo)}
                          disabled={submitOrderMutation.isPending}
                          className="h-7 px-2.5 text-xs font-bold bg-vat text-paper hover:bg-vat/90"
                        >
                          Send to gate
                        </Button>
                      )}

                      {o.status === OrderStatus.REJECTED && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => handleRecutSingle(e, o.id, o.orderNo)}
                          disabled={recutOrderMutation.isPending}
                          className="h-7 px-2.5 text-xs font-bold border-short-edge text-short-fg hover:bg-short-bg"
                        >
                          Re-cut batch
                        </Button>
                      )}

                      {o.status === OrderStatus.PENDING_VERIFICATION && (
                        <span className="text-xs text-ink-soft italic">
                          In verifier queue
                        </span>
                      )}

                      {o.status === OrderStatus.VERIFIED && (
                        <span className="text-xs text-match-fg font-bold">
                          ✓ Released
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar - Default 10 rows */}
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={meta.total}
          totalPages={meta.totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[10, 20, 50]}
          itemLabel="cutting orders"
        />
      </div>

      {/* Floating Selection Bar for bulk actions */}
      <SelectionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          {
            label: "Send to verification",
            onClick: handleBulkSubmit,
            variant: "primary",
            icon: <Send className="w-3.5 h-3.5" />,
          },
          {
            label: "Export selected CSV",
            onClick: handleExportCSV,
            variant: "secondary",
            icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
          },
        ]}
      />

      {/* Modals & Slide-over Drawers */}
      <CreateOrderModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        recipes={recipes}
        onOrderCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["verificationQueue"] });
        }}
      />

      <PeekDrawer
        open={Boolean(peekData)}
        onOpenChange={(open) => {
          if (!open) setPeekData(null);
        }}
        data={peekData}
      />
    </div>
  );
}

export default function SupervisorOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">Loading cutting orders ledger...</div>}>
      <SupervisorOrdersContent />
    </Suspense>
  );
}
