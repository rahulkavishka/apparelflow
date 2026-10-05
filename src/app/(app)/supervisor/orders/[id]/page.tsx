"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IntegerInput } from "@/components/domain/IntegerInput";
import { Stamp } from "@/components/domain/Stamp";
import { Lamp } from "@/components/domain/Lamp";
import { toast } from "sonner";
import { OrderStatus, ItemStatus } from "@prisma/client";

interface OrderDetail {
  id: string;
  orderNo: string;
  status: OrderStatus;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  expectedFabricYds: number;
  wastagePct: number;
  recipe: {
    id: string;
    recipeCode: string;
    name: string;
    category: string;
    stdFabricYards: number;
    wastageCap: number;
  };
  items: {
    id: string;
    componentId: string;
    componentName: string;
    piecesPerGarment: number;
    imageUrl?: string | null;
    expectedQty: number;
    actualQty: number | null;
    status: ItemStatus | null;
    variance: number | null;
  }[];
  createdBy: {
    id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  submittedAt: string | null;
  verifiedAt: string | null;
  logs: {
    id: string;
    decision: string;
    rejectionNote: string | null;
    wastagePct: number;
    timestamp: string;
    verifier: {
      id: string;
      fullName: string;
    };
  }[];
}

export default function SupervisorOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit form state
  const [editQty, setEditQty] = useState<number | null>(null);
  const [editRollId, setEditRollId] = useState("");
  const [editFabricYds, setEditFabricYds] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/${resolvedParams.id}`);
      const json = await res.json();
      if (res.ok) {
        setOrder(json.data);
        setEditQty(json.data.targetQty);
        setEditRollId(json.data.fabricRollId);
        setEditFabricYds(json.data.actualFabricYds.toFixed(2));
      } else {
        toast.error(json.error?.message || "Failed to load order details");
      }
    } catch {
      toast.error("Failed to fetch order details");
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

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
      fetchOrder();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save order";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!order) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/submit`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to submit order");

      toast.success(`Cutting order ${order.orderNo} sent to verification.`);
      fetchOrder();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit order";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRecutOrder = async () => {
    if (!order) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/recut`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to initiate re-cut");

      toast.success(`Order ${order.orderNo} returned to cutting for re-cut.`);
      fetchOrder();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate re-cut";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-ink-soft">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-short-fg font-bold">Cutting order not found.</p>
        <Link href="/supervisor/orders">
          <Button variant="secondary">Back to orders</Button>
        </Link>
      </div>
    );
  }

  const isEditable = order.status === "CUTTING_IN_PROGRESS";
  const isRejected = order.status === "REJECTED";
  const latestRejectionLog = order.logs.find((l) => l.decision === "REJECTED");

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-rule pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold text-ink">
              {order.orderNo}
            </h1>
            <Stamp status={order.status} />
          </div>
          <p className="text-sm text-ink-soft mt-1">
            Created on {new Date(order.createdAt).toLocaleDateString()} by {order.createdBy.fullName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/supervisor/orders">
            <Button variant="secondary" size="sm">
              Back to orders
            </Button>
          </Link>
          {isEditable && (
            <Button
              variant="primary"
              size="sm"
              disabled={isUpdating}
              onClick={handleSubmitOrder}
            >
              Send to verification
            </Button>
          )}
          {isRejected && (
            <Button
              variant="secondary"
              size="sm"
              disabled={isUpdating}
              onClick={handleRecutOrder}
            >
              Re-cut batch
            </Button>
          )}
        </div>
      </div>

      {/* Rejection Alert Banner if Rejected */}
      {isRejected && latestRejectionLog && (
        <div
          role="alert"
          className="rounded-[4px] border-l-4 border-l-short-edge border border-rule bg-short-bg p-4 space-y-1"
        >
          <div className="text-sm font-bold text-short-fg">
            Verification rejected by {latestRejectionLog.verifier.fullName} on{" "}
            {new Date(latestRejectionLog.timestamp).toLocaleString()}
          </div>
          <p className="text-sm text-ink">
            <strong>Mandatory note:</strong> {latestRejectionLog.rejectionNote}
          </p>
          <p className="text-xs text-ink-soft pt-1">
            Click &quot;Re-cut batch&quot; above to reset item counts and begin the re-cutting process.
          </p>
        </div>
      )}

      {/* Two Column Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Metadata & Edit Form */}
        <div className="space-y-6 lg:col-span-1">
          {/* Metadata Definition List */}
          <div className="rounded-[4px] border border-rule bg-paper p-5 space-y-4">
            <h2 className="text-base font-bold text-ink border-b border-rule pb-2">
              Batch specification
            </h2>

            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Recipe</dt>
                <dd className="font-bold text-ink text-right">
                  {order.recipe.name} ({order.recipe.recipeCode})
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Target quantity</dt>
                <dd className="font-display text-lg font-bold tabular-nums text-ink">
                  {order.targetQty} garments
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Fabric roll</dt>
                <dd className="font-bold text-ink">{order.fabricRollId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Actual fabric used</dt>
                <dd className="font-bold tabular-nums text-ink">
                  {order.actualFabricYds.toFixed(2)} yds
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Expected fabric</dt>
                <dd className="tabular-nums text-ink">
                  {order.expectedFabricYds.toFixed(2)} yds
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Fabric wastage</dt>
                <dd
                  className={`font-bold tabular-nums ${
                    order.wastagePct > order.recipe.wastageCap
                      ? "text-excess-fg"
                      : "text-ink"
                  }`}
                >
                  {order.wastagePct.toFixed(2)}% (Cap: {order.recipe.wastageCap.toFixed(1)}%)
                </dd>
              </div>
            </dl>
          </div>

          {/* Editable Fields while in CUTTING_IN_PROGRESS */}
          {isEditable && (
            <div className="rounded-[4px] border border-rule bg-paper p-5 space-y-4">
              <h2 className="text-base font-bold text-ink border-b border-rule pb-2">
                Edit draft order
              </h2>
              <form onSubmit={handleSaveChanges} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-qty">Target quantity</Label>
                  <IntegerInput
                    id="edit-qty"
                    value={editQty}
                    onChange={setEditQty}
                    disabled={isUpdating}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-roll">Fabric roll ID</Label>
                  <Input
                    id="edit-roll"
                    type="text"
                    value={editRollId}
                    onChange={(e) => setEditRollId(e.target.value.toUpperCase())}
                    disabled={isUpdating}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-fabric">Actual fabric used (yds)</Label>
                  <Input
                    id="edit-fabric"
                    type="text"
                    value={editFabricYds}
                    onChange={(e) => setEditFabricYds(e.target.value)}
                    disabled={isUpdating}
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving..." : "Save changes"}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Component Ledger & Logs */}
        <div className="space-y-6 lg:col-span-2">
          {/* Component Pieces Ledger */}
          <div className="rounded-[4px] border border-rule bg-paper overflow-hidden">
            <div className="bg-sheet p-3.5 border-b border-rule">
              <h2 className="text-base font-bold text-ink">
                Component parts ledger
              </h2>
              <p className="text-xs text-ink-soft">
                Expected component counts derived dynamically from recipe multipliers.
              </p>
            </div>

            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-sheet border-b border-rule">
                <tr>
                  <th className="p-3 pl-4 font-bold text-ink-soft">Component</th>
                  <th className="p-3 text-right font-bold text-ink-soft">Per garment</th>
                  <th className="p-3 text-right font-bold text-ink-soft">Expected pieces</th>
                  <th className="p-3 text-right font-bold text-ink-soft">Counted pieces</th>
                  <th className="p-3 pr-4 font-bold text-ink-soft">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-row-hover">
                    <td className="p-3 pl-4 font-bold text-ink">
                      {item.componentName}
                    </td>
                    <td className="p-3 text-right tabular-nums text-ink-soft">
                      {item.piecesPerGarment}
                    </td>
                    <td className="p-3 text-right font-display text-lg font-bold tabular-nums text-ink">
                      {item.expectedQty}
                    </td>
                    <td className="p-3 text-right font-display text-lg font-bold tabular-nums text-ink">
                      {item.actualQty !== null ? item.actualQty : "—"}
                    </td>
                    <td className="p-3 pr-4">
                      <Lamp status={item.status} variance={item.variance ?? undefined} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Verification Audit Logs */}
          {order.logs.length > 0 && (
            <div className="rounded-[4px] border border-rule bg-paper p-5 space-y-3">
              <h2 className="text-base font-bold text-ink border-b border-rule pb-2">
                Verification history
              </h2>
              <div className="divide-y divide-rule">
                {order.logs.map((log) => (
                  <div key={log.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-ink">
                        {log.decision === "APPROVED" ? (
                          <span className="text-match-fg font-bold">Approved</span>
                        ) : (
                          <span className="text-short-fg font-bold">Rejected</span>
                        )}
                        {" by "}
                        {log.verifier.fullName}
                      </span>
                      <span className="text-xs text-ink-soft">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {log.rejectionNote && (
                      <p className="text-sm text-ink bg-sheet p-2.5 rounded-[4px] border border-rule">
                        <strong>Reason:</strong> {log.rejectionNote}
                      </p>
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
