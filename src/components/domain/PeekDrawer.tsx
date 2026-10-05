"use client";

import React from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/domain/Stamp";
import { OrderNo } from "@/components/domain/OrderNo";
import { ExternalLink, X } from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { formatFactoryDateTime } from "@/lib/format";

export interface PeekDrawerData {
  id: string;
  orderNo: string;
  status: OrderStatus;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds?: number;
  expectedFabricYds?: number;
  wastagePct?: number;
  recipeName: string;
  recipeCode: string;
  wastageCap?: number;
  createdAt: string;
  submittedAt?: string | null;
  verifiedAt?: string | null;
  lastRejectionReason?: string | null;
  primaryActionLabel?: string;
  primaryActionHref?: string;
}

interface PeekDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PeekDrawerData | null;
  onPrimaryAction?: () => void;
}

export function PeekDrawer({
  open,
  onOpenChange,
  data,
}: PeekDrawerProps) {
  if (!data) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 h-full w-full max-w-110 bg-paper shadow-2xl border-l border-rule flex flex-col focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-200"
        >
          {/* Accessibility Title & Description */}
          <DialogPrimitive.Title className="sr-only">
            Order {data.orderNo} Specifications
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Quick batch inspector for cutting order {data.orderNo}
          </DialogPrimitive.Description>

          {/* Header */}
          <div className="p-4 border-b border-rule bg-sheet/50 flex items-start justify-between shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="font-display text-xl font-bold text-ink">
                  <OrderNo orderNo={data.orderNo} />
                </span>
                <Stamp status={data.status} />
              </div>
              <p className="text-xs text-ink-soft">
                {data.recipeName} <span className="font-mono">({data.recipeCode})</span>
              </p>
            </div>

            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-ink-soft hover:text-ink hover:bg-sheet rounded-xs"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Rejection Note Alert if Rejected */}
            {data.status === OrderStatus.REJECTED && data.lastRejectionReason && (
              <div className="p-3 rounded-[3px] border-l-4 border-l-short-edge border border-rule bg-short-bg text-short-fg space-y-1">
                <span className="font-bold block text-short-fg">Rejection notice</span>
                <p className="text-ink leading-relaxed">{data.lastRejectionReason}</p>
              </div>
            )}

            {/* Quick Specifications DL */}
            <div className="rounded-[3px] border border-rule bg-paper p-3.5 space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-soft border-b border-rule pb-1.5">
                Batch specification
              </h4>

              <dl className="space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <dt className="text-ink-soft font-medium">Target quantity</dt>
                  <dd className="font-display text-base font-bold tabular-nums text-ink">
                    {data.targetQty} garments
                  </dd>
                </div>

                <div className="flex justify-between items-baseline">
                  <dt className="text-ink-soft font-medium">Fabric roll ID</dt>
                  <dd className="font-bold font-mono text-ink">{data.fabricRollId}</dd>
                </div>

                {data.actualFabricYds !== undefined && (
                  <div className="flex justify-between items-baseline">
                    <dt className="text-ink-soft font-medium">Actual fabric used</dt>
                    <dd className="font-bold tabular-nums text-ink">
                      {data.actualFabricYds.toFixed(2)} yds
                    </dd>
                  </div>
                )}

                {data.expectedFabricYds !== undefined && (
                  <div className="flex justify-between items-baseline">
                    <dt className="text-ink-soft font-medium">Expected fabric</dt>
                    <dd className="tabular-nums text-ink-soft">
                      {data.expectedFabricYds.toFixed(2)} yds
                    </dd>
                  </div>
                )}

                {data.wastagePct !== undefined && (
                  <div className="flex justify-between items-baseline">
                    <dt className="text-ink-soft font-medium">Wastage</dt>
                    <dd className="font-bold tabular-nums text-ink">
                      {data.wastagePct.toFixed(2)}%
                      {data.wastageCap !== undefined && (
                        <span className="text-ink-soft font-normal ml-1">
                          (Cap: {data.wastageCap.toFixed(1)}%)
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Timestamps */}
            <div className="rounded-[3px] border border-rule bg-sheet/40 p-3.5 space-y-2 text-[11px]">
              <div className="flex justify-between text-ink-soft">
                <span>Created at:</span>
                <span className="font-mono text-ink">
                  {formatFactoryDateTime(data.createdAt)}
                </span>
              </div>

              {data.submittedAt && (
                <div className="flex justify-between text-ink-soft">
                  <span>Submitted at:</span>
                  <span className="font-mono text-ink">
                    {formatFactoryDateTime(data.submittedAt)}
                  </span>
                </div>
              )}

              {data.verifiedAt && (
                <div className="flex justify-between text-ink-soft">
                  <span>Verified at:</span>
                  <span className="font-mono text-ink">
                    {formatFactoryDateTime(data.verifiedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-rule bg-sheet/40 flex items-center justify-between gap-2 shrink-0">
            {data.primaryActionHref ? (
              <Link
                href={data.primaryActionHref}
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                <Button variant="primary" className="w-full text-xs font-bold flex items-center justify-center gap-1.5 h-10 bg-vat text-paper hover:bg-vat/90">
                  <span>{data.primaryActionLabel || "View full order"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            ) : (
              <Button
                variant="secondary"
                onClick={() => onOpenChange(false)}
                className="w-full text-xs font-bold h-10"
              >
                Close
              </Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
