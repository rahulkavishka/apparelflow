"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/domain/Stamp";
import { toast } from "sonner";
import { OrderStatus } from "@prisma/client";

interface SewingQueueItem {
  id: string;
  orderNo: string;
  targetQty: number;
  fabricRollId: string;
  status: OrderStatus;
  recipe: {
    recipeCode: string;
    name: string;
    wastageCap: number;
  };
  verifiedAt: string | null;
  verifier: {
    id: string;
    fullName: string;
  } | null;
  wastagePct: number | null;
  sewingStartedAt: string | null;
  sewingStartedBy: {
    id: string;
    fullName: string;
  } | null;
}

export default function SewingQueuePage() {
  const [orders, setOrders] = useState<SewingQueueItem[]>([]);
  const [startedFilter, setStartedFilter] = useState<"awaiting" | "started" | "all">("awaiting");
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sewing/queue?startedFilter=${startedFilter}`);
      const json = await res.json();
      if (res.ok) {
        setOrders(json.data.orders);
      } else {
        toast.error(json.error?.message || "Failed to load sewing queue.");
      }
    } catch {
      toast.error("Network error loading sewing queue.");
    } finally {
      setIsLoading(false);
    }
  }, [startedFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Sewing queue
          </h1>
          <p className="text-sm text-ink-soft">
            Verified cutting bundles released from the gatekeeper terminal, ready for sewing line assembly.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchQueue}
          disabled={isLoading}
        >
          Refresh queue
        </Button>
      </div>

      {/* Segmented Text Control per DESIGN.md Section 10.5 (underlined current, no pill bg) */}
      <div className="flex items-center gap-6 border-b border-rule">
        <button
          type="button"
          onClick={() => setStartedFilter("awaiting")}
          className={`pb-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            startedFilter === "awaiting"
              ? "border-vat text-vat"
              : "border-transparent text-ink-soft hover:text-ink hover:border-rule"
          }`}
        >
          Awaiting assembly
        </button>

        <button
          type="button"
          onClick={() => setStartedFilter("started")}
          className={`pb-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            startedFilter === "started"
              ? "border-vat text-vat"
              : "border-transparent text-ink-soft hover:text-ink hover:border-rule"
          }`}
        >
          In assembly
        </button>

        <button
          type="button"
          onClick={() => setStartedFilter("all")}
          className={`pb-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            startedFilter === "all"
              ? "border-vat text-vat"
              : "border-transparent text-ink-soft hover:text-ink hover:border-rule"
          }`}
        >
          All verified batches
        </button>
      </div>

      {/* Table */}
      <div className="border border-rule rounded-[2px] bg-paper overflow-x-auto shadow-none">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-sheet border-b border-rule">
            <tr>
              <th className="p-3.5 pl-4 font-bold text-ink-soft">Order</th>
              <th className="p-3.5 font-bold text-ink-soft">Recipe</th>
              <th className="p-3.5 text-right font-bold text-ink-soft">Qty</th>
              <th className="p-3.5 font-bold text-ink-soft">Verified by</th>
              <th className="p-3.5 font-bold text-ink-soft">Verified at</th>
              <th className="p-3.5 text-right font-bold text-ink-soft">Wastage</th>
              <th className="p-3.5 font-bold text-ink-soft">Status</th>
              <th className="p-3.5 pr-4 text-right font-bold text-ink-soft">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-ink-soft">
                  Loading verified sewing batches...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-ink-soft">
                  No verified batches yet. Batches appear here after a verifier approves them.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const isInAssembly = Boolean(o.sewingStartedAt);

                return (
                  <tr key={o.id} className="hover:bg-row-hover transition-colors">
                    <td className="p-3.5 pl-4 font-bold text-ink whitespace-nowrap">
                      <Link
                        href={`/sewing/orders/${o.id}`}
                        className="hover:underline text-ink"
                      >
                        {o.orderNo}
                      </Link>
                    </td>
                    <td className="p-3.5 text-ink whitespace-nowrap">
                      {o.recipe.name}{" "}
                      <span className="text-xs text-ink-soft">({o.recipe.recipeCode})</span>
                    </td>
                    <td className="p-3.5 text-right font-display text-lg font-semibold tabular-nums text-ink">
                      {o.targetQty}
                    </td>
                    <td className="p-3.5 font-bold text-ink whitespace-nowrap">
                      {o.verifier?.fullName || "—"}
                    </td>
                    <td className="p-3.5 text-ink whitespace-nowrap text-xs">
                      {o.verifiedAt ? new Date(o.verifiedAt).toLocaleString() : "—"}
                    </td>
                    <td className="p-3.5 text-right tabular-nums text-ink font-bold">
                      {o.wastagePct !== null ? `${o.wastagePct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {/* Status Stamp per DESIGN.md Section 8.3 */}
                      {isInAssembly ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-xs font-bold bg-vat text-paper">
                          In assembly
                        </span>
                      ) : (
                        <Stamp status={OrderStatus.VERIFIED} />
                      )}
                    </td>
                    <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                      <Link href={`/sewing/orders/${o.id}`}>
                        <Button variant="secondary" size="sm">
                          View batch
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
