"use client";

import React, { useState, useEffect, useCallback, use, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IntegerInput } from "@/components/domain/IntegerInput";
import { Lamp } from "@/components/domain/Lamp";
import { Stamp } from "@/components/domain/Stamp";
import { OrderNo } from "@/components/domain/OrderNo";
import { GateStrip } from "@/components/domain/GateStrip";
import { WastageScale } from "@/components/domain/WastageScale";
import { RejectOrderModal } from "@/components/domain/RejectOrderModal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { evaluateTrafficLight, evaluateVerificationBatch } from "@/domain/traffic-light";
import { toast } from "sonner";
import { VerificationOrderDto } from "@/services/verification.service";
import { ArrowLeft, Check, Lock, AlertTriangle, Save } from "lucide-react";

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

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/verification/orders/${resolvedParams.id}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
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
      <div className="py-20 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" label="Opening quality inspection workstation..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-short-fg font-bold text-sm">Cutting order not found or not in verification queue.</p>
        <Link href="/verifier/queue">
          <Button variant="secondary" size="sm">Back to queue</Button>
        </Link>
      </div>
    );
  }

  const { order, items, summary: serverSummary } = data;

  // Live evaluation from current input state
  const liveItemsForEval = items.map((item) => ({
    componentId: item.componentId,
    componentName: item.name,
    expectedQty: item.expectedQty,
    actualQty: counts[item.componentId] !== undefined ? counts[item.componentId] : item.actualQty,
  }));

  const localEvaluation = evaluateVerificationBatch(liveItemsForEval);

  // Check if inputs are dirty compared to server persisted state
  const isDirty = items.some(
    (item) => counts[item.componentId] !== item.actualQty
  );

  const canApprove = serverSummary.canApprove && !isDirty && localEvaluation.canApprove;

  const handleCountChange = (componentId: string, val: number | null) => {
    setCounts((prev) => ({ ...prev, [componentId]: val }));
    setServerBlockerError(null);
  };

  // Keyboard navigation between rows
  const handleKeyDownOnInput = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextItem = items[index + 1];
      if (nextItem && inputRefs.current[nextItem.componentId]) {
        inputRefs.current[nextItem.componentId]?.focus();
        inputRefs.current[nextItem.componentId]?.select();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevItem = items[index - 1];
      if (prevItem && inputRefs.current[prevItem.componentId]) {
        inputRefs.current[prevItem.componentId]?.focus();
        inputRefs.current[prevItem.componentId]?.select();
      }
    }
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save counts.";
      toast.error(msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval rejected by server gate.";
      toast.error(msg);
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
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-rule pb-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-ink">
              <OrderNo orderNo={order.orderNo} />
            </h1>
            <Stamp status={order.status} />
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs mt-2">
            <div>
              <dt className="text-ink-soft">Recipe</dt>
              <dd className="font-bold text-ink">
                {order.recipe.name} ({order.recipe.recipeCode})
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Target batch qty</dt>
              <dd className="font-display text-sm font-bold tabular-nums text-ink">
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
          <Button variant="secondary" size="sm" className="h-8 text-xs font-bold flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to queue</span>
          </Button>
        </Link>
      </div>

      {/* Signature Gate Strip */}
      <GateStrip
        evaluation={localEvaluation}
        serverCanApprove={serverSummary.canApprove}
        isDirty={isDirty}
      />

      {/* Server 422 Hard Stop Blocker Alert */}
      {serverBlockerError && (
        <div
          role="alert"
          className="rounded-xs border-l-4 border-l-short-edge border border-rule bg-short-bg p-3.5 text-short-fg text-xs font-semibold flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Server Gatekeeper Hard Stop: {serverBlockerError}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setServerBlockerError(null)}
            className="text-short-fg hover:bg-short-bg/80 h-6 text-xs px-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Two-Column Terminal Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Left Column: Component Count Ledger */}
        <div className="lg:col-span-2 border border-rule rounded-xs bg-paper overflow-hidden shadow-none">
          <div className="bg-sheet p-3 border-b border-rule flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-ink">
                Component count verification ledger
              </h2>
              <p className="text-[11px] text-ink-soft">
                Enter counts. Use <kbd className="font-mono text-[10px] bg-paper px-1 border border-rule">↵</kbd> or <kbd className="font-mono text-[10px] bg-paper px-1 border border-rule">↓</kbd> to cycle rows. Shortages (RED) block the release gate.
              </p>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-sheet border-b border-rule">
                <tr>
                  <th className="p-2.5 pl-3.5 font-bold text-ink-soft">Component</th>
                  <th className="p-2.5 text-right font-bold text-ink-soft">Per</th>
                  <th className="p-2.5 text-right font-bold text-ink-soft">Expected</th>
                  <th className="p-2.5 text-right font-bold text-ink-soft w-32">
                    Actual count
                  </th>
                  <th className="p-2.5 text-right font-bold text-ink-soft">Variance</th>
                  <th className="p-2.5 pr-3.5 font-bold text-ink-soft">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {items.map((item, index) => {
                  const currentActual = counts[item.componentId];
                  const liveLight = evaluateTrafficLight(currentActual, item.expectedQty);

                  return (
                    <tr
                      key={item.componentId}
                      className="hover:bg-row-hover transition-colors h-14"
                    >
                      {/* Component Name & Thumbnail */}
                      <td className="p-2.5 pl-3.5">
                        <div className="flex items-center gap-2.5">
                          {item.imageUrl && (
                            <div className="relative w-8 h-8 shrink-0 bg-sheet rounded-xs border border-rule flex items-center justify-center p-0.5">
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                width={24}
                                height={24}
                                className="object-contain"
                              />
                            </div>
                          )}
                          <span className="font-bold text-ink block leading-tight">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* Pieces Per Garment */}
                      <td className="p-2.5 text-right tabular-nums text-ink-soft">
                        {item.piecesPerGarment}
                      </td>

                      {/* Expected Quantity */}
                      <td className="p-2.5 text-right font-display text-base font-bold tabular-nums text-ink">
                        {item.expectedQty}
                      </td>

                      {/* Count Input with auto-advance */}
                      <td className="p-2.5 text-right">
                        <div
                          onKeyDown={(e) => handleKeyDownOnInput(e, index)}
                        >
                          <IntegerInput
                            ref={(el) => {
                              inputRefs.current[item.componentId] = el;
                            }}
                            value={currentActual}
                            onChange={(val) => handleCountChange(item.componentId, val)}
                            disabled={isSaving || isApproving}
                            placeholder={String(item.expectedQty)}
                            aria-label={`Count for ${item.name}`}
                            className="h-10 text-right font-display text-base font-bold tabular-nums"
                          />
                        </div>
                      </td>

                      {/* Live Variance */}
                      <td className="p-2.5 text-right font-display text-base font-bold tabular-nums">
                        {liveLight.variance !== null ? (
                          liveLight.variance > 0 ? (
                            <span className="text-excess-fg">+{liveLight.variance}</span>
                          ) : liveLight.variance < 0 ? (
                            <span className="text-short-fg font-bold">{liveLight.variance}</span>
                          ) : (
                            <span className="text-match-fg font-bold">0</span>
                          )
                        ) : (
                          <span className="text-ink-soft">—</span>
                        )}
                      </td>

                      {/* Status Lamp */}
                      <td className="p-2.5 pr-3.5 whitespace-nowrap">
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

          {/* Mobile Component Counting Cards (< md screens) */}
          <div className="md:hidden divide-y divide-rule">
            {items.map((item, index) => {
              const currentActual = counts[item.componentId];
              const liveLight = evaluateTrafficLight(currentActual, item.expectedQty);

              return (
                <div
                  key={item.componentId}
                  className="p-3.5 space-y-3 bg-paper"
                >
                  {/* Card Header: Thumbnail + Name + Status Lamp */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {item.imageUrl && (
                        <div className="relative w-8 h-8 shrink-0 bg-sheet rounded-xs border border-rule flex items-center justify-center p-0.5">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-ink text-sm">{item.name}</div>
                        <div className="text-[11px] text-ink-soft font-mono">
                          {item.piecesPerGarment}× per garment
                        </div>
                      </div>
                    </div>
                    <Lamp
                      status={liveLight.prismaStatus}
                      variance={liveLight.variance ?? undefined}
                    />
                  </div>

                  {/* Quantity Stats & Variance Bar */}
                  <div className="grid grid-cols-2 gap-2 bg-sheet/40 p-2 rounded border border-rule/60 text-center text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Expected</div>
                      <div className="font-display font-bold text-ink text-base">{item.expectedQty}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-soft">Variance</div>
                      <div className="font-display font-bold text-base">
                        {liveLight.variance !== null ? (
                          liveLight.variance > 0 ? (
                            <span className="text-excess-fg">+{liveLight.variance}</span>
                          ) : liveLight.variance < 0 ? (
                            <span className="text-short-fg font-bold">{liveLight.variance}</span>
                          ) : (
                            <span className="text-match-fg font-bold">0</span>
                          )
                        ) : (
                          <span className="text-ink-soft">—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Touch-Friendly Count Input Row */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1" onKeyDown={(e) => handleKeyDownOnInput(e, index)}>
                      <IntegerInput
                        value={currentActual}
                        onChange={(val) => handleCountChange(item.componentId, val)}
                        disabled={isSaving || isApproving}
                        placeholder={`Count (exp: ${item.expectedQty})`}
                        aria-label={`Count for ${item.name}`}
                        className="h-10 text-right font-display text-base font-bold tabular-nums"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCountChange(item.componentId, item.expectedQty)}
                      className="h-10 px-3 text-xs font-bold shrink-0 border-rule bg-sheet hover:bg-paper text-ink cursor-pointer"
                    >
                      Fill {item.expectedQty}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Wastage Meter & Gate Decision Actions */}
        <div className="space-y-4 lg:sticky lg:top-4">
          {/* Wastage Meter */}
          <WastageScale
            actualYds={order.actualFabricYds}
            expectedYds={order.expectedFabricYds}
            wastagePct={order.wastagePct}
            capPct={order.recipe.wastageCap}
          />

          {/* Gate Terminal Actions Card */}
          <div className="rounded-xs border border-rule bg-paper p-4 space-y-3.5">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-rule pb-2">
              Workstation actions
            </h3>

            {/* Save Counts Button */}
            <Button
              variant="secondary"
              onClick={handleSaveCounts}
              disabled={isSaving || isApproving}
              className="w-full h-10 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {isSaving
                  ? "Saving counts..."
                  : isDirty
                  ? "Save counts (Unsaved changes)"
                  : "Save counts"}
              </span>
            </Button>

            {/* Approve Batch Button */}
            <div className="space-y-1.5 pt-1">
              <Button
                variant="primary"
                disabled={!canApprove || isSaving || isApproving}
                onClick={handleApproveBatch}
                className="w-full h-11 text-xs font-bold flex items-center justify-center gap-1.5"
                aria-disabled={!canApprove}
                aria-describedby="approve-helper-text"
              >
                {!canApprove ? (
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{isApproving ? "Approving batch..." : "Approve Batch"}</span>
              </Button>

              {!canApprove && (
                <p id="approve-helper-text" className="text-[11px] text-ink-soft text-center pt-0.5">
                  {isDirty
                    ? "Save counts to confirm server gate validation."
                    : localEvaluation.shortCount > 0
                    ? "Gate closed. Resolve component shortage or reject batch."
                    : localEvaluation.uncountedComponents > 0
                    ? "Gate closed. Count every component bundle to unlock."
                    : "Gate closed. Server confirmation required."}
                </p>
              )}
            </div>

            {/* Reject Batch Trigger */}
            <div className="pt-2 border-t border-rule">
              <Button
                variant="destructive"
                onClick={() => setIsRejectOpen(true)}
                disabled={isSaving || isApproving}
                className="w-full h-9 text-xs font-bold bg-short-bg text-short-fg hover:bg-short-bg/80 border border-short-edge/40"
              >
                Reject Batch (Return to supervisor)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Confirmation Modal */}
      <RejectOrderModal
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        orderNo={order.orderNo}
        onConfirmReject={handleRejectConfirm}
      />
    </div>
  );
}
