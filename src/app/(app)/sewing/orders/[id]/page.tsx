"use client";

import React, { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/domain/Stamp";
import { Lamp } from "@/components/domain/Lamp";
import { OrderNo } from "@/components/domain/OrderNo";
import { AuditStub, AuditSnapshotItem } from "@/components/domain/AuditStub";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { useSewingOrderDetail, useStartSewing } from "@/hooks/useSewing";
import { OrderStatus } from "@prisma/client";
import { formatFactoryDateTime } from "@/lib/format";

export default function SewingOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data: order, isLoading, error } = useSewingOrderDetail(resolvedParams.id);
  const startSewingMutation = useStartSewing(resolvedParams.id);

  const handleStartAssembly = async () => {
    if (!order) return;
    try {
      await startSewingMutation.mutateAsync();
      toast.success(`Sewing assembly started for bundle ${order.orderNo}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start sewing assembly";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" label="Loading verified traveler specification..." />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-[4px] border border-rule bg-paper p-10 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="h-10 w-10 mx-auto rounded-full bg-short-bg border border-short-edge flex items-center justify-center text-short-fg font-bold">
          !
        </div>
        <div>
          <h2 className="text-base font-bold text-ink">Verified order not found</h2>
          <p className="text-xs text-ink-soft mt-1">This order may still be pending verification or does not exist.</p>
        </div>
        <Link href="/sewing/queue">
          <Button variant="secondary" size="sm">
            ← Back to sewing floor queue
          </Button>
        </Link>
      </div>
    );
  }

  const isInAssembly = Boolean(order.sewingStartedAt);

  const snapshotItems: AuditSnapshotItem[] = order.items.map((item) => ({
    componentId: item.componentId,
    name: item.name,
    piecesPerGarment: item.piecesPerGarment,
    expected: item.expected,
    actual: item.actual,
    variance: item.variance,
    status: item.status,
  }));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header with breadcrumb, traveler tag, stamps, and primary start trigger */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-rule pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-ink tracking-tight flex items-center gap-2">
              <OrderNo orderNo={order.orderNo} />
            </h1>
            {isInAssembly ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-xs font-bold bg-vat text-paper">
                <span className="h-2 w-2 rounded-full bg-paper animate-pulse" />
                In Assembly
              </span>
            ) : (
              <Stamp status={OrderStatus.VERIFIED} />
            )}
          </div>

          <p className="text-xs text-ink-soft">
            Verified cutting bundle released for sewing line assembly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/sewing/queue">
            <Button variant="secondary" size="sm">
              Back to queue
            </Button>
          </Link>

          {!isInAssembly && (
            <Button
              variant="primary"
              size="sm"
              disabled={startSewingMutation.isPending}
              onClick={handleStartAssembly}
              className="bg-vat hover:bg-vat/90 text-paper font-semibold"
            >
              {startSewingMutation.isPending ? "Starting..." : "Start Assembly →"}
            </Button>
          )}
        </div>
      </div>

      {/* Assembly Status Ribbon if Started */}
      {isInAssembly && (
        <div className="rounded-[4px] border border-rule bg-match-bg/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-match-fg shrink-0" />
            <div className="text-xs text-ink">
              <span className="font-bold text-match-fg">Assembly Active:</span> Started by{" "}
              <strong>{order.sewingStartedBy?.fullName || "Floor Operator"}</strong> on{" "}
              <span className="font-mono font-medium">{formatFactoryDateTime(order.sewingStartedAt)}</span>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-ink-soft uppercase px-2 py-0.5 rounded bg-paper border border-rule">
            Floor Line Released
          </span>
        </div>
      )}

      {/* Two Column Layout (Batch Specification vs Verification Audit Stub) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Batch Specification */}
        <div className="rounded-[4px] border border-rule bg-paper p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-2.5">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              Batch Traveler Specification
            </h2>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-sheet text-ink border border-rule">
              {order.recipe.recipeCode}
            </span>
          </div>

          <dl className="space-y-3 text-sm divide-y divide-rule/60">
            <div className="flex justify-between items-baseline pt-2 first:pt-0">
              <dt className="text-ink-soft">Garment Recipe</dt>
              <dd className="font-bold text-ink text-right">{order.recipe.name}</dd>
            </div>

            <div className="flex justify-between items-baseline pt-2">
              <dt className="text-ink-soft">Target Bundle Quantity</dt>
              <dd className="font-display text-2xl font-bold tabular-nums text-ink">
                {order.targetQty} <span className="text-xs font-normal text-ink-soft">garments</span>
              </dd>
            </div>

            <div className="flex justify-between items-baseline pt-2">
              <dt className="text-ink-soft">Fabric Roll ID</dt>
              <dd className="font-semibold text-ink font-mono">{order.fabricRollId}</dd>
            </div>

            <div className="flex justify-between items-baseline pt-2">
              <dt className="text-ink-soft">Actual Fabric Used</dt>
              <dd className="font-bold tabular-nums text-ink">
                {order.actualFabricYds.toFixed(2)} yds
              </dd>
            </div>

            <div className="flex justify-between items-baseline pt-2">
              <dt className="text-ink-soft">Expected Fabric</dt>
              <dd className="tabular-nums text-ink-soft">
                {order.expectedFabricYds.toFixed(2)} yds
              </dd>
            </div>

            <div className="flex justify-between items-baseline pt-2">
              <dt className="text-ink-soft">Gatekeeper Quality Audit</dt>
              <dd className="text-xs font-semibold text-ink">
                {order.rejectionHistoryCount > 0
                  ? `Re-cut ${order.rejectionHistoryCount} time(s) prior to approval`
                  : "Verified on initial cutting bundle"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Right Column: Signature Audit Stub (DESIGN.md Section 8.5) */}
        <div>
          <AuditStub
            decision="APPROVED"
            verifierName={order.verifier?.fullName || "Not recorded"}
            timestamp={order.verifiedAt || "Not recorded"}
            wastagePct={order.wastagePct}
            capPct={order.recipe.wastageCap}
            items={snapshotItems}
          />
        </div>
      </div>

      {/* Verified Component Pieces Breakdown */}
      <div className="rounded-[4px] border border-rule bg-paper overflow-hidden">
        <div className="bg-sheet px-4 py-3 border-b border-rule flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              Verified Component Parts Inventory
            </h2>
            <p className="text-xs text-ink-soft">
              Physical counts signed and released at the cutting verification gate.
            </p>
          </div>
          <span className="text-xs font-mono text-ink-soft bg-paper px-2 py-0.5 rounded border border-rule">
            {order.items?.length || 0} Components Verified
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-sheet/50 border-b border-rule">
              <tr>
                <th className="py-2.5 px-4 font-bold text-ink-soft text-xs">Component Part</th>
                <th className="py-2.5 px-3 text-right font-bold text-ink-soft text-xs">Expected Pieces</th>
                <th className="py-2.5 px-3 text-right font-bold text-ink-soft text-xs">Counted Pieces</th>
                <th className="py-2.5 px-3 text-right font-bold text-ink-soft text-xs">Variance</th>
                <th className="py-2.5 px-4 text-right font-bold text-ink-soft text-xs">Gate Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {order.items.map((item) => (
                <tr key={item.componentId} className="hover:bg-row-hover transition-colors">
                  <td className="py-3 px-4 font-bold text-ink">{item.name}</td>
                  <td className="py-3 px-3 text-right font-display text-base font-bold tabular-nums text-ink-soft">
                    {item.expected}
                  </td>
                  <td className="py-3 px-3 text-right font-display text-base font-bold tabular-nums text-ink">
                    {item.actual ?? "—"}
                  </td>
                  <td className="py-3 px-3 text-right font-display text-base font-bold tabular-nums text-ink">
                    {item.variance !== null
                      ? item.variance > 0
                        ? `+${item.variance}`
                        : item.variance
                      : "0"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Lamp
                      status={
                        item.status === "MATCH"
                          ? "GREEN"
                          : item.status === "EXCESS"
                          ? "YELLOW"
                          : item.status === "SHORT"
                          ? "RED"
                          : null
                      }
                      variance={item.variance ?? undefined}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Component Cards (< sm screens) */}
        <div className="sm:hidden divide-y divide-rule">
          {order.items.map((item) => (
            <div key={item.componentId} className="p-3.5 space-y-2 bg-paper">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink text-sm">{item.name}</span>
                <Lamp
                  status={
                    item.status === "MATCH"
                      ? "GREEN"
                      : item.status === "EXCESS"
                      ? "YELLOW"
                      : item.status === "SHORT"
                      ? "RED"
                      : null
                  }
                  variance={item.variance ?? undefined}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 bg-sheet/40 p-2 rounded border border-rule/60 text-center text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-ink-soft">Expected</div>
                  <div className="font-display font-bold text-ink text-sm">{item.expected}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-ink-soft">Counted</div>
                  <div className="font-display font-bold text-ink text-sm">{item.actual ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-ink-soft">Variance</div>
                  <div className="font-display font-bold text-sm">
                    {item.variance !== null ? (
                      item.variance > 0 ? (
                        <span className="text-excess-fg font-bold">+{item.variance}</span>
                      ) : item.variance < 0 ? (
                        <span className="text-short-fg font-bold">{item.variance}</span>
                      ) : (
                        <span className="text-match-fg font-bold">0</span>
                      )
                    ) : (
                      "0"
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assembly Action Banner */}
      {!isInAssembly && (
        <div className="rounded-[4px] border border-rule bg-paper p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-ink">
              Ready for sewing floor assembly
            </h3>
            <p className="text-xs text-ink-soft">
              All bundles have been verified. Click below to initiate sewing operations for batch {order.orderNo}.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={handleStartAssembly}
            disabled={startSewingMutation.isPending}
            className="h-11 px-6 text-sm font-bold shrink-0 bg-vat hover:bg-vat/90 text-paper"
          >
            {startSewingMutation.isPending ? "Starting assembly..." : "Start Sewing Assembly"}
          </Button>
        </div>
      )}
    </div>
  );
}
