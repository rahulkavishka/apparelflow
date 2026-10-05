import React from "react";
import { cn } from "@/lib/utils";
import { splitOrderNo } from "@/lib/format";

interface OrderNoProps {
  orderNo: string;
  className?: string;
}

/**
 * Order number with the zero padding de-emphasised (lighter weight) so the
 * significant digits scan quickly and slashed zeros stop reading as strikethrough.
 * Dimming uses weight, not a lighter color, so the contrast contract still holds
 * on every row background including the selected (vat-tint) row.
 */
export function OrderNo({ orderNo, className }: OrderNoProps) {
  const { lead, significant } = splitOrderNo(orderNo);
  return (
    <span className={cn("whitespace-nowrap tabular-nums text-ink", className)}>
      {lead && <span className="font-normal text-ink-soft">{lead}</span>}
      <span className="font-bold">{significant}</span>
    </span>
  );
}
