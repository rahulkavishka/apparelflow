import React from "react";
import { Lamp } from "@/components/domain/Lamp";
import { Stamp } from "@/components/domain/Stamp";
import { OrderStatus } from "@prisma/client";
import { formatDateTime } from "@/lib/format";

export interface AuditSnapshotItem {
  componentId: string;
  name: string;
  piecesPerGarment?: number;
  expected: number;
  actual: number | null;
  variance: number | null;
  status: "MATCH" | "EXCESS" | "SHORT" | "NOT_COUNTED" | null;
}

interface AuditStubProps {
  decision: "APPROVED" | "REJECTED";
  verifierName: string;
  timestamp: string;
  wastagePct: number;
  capPct?: number;
  rejectionNote?: string | null;
  items: AuditSnapshotItem[];
}

export function AuditStub({
  decision,
  verifierName,
  timestamp,
  wastagePct,
  capPct,
  rejectionNote,
  items,
}: AuditStubProps) {
  const isApproved = decision === "APPROVED";

  return (
    <div className="rounded-sm border border-rule bg-paper p-5 space-y-4 max-w-lg shadow-none">
      {/* Attribution Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Stamp status={isApproved ? OrderStatus.VERIFIED : OrderStatus.REJECTED} />
          <span className="text-sm font-bold text-ink-soft">
            Audit record
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <dt className="text-ink-soft font-medium">Verifier:</dt>
          <dd className="text-ink font-bold text-right">{verifierName}</dd>

          <dt className="text-ink-soft font-medium">Verified at:</dt>
          <dd className="text-ink text-right">
            {formatDateTime(timestamp)}
          </dd>

          <dt className="text-ink-soft font-medium">Fabric wastage:</dt>
          <dd className="text-ink font-bold tabular-nums text-right">
            {Number(wastagePct || 0).toFixed(2)} % {capPct !== undefined && capPct !== null ? `(cap ${Number(capPct).toFixed(1)} %)` : ""}
          </dd>
        </dl>

        {rejectionNote && (
          <div className="rounded-xs bg-short-bg p-2.5 text-xs border border-short-edge/40">
            <strong className="text-short-fg block mb-1">Rejection reason:</strong>
            <p className="text-ink">{rejectionNote}</p>
          </div>
        )}
      </div>

      {/* Dashed Tear Line (Per Section 8.5) */}
      <div className="border-t-2 border-dashed border-ink-soft/30 pt-3">
        <span className="block text-sm font-bold text-ink-soft mb-2">
          Component count breakdown
        </span>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ink-soft border-b border-rule">
                <th className="pb-1 text-left font-bold">Component</th>
                <th className="pb-1 text-right font-bold">Exp</th>
                <th className="pb-1 text-right font-bold">Act</th>
                <th className="pb-1 text-right font-bold">Var</th>
                <th className="pb-1 text-right font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule/60">
              {items.map((item) => (
                <tr key={item.componentId} className="hover:bg-sheet">
                  <td className="py-1.5 text-ink font-medium whitespace-nowrap">{item.name}</td>
                  <td className="py-1.5 text-right tabular-nums text-ink-soft">
                    {item.expected}
                  </td>
                  <td className="py-1.5 text-right tabular-nums font-bold text-ink">
                    {item.actual ?? "—"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums font-bold text-ink">
                    {item.variance !== null
                      ? item.variance > 0
                        ? `+${item.variance}`
                        : item.variance
                      : "—"}
                  </td>
                  <td className="py-1.5 text-right">
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
      </div>
    </div>
  );
}
