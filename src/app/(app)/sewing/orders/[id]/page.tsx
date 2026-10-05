"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/domain/Stamp";
import { Lamp } from "@/components/domain/Lamp";
import { AuditStub, AuditSnapshotItem } from "@/components/domain/AuditStub";
import { toast } from "sonner";
import { SewingOrderDetailDto } from "@/services/sewing.service";
import { OrderStatus } from "@prisma/client";

export default function SewingOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [order, setOrder] = useState<SewingOrderDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sewing/orders/${resolvedParams.id}`);
      const json = await res.json();
      if (res.ok) {
        setOrder(json.data);
      } else {
        toast.error(json.error?.message || "Verified cutting order not found.");
      }
    } catch {
      toast.error("Network error loading sewing order details.");
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStartAssembly = async () => {
    if (!order) return;
    setIsStarting(true);
    try {
      const res = await fetch(`/api/sewing/orders/${order.id}/start`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to start sewing assembly.");
      }

      toast.success("Sewing assembly started.");
      fetchOrder();
    } catch (err: any) {
      toast.error(err.message || "Failed to start sewing assembly.");
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-ink-soft">
        Loading verified batch specification...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-short-fg font-bold">
          Verified cutting order not found in sewing queue.
        </p>
        <Link href="/sewing/queue">
          <Button variant="secondary">Back to sewing queue</Button>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-rule pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold text-ink">
              {order.orderNo}
            </h1>
            {isInAssembly ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-[2px] text-xs font-bold bg-vat text-paper">
                In assembly
              </span>
            ) : (
              <Stamp status={OrderStatus.VERIFIED} />
            )}
          </div>
          <p className="text-sm text-ink-soft mt-1">
            Verified cutting bundle released for sewing floor assembly.
          </p>
        </div>

        <Link href="/sewing/queue">
          <Button variant="secondary" size="sm">
            Back to sewing queue
          </Button>
        </Link>
      </div>

      {/* Two Column Layout (Definition list on left, Audit stub on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Metadata */}
        <div className="rounded-[4px] border border-rule bg-paper p-5 space-y-4">
          <h2 className="text-base font-bold text-ink border-b border-rule pb-2">
            Batch specification
          </h2>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between items-baseline">
              <dt className="text-ink-soft font-medium">Recipe</dt>
              <dd className="font-bold text-ink text-right">
                {order.recipe.name} ({order.recipe.recipeCode})
              </dd>
            </div>

            <div className="flex justify-between items-baseline">
              <dt className="text-ink-soft font-medium">Target batch quantity</dt>
              <dd className="font-display text-2xl font-bold tabular-nums text-ink">
                {order.targetQty} garments
              </dd>
            </div>

            <div className="flex justify-between items-baseline">
              <dt className="text-ink-soft font-medium">Fabric roll ID</dt>
              <dd className="font-bold text-ink font-mono">{order.fabricRollId}</dd>
            </div>

            <div className="flex justify-between items-baseline">
              <dt className="text-ink-soft font-medium">Actual fabric used</dt>
              <dd className="font-bold tabular-nums text-ink">
                {order.actualFabricYds.toFixed(2)} yds
              </dd>
            </div>

            <div className="flex justify-between items-baseline">
              <dt className="text-ink-soft font-medium">Expected fabric</dt>
              <dd className="tabular-nums text-ink-soft">
                {order.expectedFabricYds.toFixed(2)} yds
              </dd>
            </div>

            <div className="flex justify-between items-baseline border-t border-rule pt-2">
              <dt className="text-ink-soft font-medium">Gatekeeper quality review</dt>
              <dd className="text-xs font-semibold text-ink">
                {order.rejectionHistoryCount > 0
                  ? `Re-cut ${order.rejectionHistoryCount} time(s) prior to approval`
                  : "Verified on initial cutting table bundle"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Right Column: Signature Audit Stub (DESIGN.md Section 8.5) */}
        <div>
          <AuditStub
            decision="APPROVED"
            verifierName={order.verifier?.fullName || "Verified Staff"}
            timestamp={order.verifiedAt || new Date().toISOString()}
            wastagePct={order.wastagePct}
            capPct={order.recipe.wastageCap}
            items={snapshotItems}
          />
        </div>
      </div>

      {/* Verified Component Pieces Breakdown */}
      <div className="rounded-[4px] border border-rule bg-paper overflow-hidden">
        <div className="bg-sheet p-3.5 border-b border-rule">
          <h2 className="text-base font-bold text-ink">
            Verified component parts inventory
          </h2>
          <p className="text-xs text-ink-soft">
            Physical counts and variances recorded and immutably signed at the cutting verification gate.
          </p>
        </div>

        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-sheet border-b border-rule">
            <tr>
              <th className="p-3 pl-4 font-bold text-ink-soft">Component</th>
              <th className="p-3 text-right font-bold text-ink-soft">Expected pieces</th>
              <th className="p-3 text-right font-bold text-ink-soft">Counted pieces</th>
              <th className="p-3 text-right font-bold text-ink-soft">Variance</th>
              <th className="p-3 pr-4 font-bold text-ink-soft">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {order.items.map((item) => (
              <tr key={item.componentId} className="hover:bg-row-hover">
                <td className="p-3 pl-4 font-bold text-ink">{item.name}</td>
                <td className="p-3 text-right font-display text-lg font-bold tabular-nums text-ink-soft">
                  {item.expected}
                </td>
                <td className="p-3 text-right font-display text-lg font-bold tabular-nums text-ink">
                  {item.actual ?? "—"}
                </td>
                <td className="p-3 text-right font-display text-lg font-bold tabular-nums text-ink">
                  {item.variance !== null
                    ? item.variance > 0
                      ? `+${item.variance}`
                      : item.variance
                    : "0"}
                </td>
                <td className="p-3 pr-4">
                  <Lamp
                    status={
                      item.status === "MATCH"
                        ? "GREEN"
                        : item.status === "EXCESS"
                        ? "YELLOW"
                        : item.status === "SHORT"
                        ? "RED"
                        : "GREEN"
                    }
                    variance={item.variance ?? undefined}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assembly Action Banner (DESIGN.md Section 10.5) */}
      <div className="rounded-[4px] border border-rule bg-paper p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {isInAssembly ? (
          <div className="text-sm font-semibold text-ink">
            Sewing started by{" "}
            <strong>{order.sewingStartedBy?.fullName || "Operator"}</strong> on{" "}
            {new Date(order.sewingStartedAt!).toLocaleString()}.
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-base font-bold text-ink">
                Ready for sewing floor assembly
              </h3>
              <p className="text-xs text-ink-soft">
                All bundles have been verified. Click below to begin assembly on the sewing line.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={handleStartAssembly}
              disabled={isStarting}
              className="h-12 px-6 text-base font-bold shrink-0"
            >
              {isStarting ? "Starting assembly..." : "Start Sewing Assembly"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
