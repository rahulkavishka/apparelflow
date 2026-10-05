export interface ComponentRecipeSpec {
  componentId: string;
  componentName: string;
  piecesPerGarment: number;
  imageUrl?: string | null;
}

export interface ExpectedComponentCount {
  componentId: string;
  componentName: string;
  piecesPerGarment: number;
  expectedQty: number;
  imageUrl?: string | null;
}

/**
 * Calculates expected cut parts for a single component.
 * targetQty * piecesPerGarment
 */
export function calculateExpectedPieces(targetQty: number, piecesPerGarment: number): number {
  if (!Number.isInteger(targetQty) || targetQty <= 0) {
    throw new Error("Target quantity must be a positive integer");
  }
  if (!Number.isInteger(piecesPerGarment) || piecesPerGarment <= 0) {
    throw new Error("Pieces per garment must be a positive integer");
  }
  return targetQty * piecesPerGarment;
}

/**
 * Derives the full list of expected component quantities for an order.
 */
export function deriveExpectedComponents(
  targetQty: number,
  components: ComponentRecipeSpec[]
): ExpectedComponentCount[] {
  if (!Number.isInteger(targetQty) || targetQty <= 0) {
    throw new Error("Target quantity must be a positive integer");
  }
  if (!components || components.length === 0) {
    throw new Error("Recipe must contain at least one component");
  }

  return components.map((c) => ({
    componentId: c.componentId,
    componentName: c.componentName,
    piecesPerGarment: c.piecesPerGarment,
    expectedQty: calculateExpectedPieces(targetQty, c.piecesPerGarment),
    imageUrl: c.imageUrl,
  }));
}
