import React from "react";
import { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface StampProps {
  status: OrderStatus;
  isSewingStarted?: boolean;
  className?: string;
}

export function Stamp({ status, isSewingStarted, className }: StampProps) {
  if (status === "VERIFIED" && isSewingStarted) {
    return (
      <span
        className={cn(
          "inline-block rounded-xs bg-vat px-2.5 py-1 text-sm font-bold text-paper",
          className
        )}
      >
        In assembly
      </span>
    );
  }

  switch (status) {
    case "CUTTING_IN_PROGRESS":
      return (
        <span
          className={cn(
            "inline-block rounded-xs border-[1.5px] border-[#7B8793] bg-sheet px-2.5 py-1 text-sm font-bold text-ink-soft",
            className
          )}
        >
          Cutting
        </span>
      );
    case "PENDING_VERIFICATION":
      return (
        <span
          className={cn(
            "inline-block rounded-xs border-[1.5px] border-vat bg-vat-tint px-2.5 py-1 text-sm font-bold text-vat",
            className
          )}
        >
          Pending verification
        </span>
      );
    case "REJECTED":
      return (
        <span
          className={cn(
            "inline-block rounded-xs border-[1.5px] border-short-edge bg-short-bg px-2.5 py-1 text-sm font-bold text-short-fg",
            className
          )}
        >
          Rejected
        </span>
      );
    case "VERIFIED":
      return (
        <span
          className={cn(
            "inline-block rounded-xs border-[1.5px] border-match-edge bg-match-bg px-2.5 py-1 text-sm font-bold text-match-fg",
            className
          )}
        >
          Verified
        </span>
      );
    default:
      return null;
  }
}
