import { ItemStatus } from "@prisma/client";

export type ComponentTrafficStatus = "MATCH" | "EXCESS" | "SHORT" | "NOT_COUNTED";

export interface TrafficLightResult {
  status: ComponentTrafficStatus;
  prismaStatus: ItemStatus | null;
  variance: number | null;
  label: string;
  isCounted: boolean;
  isShort: boolean;
  isMatch: boolean;
  isExcess: boolean;
}

/**
 * Shared traffic-light evaluation function used deterministically by client and server.
 *
 * @param actualQty - The physical counted quantity, or null if uncounted
 * @param expectedQty - The expected quantity derived from recipe multiplier
 */
export function evaluateTrafficLight(
  actualQty: number | null | undefined,
  expectedQty: number
): TrafficLightResult {
  if (actualQty === null || actualQty === undefined) {
    return {
      status: "NOT_COUNTED",
      prismaStatus: null,
      variance: null,
      label: "Not counted",
      isCounted: false,
      isShort: false,
      isMatch: false,
      isExcess: false,
    };
  }

  const variance = actualQty - expectedQty;

  if (actualQty === expectedQty) {
    return {
      status: "MATCH",
      prismaStatus: ItemStatus.GREEN,
      variance: 0,
      label: "Match",
      isCounted: true,
      isShort: false,
      isMatch: true,
      isExcess: false,
    };
  }

  if (actualQty > expectedQty) {
    return {
      status: "EXCESS",
      prismaStatus: ItemStatus.YELLOW,
      variance,
      label: `Excess +${variance}`,
      isCounted: true,
      isShort: false,
      isMatch: false,
      isExcess: true,
    };
  }

  // actualQty < expectedQty
  return {
    status: "SHORT",
    prismaStatus: ItemStatus.RED,
    variance,
    label: `Short ${variance}`, // variance is negative, e.g. -2 -> "Short -2"
    isCounted: true,
    isShort: true,
    isMatch: false,
    isExcess: false,
  };
}

export interface VerificationBatchEvaluation {
  totalComponents: number;
  countedComponents: number;
  uncountedComponents: number;
  matchCount: number;
  excessCount: number;
  shortCount: number;
  canApprove: boolean;
  blockers: {
    componentId: string;
    componentName: string;
    expectedQty: number;
    actualQty: number | null;
    reason: "SHORTAGE" | "UNCOUNTED";
    message: string;
  }[];
}

/**
 * Evaluates the entire component set for an order to determine approval eligibility.
 */
export function evaluateVerificationBatch(
  items: Array<{
    componentId: string;
    componentName: string;
    expectedQty: number;
    actualQty: number | null | undefined;
  }>
): VerificationBatchEvaluation {
  let counted = 0;
  let matches = 0;
  let excesses = 0;
  let shorts = 0;
  const blockers: VerificationBatchEvaluation["blockers"] = [];

  for (const item of items) {
    const res = evaluateTrafficLight(item.actualQty, item.expectedQty);

    if (!res.isCounted) {
      blockers.push({
        componentId: item.componentId,
        componentName: item.componentName,
        expectedQty: item.expectedQty,
        actualQty: null,
        reason: "UNCOUNTED",
        message: `${item.componentName}: not counted yet`,
      });
    } else {
      counted++;
      if (res.isMatch) matches++;
      else if (res.isExcess) excesses++;
      else if (res.isShort) {
        shorts++;
        blockers.push({
          componentId: item.componentId,
          componentName: item.componentName,
          expectedQty: item.expectedQty,
          actualQty: item.actualQty ?? 0,
          reason: "SHORTAGE",
          message: `${item.componentName}: short by ${item.expectedQty - (item.actualQty ?? 0)}`,
        });
      }
    }
  }

  const total = items.length;
  const canApprove = total > 0 && counted === total && shorts === 0;

  return {
    totalComponents: total,
    countedComponents: counted,
    uncountedComponents: total - counted,
    matchCount: matches,
    excessCount: excesses,
    shortCount: shorts,
    canApprove,
    blockers,
  };
}
