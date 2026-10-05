"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IntegerInput } from "@/components/domain/IntegerInput";
import { Lamp } from "@/components/domain/Lamp";
import { Stamp } from "@/components/domain/Stamp";
import { GateStrip } from "@/components/domain/GateStrip";
import { WastageScale } from "@/components/domain/WastageScale";
import { RejectOrderModal } from "@/components/domain/RejectOrderModal";
import { evaluateTrafficLight, evaluateVerificationBatch } from "@/domain/traffic-light";
import { toast } from "sonner";
import { VerificationOrderDto } from "@/services/verification.service";

export default function VerificationTerminalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [data, setData] = useState<VerificationOrderDto | null>(null);
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [serverBlockerError, setServerBlockerError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/verification/orders/${resolvedParams.id}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
        // Initialize local counts from server data
        const initialCounts: Record<string, number | null> = {};
        for (const item of json.data.items) {
          initialCounts[item.componentId] = item.actualQty;
        }
        setCounts(initialCounts);
      } else {
        toast.error(json.error?.message || "Failed to load order for verification.");
      }
    } catch {
      toast.error("Network error loading verification terminal.");
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-ink-soft">
        Opening Verification Terminal...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-short-fg font-bold">Cutting order not found or not in verification queue.</p>
        <Link href="/verifier/queue">
          <Button variant="secondary">Back to queue</Button>
        </Link>
      </div>
    );
  }

  const { order, items, summary: serverSummary } = data;

  // Derive live local evaluation from current input state
  const liveItemsForEval = items.map((item) => ({
    componentId: item.componentId,
    componentName: item.name,
    expectedQty: item.expectedQty,
    actualQty: counts[item.componentId] !== undefined ? counts[item.componentId] : item.actualQty,
  }));

  const localEvaluation = evaluateVerificationBatch(liveItemsForEval);

  // Check if local inputs differ from persisted server state
  const isDirty = items.some(
    (item) => counts[item.componentId] !== item.actualQty
  );

  // Approve Batch button rule (DESIGN.md Section 2.3 & 8.1):
  // The server decides; Approve is enabled only when server-confirmed summary allows it AND local state is not dirty/unpersisted.
  const canApprove = serverSummary.canApprove && !isDirty && localEvaluation.canApprove;

  const handleCountChange = (componentId: string, val: number | null) => {
    setCounts((prev) => ({ ...prev, [componentId]: val }));
    setServerBlockerError(null);
  };

  const handleSaveCounts = async () => {
    setIsSaving(true);
    setServerBlockerError(null);
    try {
      const payload = {
        counts: Object.entries(counts)
          .filter(([_, val]) => val !== null && val !== undefined)
          .map(([componentId, actualQty]) => ({
            componentId,
            actualQty: actualQty!,
          })),
      };

      if (payload.counts.length === 0) {
        toast.error("Enter at least one component count before saving.");
        return;
      }

      const res = await fetch(`/api/verification/orders/${order.id}/counts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to save counts.");
      }

      setData(json.data);
      toast.success("Component counts saved and verified.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save counts.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveBatch = async () => {
    setIsApproving(true);
    setServerBlockerError(null);
    try {
      const res = await fetch(`/api/verification/orders/${order.id}/approve`, {
        method: "POST",
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 422) {
          const detailMsg =
            json.error?.details?.components?.[0]?.message ||
            json.error?.details?.blockers?.[0]?.message ||
            json.error?.message;
          setServerBlockerError(detailMsg);
          throw new Error(detailMsg);
        }
        throw new Error(json.error?.message || "Approval failed.");
      }

      toast.success(`Cutting order ${order.orderNo} successfully verified and released to sewing!`);
      router.push("/verifier/queue");
    } catch (err: any) {
      toast.error(err.message || "Approval rejected by server gate.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectConfirm = async (note: string) => {
    const res = await fetch(`/api/verification/orders/${order.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Failed to reject batch.");
    }

    toast.success(`Order ${order.orderNo} rejected and returned to supervisor for re-cutting.`);
    router.push("/verifier/queue");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-rule pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold text-ink">
              {order.orderNo}
            </h1>
            <Stamp status={order.status} />
          </div>

          {/* Metadata Definition List (DESIGN.md Section 6.3) */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs mt-3">
            <div>
              <dt className="text-ink-soft">Recipe</dt>
              <dd className="font-bold text-ink">
                {order.recipe.name} ({order.recipe.recipeCode})
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Target batch qty</dt>
              <dd className="font-display text-base font-bold tabular-nums text-ink">
                {order.targetQty} garments
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Fabric roll</dt>
              <dd className="font-bold text-ink">{order.fabricRollId}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Actual fabric used</dt>
              <dd className="font-bold tabular-nums text-ink">
                {order.actualFabricYds.toFixed(2)} yds
              </dd>
            </div>
          </dl>
        </div>

        <Link href="/verifier/queue">
          <Button variant="secondary" size="sm">
            Back to queue
          </Button>
        </Link>
      </div>

      {/* Signature Gate Strip (DESIGN.md Section 8.1) */}
      <GateStrip
        evaluation={localEvaluation}
        serverCanApprove={serverSummary.canApprove}
        isDirty={isDirty}
      />

      {/* Server 422 Blocker Alert if Triggered */}
      {serverBlockerError && (
        <div
          role="alert"
          className="rounded-none border-l-4 border-l-short-edge border border-rule bg-short-bg p-4 text-short-fg text-sm font-semibold flex items-center justify-between"
        >
          <span>Server Gatekeeper Hard Stop: {serverBlockerError}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setServerBlockerError(null)}
            className="text-short-fg hover:bg-short-bg/80 h-7 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Two-Column Terminal (1024px: 2/3 ledger, 1/3 side panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Component Count Ledger */}
        <div className="lg:col-span-2 border border-rule rounded-[2px] bg-paper overflow-hidden">
          <div className="bg-sheet p-3.5 border-b border-rule flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-ink">
                Component count verification
              </h2>
              <p className="text-xs text-ink-soft">
                Enter the exact count for each bundle. All shortages (RED) trigger a server hard stop.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-ink-soft tabular-nums">
              {localEvaluation.countedComponents} / {localEvaluation.totalComponents} COUNTED
            </span>
          </div>

          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-sheet border-b border-rule">
              <tr>
                <th className="p-3 pl-4 font-bold text-ink-soft">Component</th>
                <th className="p-3 text-right font-bold text-ink-soft">Per</th>
                <th className="p-3 text-right font-bold text-ink-soft">Expected</th>
                <th className="p-3 text-right font-bold text-ink-soft w-36">
                  Actual count
                </th>
                <th className="p-3 text-right font-bold text-ink-soft">Variance</th>
                <th className="p-3 pr-4 font-bold text-ink-soft">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {items.map((item) => {
                const currentActual = counts[item.componentId];
                const liveLight = evaluateTrafficLight(currentActual, item.expectedQty);

                return (
                  <tr
                    key={item.componentId}
                    className="hover:bg-row-hover transition-colors h-16"
                  >
                    {/* Component Name and optional Thumbnail */}
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-3">
                        {item.imageUrl && (
                          <div className="relative w-10 h-10 shrink-0 bg-sheet rounded-[2px] border border-rule flex items-center justify-center p-1">
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              width={32}
                              height={32}
                              className="object-contain"
                            />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-ink block leading-tight">
                            {item.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Pieces Per Garment */}
                    <td className="p-3 text-right tabular-nums text-ink-soft">
                      {item.piecesPerGarment}
                    </td>

                    {/* Expected Quantity */}
                    <td className="p-3 text-right font-display text-xl font-bold tabular-nums text-ink">
                      {item.expectedQty}
                    </td>

                    {/* 56px Tall Integer Input (DESIGN.md Section 9.3) */}
                    <td className="p-3 text-right">
                      <IntegerInput
                        tall={true}
                        value={currentActual}
                        onChange={(val) => handleCountChange(item.componentId, val)}
                        disabled={isSaving || isApproving}
                        placeholder={String(item.expectedQty)}
                        aria-label={`Count for ${item.name}`}
                      />
                    </td>

                    {/* Live Variance */}
                    <td className="p-3 text-right font-display text-xl font-bold tabular-nums text-ink">
                      {liveLight.variance !== null ? (
                        liveLight.variance > 0 ? (
                          <span className="text-excess-fg">+{liveLight.variance}</span>
                        ) : liveLight.variance < 0 ? (
                          <span className="text-short-fg">{liveLight.variance}</span>
                        ) : (
                          <span className="text-match-fg">0</span>
                        )
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>

                    {/* Status Lamp */}
                    <td className="p-3 pr-4 whitespace-nowrap">
                      <Lamp
                        status={liveLight.prismaStatus}
                        variance={liveLight.variance ?? undefined}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right Column: Fabric Scale, Summary & Gate Actions (Sticky) */}
        <div className="space-y-6 lg:sticky lg:top-6">
          {/* Wastage Scale (DESIGN.md Section 8.4) */}
          <WastageScale
            actualYds={order.actualFabricYds}
            expectedYds={order.expectedFabricYds}
            wastagePct={order.wastagePct}
            capPct={order.recipe.wastageCap}
          />

          {/* Action Card */}
          <div className="rounded-[2px] border border-rule bg-paper p-5 space-y-4">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-rule pb-2">
              Terminal actions
            </h3>

            {/* Save Counts Button */}
            <Button
              variant="secondary"
              onClick={handleSaveCounts}
              disabled={isSaving || isApproving}
              className="w-full h-12 text-sm font-bold"
            >
              {isSaving ? "Saving counts..." : isDirty ? "Save counts (Unsaved changes)" : "Save counts"}
            </Button>

            {/* Approve Batch Button with Server Gate Guard */}
            <div className="space-y-1.5 pt-2">
              <Button
                variant="primary"
                disabled={!canApprove || isSaving || isApproving}
                onClick={handleApproveBatch}
                className="w-full h-12 text-base font-bold flex items-center justify-center gap-2"
                aria-disabled={!canApprove}
                aria-describedby="approve-helper"
              >
                {!canApprove && (
                  <svg
                    viewBox="0 0 20 20"
                    width="16"
                    height="16"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {isApproving ? "Verifying..." : "Approve Batch"}
              </Button>

              {/* Explanatory text below disabled approve per DESIGN.md Section 9.1 */}
              {!canApprove && (
                <p id="approve-helper" className="text-xs text-ink-soft text-center pt-1">
                  {isDirty
                    ? "Save counts to confirm server gate state."
                    : localEvaluation.shortCount > 0
                    ? "Gate closed. Resolve the shortage or reject the batch."
                    : localEvaluation.uncountedComponents > 0
                    ? "Gate closed. Count every component to open it."
                    : "Gate closed. Server confirmation required."}
                </p>
              )}
            </div>

            {/* Reject Batch Action */}
            <div className="pt-2 border-t border-rule">
              <Button
                variant="destructive"
                onClick={() => setIsRejectOpen(true)}
                disabled={isSaving || isApproving}
                className="w-full h-11 text-sm font-bold bg-short-bg text-short-fg hover:bg-short-bg/80 border border-short-edge/40"
              >
                Reject Batch
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Order Modal */}
      <RejectOrderModal
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        orderNo={order.orderNo}
        onConfirmReject={handleRejectConfirm}
      />
    </div>
  );
}
