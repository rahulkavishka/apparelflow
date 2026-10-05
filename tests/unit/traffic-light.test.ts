import { describe, it, expect } from "vitest";
import {
  evaluateTrafficLight,
  evaluateVerificationBatch,
} from "@/domain/traffic-light";

describe("domain/traffic-light", () => {
  describe("evaluateTrafficLight", () => {
    it("returns NOT_COUNTED when actualQty is null or undefined", () => {
      const nullRes = evaluateTrafficLight(null, 50);
      expect(nullRes.status).toBe("NOT_COUNTED");
      expect(nullRes.prismaStatus).toBeNull();
      expect(nullRes.variance).toBeNull();
      expect(nullRes.isCounted).toBe(false);
      expect(nullRes.label).toBe("Not counted");

      const undefRes = evaluateTrafficLight(undefined, 50);
      expect(undefRes.status).toBe("NOT_COUNTED");
    });

    it("returns MATCH when actualQty equals expectedQty (GREEN)", () => {
      const res = evaluateTrafficLight(50, 50);
      expect(res.status).toBe("MATCH");
      expect(res.prismaStatus).toBe("GREEN");
      expect(res.variance).toBe(0);
      expect(res.isCounted).toBe(true);
      expect(res.isMatch).toBe(true);
      expect(res.isExcess).toBe(false);
      expect(res.isShort).toBe(false);
      expect(res.label).toBe("Match");
    });

    it("returns EXCESS when actualQty > expectedQty (YELLOW)", () => {
      const res = evaluateTrafficLight(52, 50);
      expect(res.status).toBe("EXCESS");
      expect(res.prismaStatus).toBe("YELLOW");
      expect(res.variance).toBe(2);
      expect(res.isCounted).toBe(true);
      expect(res.isExcess).toBe(true);
      expect(res.isShort).toBe(false);
      expect(res.label).toBe("Excess +2");
    });

    it("returns SHORT when actualQty < expectedQty (RED)", () => {
      const res = evaluateTrafficLight(48, 50);
      expect(res.status).toBe("SHORT");
      expect(res.prismaStatus).toBe("RED");
      expect(res.variance).toBe(-2);
      expect(res.isCounted).toBe(true);
      expect(res.isShort).toBe(true);
      expect(res.label).toBe("Short -2");
    });

    it("returns SHORT when actualQty is 0 and expectedQty is positive", () => {
      const res = evaluateTrafficLight(0, 100);
      expect(res.status).toBe("SHORT");
      expect(res.prismaStatus).toBe("RED");
      expect(res.variance).toBe(-100);
      expect(res.isCounted).toBe(true);
      expect(res.isShort).toBe(true);
    });
  });

  describe("evaluateVerificationBatch", () => {
    const mockItems = [
      { componentId: "c1", componentName: "Front Panel", expectedQty: 50, actualQty: 50 },
      { componentId: "c2", componentName: "Back Panel", expectedQty: 50, actualQty: 50 },
      { componentId: "c3", componentName: "Sleeves", expectedQty: 100, actualQty: 100 },
      { componentId: "c4", componentName: "Collar", expectedQty: 50, actualQty: 50 },
      { componentId: "c5", componentName: "Cuffs", expectedQty: 100, actualQty: 100 },
    ];

    it("allows approval when all components are MATCH (GREEN)", () => {
      const evalRes = evaluateVerificationBatch(mockItems);
      expect(evalRes.canApprove).toBe(true);
      expect(evalRes.countedComponents).toBe(5);
      expect(evalRes.uncountedComponents).toBe(0);
      expect(evalRes.shortCount).toBe(0);
      expect(evalRes.matchCount).toBe(5);
      expect(evalRes.blockers).toHaveLength(0);
    });

    it("allows approval when batch has MATCH and EXCESS (GREEN and YELLOW)", () => {
      const itemsWithExcess = mockItems.map((item, idx) =>
        idx === 4 ? { ...item, actualQty: 102 } : item
      );
      const evalRes = evaluateVerificationBatch(itemsWithExcess);
      expect(evalRes.canApprove).toBe(true);
      expect(evalRes.matchCount).toBe(4);
      expect(evalRes.excessCount).toBe(1);
      expect(evalRes.shortCount).toBe(0);
      expect(evalRes.blockers).toHaveLength(0);
    });

    it("blocks approval (canApprove false) if any component is SHORT (RED)", () => {
      const itemsWithShort = mockItems.map((item, idx) =>
        idx === 4 ? { ...item, actualQty: 98 } : item
      );
      const evalRes = evaluateVerificationBatch(itemsWithShort);
      expect(evalRes.canApprove).toBe(false);
      expect(evalRes.shortCount).toBe(1);
      expect(evalRes.blockers).toHaveLength(1);
      expect(evalRes.blockers[0]).toMatchObject({
        componentName: "Cuffs",
        reason: "SHORTAGE",
        expectedQty: 100,
        actualQty: 98,
      });
      expect(evalRes.blockers[0].message).toContain("short by 2");
    });

    it("blocks approval if any component is uncounted (null)", () => {
      const itemsWithNull = mockItems.map((item, idx) =>
        idx === 4 ? { ...item, actualQty: null } : item
      );
      const evalRes = evaluateVerificationBatch(itemsWithNull);
      expect(evalRes.canApprove).toBe(false);
      expect(evalRes.uncountedComponents).toBe(1);
      expect(evalRes.blockers).toHaveLength(1);
      expect(evalRes.blockers[0].reason).toBe("UNCOUNTED");
    });

    it("blocks approval on empty items array", () => {
      const evalRes = evaluateVerificationBatch([]);
      expect(evalRes.canApprove).toBe(false);
      expect(evalRes.totalComponents).toBe(0);
    });
  });
});
