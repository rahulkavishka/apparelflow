import React from "react";
import { Lamp } from "@/components/domain/Lamp";
import { Stamp } from "@/components/domain/Stamp";
import { OrderStatus } from "@prisma/client";

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
    <div
      style={{
        clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
      }}
      className="rounded-none border border-ink-soft/40 bg-paper p-5 space-y-4 max-w-lg shadow-none"
    >
      {/* Attribution Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Stamp status={isApproved ? OrderStatus.VERIFIED : OrderStatus.REJECTED} />
          <span className="text-xs font-mono text-ink-soft uppercase">
            AUDIT RECORD
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <dt className="text-ink-soft font-medium">Verifier:</dt>
          <dd className="text-ink font-bold text-right">{verifierName}</dd>

          <dt className="text-ink-soft font-medium">Verified at:</dt>
          <dd className="text-ink text-right">
            {new Date(timestamp).toLocaleString()}
          </dd>

          <dt className="text-ink-soft font-medium">Fabric wastage:</dt>
          <dd className="text-ink font-bold tabular-nums text-right">
            {wastagePct.toFixed(2)} % {capPct !== undefined ? `(cap ${capPct.toFixed(1)} %)` : ""}
          </dd>
        </dl>

        {rejectionNote && (
          <div className="rounded-[2px] bg-short-bg p-2.5 text-xs border border-short-edge/40">
            <strong className="text-short-fg block mb-1">Rejection reason:</strong>
            <p className="text-ink">{rejectionNote}</p>
          </div>
        )}
      </div>

      {/* Dashed Tear Line (Per Section 8.5) */}
      <div className="border-t-2 border-dashed border-ink-soft/30 pt-3">
        <span className="block text-[10px] font-mono text-ink-soft uppercase tracking-wider mb-2">
          Component count breakdown
        </span>

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
                <td className="py-1.5 text-ink font-medium">{item.name}</td>
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
  );
}
