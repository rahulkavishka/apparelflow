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
import { AuditStub, AuditSnapshotItem } from "@/components/domain/AuditStub";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVerificationHistory } from "@/hooks/useVerification";
import { Search, History, CheckCircle2, AlertTriangle, FileText, Eye } from "lucide-react";
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
  };

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

  const approvedCount = logs.filter((l: any) => l.decision === "APPROVED").length;
  const rejectedCount = logs.filter((l: any) => l.decision === "REJECTED").length;

  const decisionOptions: FilterChipOption<"ALL" | "APPROVED" | "REJECTED">[] = [
    { value: "ALL", label: "All decisions", count: meta.total },
    { value: "APPROVED", label: "Approved only", count: approvedCount, badgeVariant: "match" },
    { value: "REJECTED", label: "Rejected only", count: rejectedCount, badgeVariant: "short" },
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
          value={meta.total}
          subtitle="Signed gatekeeper reviews"
          icon={<History className="w-4 h-4" />}
        />
        <KPICard
          title="Approved batches"
          value={approvedCount}
          subtitle="Passed to sewing assembly"
          variant="match"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <KPICard
          title="Rejected batches"
          value={rejectedCount}
          subtitle="Returned for re-cutting"
          variant={rejectedCount > 0 ? "short" : "default"}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-paper p-2.5 rounded-[2px] border border-rule">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-ink-soft absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search audit trail by Order #, Roll ID, or Style..."
            className="pl-8 h-8 text-xs bg-sheet/40"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      </div>

      {/* History Data Table */}
      <div className="border border-rule rounded-[2px] bg-paper overflow-hidden shadow-none">
        <div className="overflow-x-auto">
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
                          className={`inline-flex items-center px-2 py-0.5 rounded-[2px] font-bold text-[11px] ${
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
          <DialogContent className="max-w-[560px] p-5 shadow-2xl rounded-[4px] border border-rule">
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
