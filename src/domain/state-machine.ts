import { OrderStatus } from "@prisma/client";
import { ConflictError } from "@/lib/errors";

export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  CUTTING_IN_PROGRESS: ["PENDING_VERIFICATION"],
  PENDING_VERIFICATION: ["VERIFIED", "REJECTED"],
  REJECTED: ["CUTTING_IN_PROGRESS"],
  VERIFIED: ["VERIFIED"], // Sewing start preserves VERIFIED status
} as const;

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ALLOWED_ORDER_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new ConflictError(
      "INVALID_STATE_TRANSITION",
      `Cannot transition cutting order from ${from} to ${to}`
    );
  }
}
