"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AuditStub, AuditSnapshotItem } from "@/components/domain/AuditStub";
import { toast } from "sonner";

interface HistoryLogItem {
  id: string;
  orderId: string;
  orderNo: string;
  recipe: {
    recipeCode: string;
    name: string;
    wastageCap: number;
  };
  targetQty: number;
  fabricRollId: string;
  decision: "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  wastagePct: number;
  varianceSnapshot: any;
  timestamp: string;
  verifier: {
    id: string;
    fullName: string;
  };
}

export default function VerifierHistoryPage() {
  const [logs, setLogs] = useState<HistoryLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/verification/logs");
      const json = await res.json();
      if (res.ok) {
        setLogs(json.data.logs);
      } else {
        toast.error(json.error?.message || "Failed to load verification history.");
      }
    } catch {
      toast.error("Network error loading verification history.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Verification history
          </h1>
          <p className="text-sm text-ink-soft">
            Audit trail of approved and rejected batches with immutable component count snapshots.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchHistory}
          disabled={isLoading}
        >
          Refresh history
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-ink-soft">
          Loading verification history...
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-ink-soft border border-rule rounded-[2px] bg-paper">
          No verification decisions recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {logs.map((log) => {
            const rawItems = Array.isArray(log.varianceSnapshot)
              ? log.varianceSnapshot
              : [];

            const snapshotItems: AuditSnapshotItem[] = rawItems.map((item: any) => ({
              componentId: item.componentId || item.name,
              name: item.name,
              expected: item.expected,
              actual: item.actual,
              variance: item.variance,
              status: item.status,
            }));

            return (
              <div
                key={log.id}
                className="space-y-3 p-4 border border-rule rounded-[2px] bg-sheet"
              >
                <div className="flex justify-between items-baseline border-b border-rule pb-2">
                  <div>
                    <span className="font-display text-xl font-bold text-ink">
                      {log.orderNo}
                    </span>
                    <span className="text-xs text-ink-soft block">
                      {log.recipe.name} ({log.recipe.recipeCode}) · {log.targetQty} garments
                    </span>
                  </div>
                  <span className="text-xs text-ink font-mono">
                    Roll: {log.fabricRollId}
                  </span>
                </div>

                <AuditStub
                  decision={log.decision}
                  verifierName={log.verifier.fullName}
                  timestamp={log.timestamp}
                  wastagePct={Number(log.wastagePct ?? 0)}
                  capPct={Number(log.recipe.wastageCap ?? 0)}
                  rejectionNote={log.rejectionNote}
                  items={snapshotItems}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
