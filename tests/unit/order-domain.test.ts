import { describe, it, expect } from "vitest";
import {
  calculateExpectedPieces,
  deriveExpectedComponents,
} from "@/domain/multiplier";
import {
  expectedFabric,
  wastagePct,
  isOverWastageCap,
} from "@/domain/wastage";
import {
  canTransitionOrder,
  validateOrderTransition,
} from "@/domain/state-machine";
import { createOrderSchema, patchOrderSchema } from "@/validators/order.schema";

describe("Domain: Multiplier Engine", () => {
  it("multiplies target quantity by pieces per garment accurately", () => {
    expect(calculateExpectedPieces(50, 1)).toBe(50);
    expect(calculateExpectedPieces(50, 2)).toBe(100);
    expect(calculateExpectedPieces(1, 2)).toBe(2);
    expect(calculateExpectedPieces(1000, 4)).toBe(4000);
  });

  it("throws on non-integer or negative inputs", () => {
    expect(() => calculateExpectedPieces(0, 1)).toThrow();
    expect(() => calculateExpectedPieces(-5, 2)).toThrow();
    expect(() => calculateExpectedPieces(50.5, 2)).toThrow();
    expect(() => calculateExpectedPieces(50, 0)).toThrow();
  });

  it("derives all component expected quantities for a Casual Blouse batch of 50", () => {
    const blouseComponents = [
      { componentId: "c1", componentName: "Front Body Panel", piecesPerGarment: 1 },
      { componentId: "c2", componentName: "Back Body Panel", piecesPerGarment: 1 },
      { componentId: "c3", componentName: "Sleeves (Left & Right)", piecesPerGarment: 2 },
      { componentId: "c4", componentName: "Collar & Stand", piecesPerGarment: 1 },
      { componentId: "c5", componentName: "Sleeve Cuffs", piecesPerGarment: 2 },
    ];

    const expected = deriveExpectedComponents(50, blouseComponents);
    expect(expected).toHaveLength(5);
    expect(expected.find((c) => c.componentName === "Front Body Panel")?.expectedQty).toBe(50);
    expect(expected.find((c) => c.componentName === "Sleeves (Left & Right)")?.expectedQty).toBe(100);
    expect(expected.find((c) => c.componentName === "Sleeve Cuffs")?.expectedQty).toBe(100);
  });
});

describe("Domain: Fabric Wastage Engine", () => {
  it("calculates expected fabric yards accurately", () => {
    // 50 garments * 1.8 yds = 90 yds
    expect(expectedFabric(50, 1.8)).toBe(90);
    // 80 garments * 1.1 yds = 88 yds
    expect(expectedFabric(80, 1.1)).toBe(88);
  });

  it("calculates fabric wastage percentage correctly per spec worked examples", () => {
    // Expected 90, Actual 94.5 => ((94.5 - 90) / 90) * 100 = 5.00%
    expect(wastagePct(94.5, 90)).toBe(5);

    // Expected 90, Actual 96.3 => ((96.3 - 90) / 90) * 100 = 7.00%
    expect(wastagePct(96.3, 90)).toBe(7);

    // Negative wastage (under expected fabric): Expected 90, Actual 85 => -5.56%
    expect(wastagePct(85, 90)).toBe(-5.56);
  });

  it("correctly identifies whether wastage exceeds the recipe cap", () => {
    expect(isOverWastageCap(5.0, 5.0)).toBe(false); // Exactly at cap is not over
    expect(isOverWastageCap(5.01, 5.0)).toBe(true);
    expect(isOverWastageCap(7.0, 5.0)).toBe(true);
    expect(isOverWastageCap(-2.0, 5.0)).toBe(false);
  });
});

describe("Domain: Manufacturing State Machine", () => {
  it("permits legal forward and recut transitions", () => {
    expect(canTransitionOrder("CUTTING_IN_PROGRESS", "PENDING_VERIFICATION")).toBe(true);
    expect(canTransitionOrder("PENDING_VERIFICATION", "VERIFIED")).toBe(true);
    expect(canTransitionOrder("PENDING_VERIFICATION", "REJECTED")).toBe(true);
    expect(canTransitionOrder("REJECTED", "CUTTING_IN_PROGRESS")).toBe(true);
  });

  it("rejects illegal skips and backward transitions", () => {
    expect(canTransitionOrder("CUTTING_IN_PROGRESS", "VERIFIED")).toBe(false);
    expect(canTransitionOrder("PENDING_VERIFICATION", "CUTTING_IN_PROGRESS")).toBe(false);
    expect(canTransitionOrder("VERIFIED", "CUTTING_IN_PROGRESS")).toBe(false);
    expect(canTransitionOrder("REJECTED", "VERIFIED")).toBe(false);

    expect(() =>
      validateOrderTransition("CUTTING_IN_PROGRESS", "VERIFIED")
    ).toThrowError(/Cannot transition/);
  });
});

describe("Validators: Strict Order Schemas", () => {
  const validOrder = {
    recipeId: "123e4567-e89b-12d3-a456-426614174000",
    targetQty: 50,
    fabricRollId: "FAB-ROLL-882",
    actualFabricYds: 94.5,
  };

  it("accepts valid order input", () => {
    const parsed = createOrderSchema.parse(validOrder);
    expect(parsed.targetQty).toBe(50);
    expect(parsed.actualFabricYds).toBe(94.5);
  });

  it("strictly rejects negative target quantity", () => {
    expect(() =>
      createOrderSchema.parse({ ...validOrder, targetQty: -5 })
    ).toThrow();
  });

  it("strictly rejects decimal target quantity", () => {
    expect(() =>
      createOrderSchema.parse({ ...validOrder, targetQty: 50.5 })
    ).toThrow();
  });

  it("strictly rejects invalid fabric roll ID format", () => {
    expect(() =>
      createOrderSchema.parse({ ...validOrder, fabricRollId: "roll with spaces" })
    ).toThrow();
    expect(() =>
      createOrderSchema.parse({ ...validOrder, fabricRollId: "ab" }) // too short
    ).toThrow();
  });

  it("strictly rejects fabric yards with more than 2 decimal places", () => {
    expect(() =>
      createOrderSchema.parse({ ...validOrder, actualFabricYds: 94.555 })
    ).toThrow();
  });

  it("strictly rejects extra unknown fields (tamper defense)", () => {
    expect(() =>
      createOrderSchema.parse({
        ...validOrder,
        status: "VERIFIED", // Client trying to forge status
      })
    ).toThrow();
  });

  it("patch schema rejects empty update object", () => {
    expect(() => patchOrderSchema.parse({})).toThrow();
  });
});
