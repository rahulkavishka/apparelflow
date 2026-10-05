"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderNo } from "@/components/domain/OrderNo";
import { RelativeTime } from "@/components/domain/RelativeTime";
import { KPICard } from "@/components/ui/KPICard";
import { FilterChips, FilterChipOption } from "@/components/ui/FilterChips";
import { Pagination } from "@/components/ui/Pagination";
import { DensityToggle, TableDensity } from "@/components/ui/DensityToggle";
import { TableLoadingRow } from "@/components/ui/LoadingSpinner";
import { AuditStub } from "@/components/domain/AuditStub";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVerificationHistory } from "@/hooks/useVerification";
import { Search, History, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";

export default function VerifierHistoryPage() {
  const [decisionFilter, setDecisionFilter] = useState<"ALL" | "APPROVED" | "REJECTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [density, setDensity] = useState<TableDensity>("compact");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSnapshotLog, setSelectedSnapshotLog] = useState<any | null>(null);

  const { data, isLoading, refetch } = useVerificationHistory({
    decision: decisionFilter,
    q: searchQuery ? searchQuery.trim() : undefined,
    page,
    pageSize,
  });

  const logs = data?.logs || [];
  const meta = data?.meta || {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    counts: { ALL: 0, APPROVED: 0, REJECTED: 0 },
  };

  const counts = meta.counts || { ALL: meta.total, APPROVED: 0, REJECTED: 0 };

  const handleDecisionChange = (val: "ALL" | "APPROVED" | "REJECTED") => {
    setDecisionFilter(val);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Verification audit trail refreshed.");
    } catch {
      toast.error("Failed to refresh audit trail.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const decisionOptions: FilterChipOption<"ALL" | "APPROVED" | "REJECTED">[] = [
    { value: "ALL", label: "All decisions", count: counts.ALL },
    { value: "APPROVED", label: "Approved only", count: counts.APPROVED, badgeVariant: "match" },
    { value: "REJECTED", label: "Rejected only", count: counts.REJECTED, badgeVariant: "short" },
  ];

  const cellPaddingClass = density === "compact" ? "py-2 px-3 text-xs" : "py-3.5 px-3.5 text-sm";
  const headerPaddingClass = density === "compact" ? "py-2 px-3 text-xs" : "py-3 px-3.5 text-xs";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Verification decision history
          </h1>
          <p className="text-xs text-ink-soft">
            Audit trail of quality gate approvals and rejections with immutable component count snapshots.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className="h-8 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <History className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-vat" : ""}`} />
          <span>Refresh log</span>
        </Button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KPICard
          title="Recorded decisions"
          value={counts.ALL}
          subtitle="Signed gatekeeper reviews"
          icon={<History className="w-4 h-4" />}
        />
        <KPICard
          title="Approved batches"
          value={counts.APPROVED}
          subtitle="Passed to sewing assembly"
          variant="match"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <KPICard
          title="Rejected batches"
          value={counts.REJECTED}
          subtitle="Returned for re-cutting"
          variant={counts.REJECTED > 0 ? "short" : "default"}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
      </div>

      {/* Decision Filter Chips */}
      <FilterChips
        options={decisionOptions}
        selectedValue={decisionFilter}
        onSelect={handleDecisionChange}
      />

      {/* Search & Tooling Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-paper p-2.5 rounded-xs border border-rule">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-ink-soft absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search audit trail by Order #, Roll ID, or Style..."
            className="pl-8 h-8 text-xs bg-sheet/40"
          />
        </div>

        <div className="hidden md:flex items-center gap-2 self-end sm:self-auto">
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      </div>

      {/* History Data Table (Desktop) & Responsive Cards (Mobile) */}
      <div className="border border-rule rounded-xs bg-paper overflow-hidden shadow-none">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-sheet border-b border-rule">
              <tr>
                <th className={`${headerPaddingClass} pl-4 font-bold text-ink-soft`}>Order</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Recipe</th>
                <th className={`${headerPaddingClass} text-right font-bold text-ink-soft`}>Batch qty</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Fabric roll</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Decision</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Verified by</th>
                <th className={`${headerPaddingClass} font-bold text-ink-soft`}>Timestamp</th>
                <th className={`${headerPaddingClass} pr-4 text-right font-bold text-ink-soft`}>Audit snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {isLoading ? (
                <TableLoadingRow colSpan={8} label="Loading verification history..." />
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-ink-soft">
                    {searchQuery || decisionFilter !== "ALL"
                      ? "No verification logs match the active filter."
                      : "No verification decisions recorded yet."}
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => {
                  const isApproved = log.decision === "APPROVED";

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-row-hover transition-colors"
                    >
                      <td className={`${cellPaddingClass} pl-4 font-bold text-ink whitespace-nowrap`}>
                        <OrderNo orderNo={log.orderNo} />
                      </td>

                      <td className={`${cellPaddingClass} text-ink whitespace-nowrap`}>
                        <span className="font-bold">{log.recipe.name}</span>{" "}
                        <span className="text-[11px] text-ink-soft">({log.recipe.recipeCode})</span>
                      </td>

                      <td className={`${cellPaddingClass} text-right font-display text-sm font-bold tabular-nums text-ink`}>
                        {log.targetQty}
                      </td>

                      <td className={`${cellPaddingClass} font-bold text-ink whitespace-nowrap`}>
                        {log.fabricRollId}
                      </td>

                      {/* Decision Badge */}
                      <td className={`${cellPaddingClass} whitespace-nowrap`}>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-xs font-bold text-[11px] ${
                            isApproved
                              ? "bg-match-bg text-match-fg border border-match-edge/60"
                              : "bg-short-bg text-short-fg border border-short-edge/60"
                          }`}
                        >
                          {isApproved ? "Approved" : "Rejected"}
                        </span>
                      </td>

                      <td className={`${cellPaddingClass} font-bold text-ink whitespace-nowrap`}>
                        {log.verifier?.fullName || "—"}
                      </td>

                      <td className={`${cellPaddingClass} text-ink-soft whitespace-nowrap`}>
                        <RelativeTime value={log.timestamp} />
                      </td>

                      <td className={`${cellPaddingClass} pr-4 text-right whitespace-nowrap`}>
                        <div className="flex items-center justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedSnapshotLog(log)}
                            className="h-7 text-xs px-2.5 font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect stub</span>
                          </Button>
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
              Loading verification history...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-soft">
              {searchQuery || decisionFilter !== "ALL"
                ? "No verification logs match the active filter."
                : "No verification decisions recorded yet."}
            </div>
          ) : (
            logs.map((log: any) => {
              const isApproved = log.decision === "APPROVED";

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedSnapshotLog(log)}
                  className={`p-3.5 space-y-2.5 transition-colors cursor-pointer ${
                    isApproved ? "bg-paper hover:bg-sheet/40" : "bg-short-bg/15 border-l-4 border-l-short-edge"
                  }`}
                >
                  {/* Card Header: Order # + Decision Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <OrderNo orderNo={log.orderNo} />
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-xs font-bold text-[11px] ${
                        isApproved
                          ? "bg-match-bg text-match-fg border border-match-edge/60"
                          : "bg-short-bg text-short-fg border border-short-edge/60"
                      }`}
                    >
                      {isApproved ? "Approved" : "Rejected"}
                    </span>
                  </div>

                  {/* Recipe & Roll */}
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="font-bold text-ink truncate">
                      {log.recipe.name}{" "}
                      <span className="font-mono text-[11px] text-ink-soft">({log.recipe.recipeCode})</span>
                    </div>
                    <span className="font-mono text-[11px] bg-sheet px-1.5 py-0.5 rounded border border-rule shrink-0">
                      Roll: {log.fabricRollId}
                    </span>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-sheet/40 p-2 rounded border border-rule/60 text-center">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Batch Qty</div>
                      <div className="font-display font-bold text-sm text-ink">{log.targetQty}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Verified By</div>
                      <div className="text-xs font-bold text-ink truncate px-1">{log.verifier?.fullName || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Time</div>
                      <div className="text-[11px] text-ink-soft mt-0.5">
                        <RelativeTime value={log.timestamp} />
                      </div>
                    </div>
                  </div>

                  {/* Rejection Note */}
                  {!isApproved && log.rejectionNote && (
                    <div className="text-xs p-2 rounded bg-short-bg border border-short-edge/40 text-short-fg">
                      <strong className="font-bold">Reason: </strong>
                      {log.rejectionNote}
                    </div>
                  )}

                  {/* Card Action */}
                  <div className="flex items-center justify-between pt-1 border-t border-rule/40">
                    <span className="text-xs text-ink-soft">Snapshot stub</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSnapshotLog(log);
                      }}
                      className="h-7 text-xs px-2.5 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect stub</span>
                    </Button>
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
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Snapshot Inspection Modal */}
      {selectedSnapshotLog && (
        <Dialog
          open={Boolean(selectedSnapshotLog)}
          onOpenChange={(open) => !open && setSelectedSnapshotLog(null)}
        >
          <DialogContent className="max-w-140 p-5 shadow-2xl rounded-sm border border-rule">
            <DialogHeader className="border-b border-rule pb-2.5">
              <DialogTitle className="text-base font-bold text-ink flex items-center justify-between">
                <span>Verification Audit Snapshot: {selectedSnapshotLog.orderNo}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="pt-2">
              <AuditStub
                decision={selectedSnapshotLog.decision}
                verifierName={selectedSnapshotLog.verifier.fullName}
                timestamp={selectedSnapshotLog.timestamp}
                wastagePct={Number(selectedSnapshotLog.wastagePct ?? 0)}
                capPct={Number(selectedSnapshotLog.recipe.wastageCap ?? 0)}
                rejectionNote={selectedSnapshotLog.rejectionNote}
                items={
                  Array.isArray(selectedSnapshotLog.varianceSnapshot)
                    ? selectedSnapshotLog.varianceSnapshot.map((i: any) => ({
                        componentId: i.componentId || i.name,
                        name: i.name,
                        expected: i.expected,
                        actual: i.actual,
                        variance: i.variance,
                        status: i.status,
                      }))
                    : []
                }
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
