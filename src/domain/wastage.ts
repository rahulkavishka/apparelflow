export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Expected Fabric = Target Quantity * Standard Fabric Yards per piece
 */
export function expectedFabric(targetQty: number, stdYardsPerPiece: number): number {
  if (targetQty <= 0) throw new Error("Target quantity must be positive");
  if (stdYardsPerPiece <= 0) throw new Error("Standard yards per piece must be positive");
  return round2(targetQty * stdYardsPerPiece);
}

/**
 * Fabric Wastage % = [ (Actual Fabric Used - Expected Fabric) / Expected Fabric ] * 100
 */
export function wastagePct(actualYds: number, expectedYds: number): number {
  if (expectedYds <= 0) throw new Error("Expected fabric must be positive");
  if (actualYds <= 0) throw new Error("Actual fabric used must be positive");
  const variance = actualYds - expectedYds;
  return round2((variance / expectedYds) * 100);
}

/**
 * Checks whether the calculated wastage percentage exceeds the recipe cap
 */
export function isOverWastageCap(percentage: number, cap: number): boolean {
  return percentage > cap;
}
