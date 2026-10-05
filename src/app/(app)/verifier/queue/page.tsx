"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/domain/Stamp";
import { toast } from "sonner";
import { OrderStatus } from "@prisma/client";

interface QueueItem {
  id: string;
  orderNo: string;
  status: OrderStatus;
  targetQty: number;
  fabricRollId: string;
  submittedAt: string | null;
  recipe: {
    recipeCode: string;
    name: string;
  };
  createdBy: {
    fullName: string;
  };
  totalItems: number;
  countedItems: number;
}

export default function VerifierQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/verification/queue");
      const json = await res.json();
      if (res.ok) {
        setQueue(json.data.queue);
      } else {
        toast.error(json.error?.message || "Failed to load verification queue");
      }
    } catch {
      toast.error("Network error loading verification queue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Verification queue
          </h1>
          <p className="text-sm text-ink-soft">
            Incoming cut batches requiring piece-by-piece physical component verification before sewing queue release.
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

      {/* Queue Table */}
      <div className="border border-rule rounded-[2px] bg-paper overflow-x-auto shadow-none">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-sheet border-b border-rule">
            <tr>
              <th className="p-3.5 pl-4 font-bold text-ink-soft">Order</th>
              <th className="p-3.5 font-bold text-ink-soft">Recipe</th>
              <th className="p-3.5 text-right font-bold text-ink-soft">Qty</th>
              <th className="p-3.5 font-bold text-ink-soft">Fabric roll</th>
              <th className="p-3.5 font-bold text-ink-soft">Submitted at</th>
              <th className="p-3.5 font-bold text-ink-soft">Status</th>
              <th className="p-3.5 pr-4 text-right font-bold text-ink-soft">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-ink-soft">
                  Loading verification queue...
                </td>
              </tr>
            ) : queue.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-ink-soft">
                  No batches waiting for a count.
                </td>
              </tr>
            ) : (
              queue.map((item) => (
                <tr key={item.id} className="hover:bg-row-hover transition-colors">
                  <td className="p-3.5 pl-4 font-bold text-ink whitespace-nowrap">
                    <Link
                      href={`/verifier/orders/${item.id}`}
                      className="hover:underline text-ink"
                    >
                      {item.orderNo}
                    </Link>
                  </td>
                  <td className="p-3.5 text-ink whitespace-nowrap">
                    {item.recipe.name}{" "}
                    <span className="text-xs text-ink-soft">({item.recipe.recipeCode})</span>
                  </td>
                  <td className="p-3.5 text-right font-display text-lg font-semibold tabular-nums text-ink">
                    {item.targetQty}
                  </td>
                  <td className="p-3.5 font-bold text-ink whitespace-nowrap">
                    {item.fabricRollId}
                  </td>
                  <td className="p-3.5 text-ink whitespace-nowrap text-xs">
                    {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "—"}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <Stamp status={item.status} />
                  </td>
                  <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                    <Link href={`/verifier/orders/${item.id}`}>
                      <Button variant="primary" size="sm">
                        Open terminal
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
