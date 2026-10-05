import { describe, it, expect } from "vitest";
import {
  formatDateTime,
  formatDate,
  formatTime,
  formatDuration,
  formatRelative,
  formatYards,
  formatPct,
  formatQty,
  formatVariance,
  splitOrderNo,
} from "@/lib/format";

describe("format: factory time (Asia/Colombo, 24h)", () => {
  it("converts UTC to UTC+05:30", () => {
    expect(formatDateTime("2026-10-05T09:02:00Z")).toBe("5 Oct 2026, 14:32");
  });

  it("rolls the date over after local midnight", () => {
    expect(formatDateTime("2026-10-05T19:00:00Z")).toBe("6 Oct 2026, 00:30");
  });

  it("formats date-only and time-only", () => {
    expect(formatDate("2026-10-05T09:02:00Z")).toBe("5 Oct 2026");
    expect(formatTime("2026-10-05T09:02:00Z")).toBe("14:32");
  });

  it("returns the fallback for null or invalid values", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("not-a-date", "n/a")).toBe("n/a");
  });
});

describe("format: durations", () => {
  const min = 60_000;
  const hour = 60 * min;
  it("renders compact durations", () => {
    expect(formatDuration(10_000)).toBe("just now");
    expect(formatDuration(12 * min)).toBe("12 m");
    expect(formatDuration(2 * hour + 14 * min)).toBe("2 h 14 m");
    expect(formatDuration(3 * hour)).toBe("3 h");
    expect(formatDuration(28 * hour)).toBe("1 d 4 h");
  });

  it("renders relative labels", () => {
    const now = Date.parse("2026-10-05T12:00:00Z");
    expect(formatRelative("2026-10-05T09:46:00Z", now)).toBe("2 h 14 m ago");
    expect(formatRelative("2026-10-05T11:59:40Z", now)).toBe("just now");
  });
});

describe("format: numbers", () => {
  it("formats yards to two decimals", () => {
    expect(formatYards(94.5)).toBe("94.50");
    expect(formatYards("108")).toBe("108.00");
    expect(formatYards(null)).toBe("—");
  });

  it("formats signed percentages", () => {
    expect(formatPct(5)).toBe("5.00 %");
    expect(formatPct(7, { signed: true })).toBe("+7.00 %");
    expect(formatPct(-12.5, { signed: true })).toBe("-12.50 %");
  });

  it("formats quantities and variances", () => {
    expect(formatQty(12000)).toBe("12,000");
    expect(formatVariance(2)).toBe("+2");
    expect(formatVariance(-3)).toBe("−3");
    expect(formatVariance(0)).toBe("0");
    expect(formatVariance(null)).toBe("—");
  });
});

describe("format: order number split", () => {
  it("dims the zero padding and keeps significant digits", () => {
    expect(splitOrderNo("CUT-000042")).toEqual({ lead: "CUT-0000", significant: "42" });
    expect(splitOrderNo("CUT-000100")).toEqual({ lead: "CUT-000", significant: "100" });
  });

  it("leaves non-standard numbers untouched", () => {
    expect(splitOrderNo("CUT-VER-1791204337674")).toEqual({
      lead: "",
      significant: "CUT-VER-1791204337674",
    });
  });
});
