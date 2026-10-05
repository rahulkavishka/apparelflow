"use client";

import React, { useState, use, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IntegerInput } from "@/components/domain/IntegerInput";
import { DecimalInput } from "@/components/domain/DecimalInput";
import { Stamp } from "@/components/domain/Stamp";
import { Lamp } from "@/components/domain/Lamp";
import { OrderNo } from "@/components/domain/OrderNo";
import { WastageScale } from "@/components/domain/WastageScale";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { OrderStatus, ItemStatus } from "@prisma/client";
import { useOrderDetail, useSubmitOrder, useRecutOrder } from "@/hooks/useOrders";
import { formatFactoryDateTime } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";

interface OrderItem {
  id: string;
  componentId: string;
  componentName: string;
  piecesPerGarment: number;
  imageUrl?: string | null;
  expectedQty: number;
  actualQty: number | null;
  status: ItemStatus | null;
  variance: number | null;
}

interface VerificationLog {
  id: string;
  decision: string;
  rejectionNote: string | null;
  wastagePct: number;
  timestamp: string;
  verifier: {
    id: string;
    fullName: string;
  };
}

export default function SupervisorOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const queryClient = useQueryClient();
  const { data: order, isLoading, error } = useOrderDetail(resolvedParams.id);
  const submitMutation = useSubmitOrder();
  const recutMutation = useRecutOrder();

  // Edit form state
  const [editQty, setEditQty] = useState<number | null>(null);
  const [editRollId, setEditRollId] = useState("");
  const [editFabricYds, setEditFabricYds] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (order) {
      setEditQty(order.targetQty);
      setEditRollId(order.fabricRollId);
      setEditFabricYds(order.actualFabricYds.toFixed(2));
    }
  }, [order]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!editQty || editQty <= 0) {
      toast.error("Target quantity must be 1 or more.");
      return;
    }
    const fabricNum = parseFloat(editFabricYds);
    if (Number.isNaN(fabricNum) || fabricNum <= 0) {
      toast.error("Enter fabric yards as a positive number.");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetQty: editQty,
          fabricRollId: editRollId.trim().toUpperCase(),
          actualFabricYds: fabricNum,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update order");

      toast.success("Order changes saved.");
      queryClient.invalidateQueries({ queryKey: ["orders", order.id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save order";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!order) return;
    try {
      await submitMutation.mutateAsync(order.id);
      toast.success(`Cutting order ${order.orderNo} submitted to verification gate.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit order";
      toast.error(msg);
    }
  };

  const handleRecutOrder = async () => {
    if (!order) return;
    try {
      await recutMutation.mutateAsync(order.id);
      toast.success(`Order ${order.orderNo} returned to cutting floor for re-cut.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate re-cut";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" label="Loading batch specification..." />
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
          <h2 className="text-base font-bold text-ink">Cutting order not found</h2>
          <p className="text-xs text-ink-soft mt-1">The requested order ID may have been removed or does not exist.</p>
        </div>
        <Link href="/supervisor/orders">
          <Button variant="secondary" size="sm">
            ← Back to orders ledger
          </Button>
        </Link>
      </div>
    );
  }

  const isEditable = order.status === "CUTTING_IN_PROGRESS";
  const isRejected = order.status === "REJECTED";
  const isVerified = order.status === "VERIFIED";
  const isPending = order.status === "PENDING_VERIFICATION";
  const latestRejectionLog = (order.logs as VerificationLog[] | undefined)?.find((l) => l.decision === "REJECTED");

  // Lifecycle steps definition
  const steps = [
    { label: "1. Cutting Draft", done: true, active: isEditable },
    { label: "2. Verification Queue", done: isPending || isVerified || isRejected, active: isPending },
    { label: "3. Gate Audit", done: isVerified, active: isRejected, failed: isRejected },
    { label: "4. Sewing Floor", done: isVerified, active: isVerified },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header bar with Back Link, Order ID, Stamp and Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-rule pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-ink tracking-tight flex items-center gap-2">
              <OrderNo orderNo={order.orderNo} />
            </h1>
            <Stamp status={order.status} />
          </div>

          <p className="text-xs text-ink-soft">
            Initiated on <span className="text-ink font-medium">{formatFactoryDateTime(order.createdAt)}</span> by{" "}
            <span className="text-ink font-medium">{order.createdBy?.fullName || "Supervisor"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/supervisor/orders">
            <Button variant="secondary" size="sm">
              Back to ledger
            </Button>
          </Link>

          {isEditable && (
            <Button
              variant="primary"
              size="sm"
              disabled={submitMutation.isPending || isUpdating}
              onClick={handleSubmitOrder}
              className="bg-vat hover:bg-vat/90 text-paper font-semibold"
            >
              {submitMutation.isPending ? "Sending..." : "Send to verification gate →"}
            </Button>
          )}

          {isRejected && (
            <Button
              variant="secondary"
              size="sm"
              disabled={recutMutation.isPending || isUpdating}
              onClick={handleRecutOrder}
              className="border-short-edge text-short-fg hover:bg-short-bg font-semibold"
            >
              {recutMutation.isPending ? "Initiating..." : "↺ Initiate Re-cut"}
            </Button>
          )}

          {isVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-match-bg border border-match-edge text-match-fg text-xs font-bold">
              ✓ Released to Sewing
            </span>
          )}
        </div>
      </div>

      {/* Lifecycle Progress Stepper */}
      <div className="bg-paper border border-rule rounded-[4px] p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {steps.map((step, idx) => {
            const isCompleted = step.done && !step.active && !step.failed;
            const isCurrent = step.active;
            const isAlert = step.failed;

            return (
              <div
                key={step.label}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-[3px] text-xs font-semibold border ${
                  isAlert
                    ? "bg-short-bg border-short-edge text-short-fg"
                    : isCurrent
                    ? "bg-sheet border-rule text-ink font-bold shadow-sm"
                    : isCompleted
                    ? "bg-paper border-rule/50 text-ink-soft"
                    : "bg-paper border-transparent text-ink-soft/40"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isAlert
                      ? "bg-short-fg text-paper"
                      : isCurrent
                      ? "bg-vat text-paper"
                      : isCompleted
                      ? "bg-ink-soft/20 text-ink"
                      : "bg-ink-soft/10 text-ink-soft/40"
                  }`}
                >
                  {isAlert ? "!" : isCompleted ? "✓" : idx + 1}
                </span>
                <span className="truncate">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rejection Alert Banner */}
      {isRejected && latestRejectionLog && (
        <div
          role="alert"
          className="rounded-[4px] border-l-4 border-l-short-edge border border-rule bg-short-bg p-4 space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-short-fg flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-short-fg animate-pulse" />
              Verification Rejected by {latestRejectionLog.verifier?.fullName || "Verifier"}
            </span>
            <span className="text-xs font-mono text-ink-soft">
              {formatFactoryDateTime(latestRejectionLog.timestamp)}
            </span>
          </div>
          <div className="text-sm text-ink bg-paper p-3 rounded-[3px] border border-short-edge/40">
            <span className="font-semibold text-short-fg">Mandatory note:</span>{" "}
            <span className="text-ink">{latestRejectionLog.rejectionNote}</span>
          </div>
          <p className="text-xs text-ink-soft pt-0.5">
            Click <strong>&quot;Initiate Re-cut&quot;</strong> in the header to reset component counts and begin the re-cutting process.
          </p>
        </div>
      )}

      {/* Two Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Batch Specification, Wastage Meter & Edit Form */}
        <div className="space-y-6 lg:col-span-1">
          {/* Batch Specification Card */}
          <div className="rounded-[4px] border border-rule bg-paper p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-rule pb-2.5">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                Batch Specification
              </h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-sheet text-ink border border-rule">
                {order.recipe.recipeCode}
              </span>
            </div>

            <dl className="space-y-3 text-sm divide-y divide-rule/60">
              <div className="flex justify-between pt-2 first:pt-0">
                <dt className="text-ink-soft">Garment Recipe</dt>
                <dd className="font-bold text-ink text-right">{order.recipe.name}</dd>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <dt className="text-ink-soft">Target Quantity</dt>
                <dd className="font-display text-xl font-bold tabular-nums text-ink">
                  {order.targetQty} <span className="text-xs font-normal text-ink-soft">units</span>
                </dd>
              </div>
              <div className="flex justify-between pt-2">
                <dt className="text-ink-soft">Fabric Roll ID</dt>
                <dd className="font-semibold text-ink font-mono">{order.fabricRollId}</dd>
              </div>
              <div className="flex justify-between pt-2">
                <dt className="text-ink-soft">Actual Fabric Used</dt>
                <dd className="font-bold tabular-nums text-ink">
                  {order.actualFabricYds.toFixed(2)} yds
                </dd>
              </div>
              <div className="flex justify-between pt-2">
                <dt className="text-ink-soft">Expected Fabric</dt>
                <dd className="tabular-nums text-ink-soft">
                  {order.expectedFabricYds.toFixed(2)} yds
                </dd>
              </div>
              <div className="flex justify-between pt-2">
                <dt className="text-ink-soft">Wastage Cap</dt>
                <dd className="font-mono text-xs font-semibold text-ink-soft">
                  {order.recipe.wastageCap.toFixed(1)}% max
                </dd>
              </div>
            </dl>
          </div>

          {/* Wastage Meter */}
          <WastageScale
            actualYds={order.actualFabricYds}
            expectedYds={order.expectedFabricYds}
            wastagePct={order.wastagePct}
            capPct={order.recipe.wastageCap}
          />

          {/* Editable Form for CUTTING_IN_PROGRESS */}
          {isEditable && (
            <div className="rounded-[4px] border border-rule bg-paper p-5 space-y-4">
              <div className="border-b border-rule pb-2">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                  Edit Cutting Inputs
                </h2>
                <p className="text-xs text-ink-soft">Adjust parameters before sending to verification.</p>
              </div>

              <form onSubmit={handleSaveChanges} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-qty" className="text-xs font-bold text-ink">
                    Target Quantity (Garments)
                  </Label>
                  <IntegerInput
                    id="edit-qty"
                    value={editQty}
                    onChange={setEditQty}
                    disabled={isUpdating}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-roll" className="text-xs font-bold text-ink">
                    Fabric Roll ID
                  </Label>
                  <Input
                    id="edit-roll"
                    type="text"
                    value={editRollId}
                    onChange={(e) => setEditRollId(e.target.value.toUpperCase())}
                    disabled={isUpdating}
                    className="font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-fabric" className="text-xs font-bold text-ink">
                    Actual Fabric Used (yards)
                  </Label>
                  <DecimalInput
                    id="edit-fabric"
                    value={editFabricYds}
                    onChange={(val) => setEditFabricYds(val)}
                    disabled={isUpdating}
                    className="font-mono h-8 text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full font-semibold"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving changes..." : "Save Draft Changes"}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Component Ledger & Verification Audit Trail */}
        <div className="space-y-6 lg:col-span-2">
          {/* Component Pieces Ledger */}
          <div className="rounded-[4px] border border-rule bg-paper overflow-hidden">
            <div className="bg-sheet px-4 py-3 border-b border-rule flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                  Component Parts Ledger
                </h2>
                <p className="text-xs text-ink-soft">
                  Multiplier: {order.targetQty} garments × recipe component pieces
                </p>
              </div>
              <span className="text-xs font-mono text-ink-soft bg-paper px-2 py-0.5 rounded border border-rule">
                {order.items?.length || 0} Components
              </span>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-sheet/50 border-b border-rule">
                  <tr>
                    <th className="py-2.5 px-4 font-bold text-ink-soft text-xs">Component</th>
                    <th className="py-2.5 px-3 text-right font-bold text-ink-soft text-xs">Per Garment</th>
                    <th className="py-2.5 px-3 text-right font-bold text-ink-soft text-xs">Expected Pieces</th>
                    <th className="py-2.5 px-3 text-right font-bold text-ink-soft text-xs">Counted Pieces</th>
                    <th className="py-2.5 px-4 text-right font-bold text-ink-soft text-xs">Gate Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {(order.items as OrderItem[] | undefined)?.map((item) => (
                    <tr key={item.id} className="hover:bg-row-hover transition-colors">
                      <td className="py-3 px-4 font-bold text-ink">
                        {item.componentName}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-ink-soft text-xs font-mono">
                        {item.piecesPerGarment}×
                      </td>
                      <td className="py-3 px-3 text-right font-display text-base font-bold tabular-nums text-ink">
                        {item.expectedQty}
                      </td>
                      <td className="py-3 px-3 text-right font-display text-base font-bold tabular-nums text-ink">
                        {item.actualQty !== null ? item.actualQty : <span className="text-ink-soft/40">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Lamp status={item.status} variance={item.variance ?? undefined} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Component Cards (< sm screens) */}
            <div className="sm:hidden divide-y divide-rule">
              {(order.items as OrderItem[] | undefined)?.map((item) => (
                <div key={item.id} className="p-3.5 space-y-2 bg-paper">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink text-sm">{item.componentName}</span>
                    <Lamp status={item.status} variance={item.variance ?? undefined} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-sheet/40 p-2 rounded border border-rule/60 text-center text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Multiplier</div>
                      <div className="font-mono font-bold text-ink">{item.piecesPerGarment}×</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Expected</div>
                      <div className="font-display font-bold text-ink text-sm">{item.expectedQty}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Counted</div>
                      <div className="font-display font-bold text-ink text-sm">
                        {item.actualQty !== null ? item.actualQty : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Audit Logs */}
          {((order.logs as VerificationLog[] | undefined)?.length ?? 0) > 0 && (
            <div className="rounded-[4px] border border-rule bg-paper p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-rule pb-2.5">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                  Verification History & Audit Trail
                </h2>
                <span className="text-xs font-mono text-ink-soft">
                  {(order.logs as VerificationLog[]).length} Record(s)
                </span>
              </div>

              <div className="divide-y divide-rule">
                {(order.logs as VerificationLog[]).map((log) => (
                  <div key={log.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {log.decision === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-match-bg border border-match-edge text-match-fg">
                            ✓ Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-short-bg border border-short-edge text-short-fg">
                            ✕ Rejected
                          </span>
                        )}
                        <span className="text-xs text-ink font-semibold">
                          by {log.verifier?.fullName || "Verifier"}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-ink-soft">
                        {formatFactoryDateTime(log.timestamp)}
                      </span>
                    </div>

                    {log.rejectionNote && (
                      <div className="text-xs text-ink bg-sheet p-3 rounded-[3px] border border-rule space-y-1">
                        <span className="font-bold text-short-fg">Verifier Note:</span>
                        <p className="text-ink">{log.rejectionNote}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
