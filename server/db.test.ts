import { describe, expect, it } from "vitest";
import { getMonthDateRange } from "./db";

describe("getMonthDateRange", () => {
  it("uses the real last day for 30-day months", () => {
    expect(getMonthDateRange(2026, 6)).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
  });

  it("handles February in common and leap years", () => {
    expect(getMonthDateRange(2026, 2)).toEqual({
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });

    expect(getMonthDateRange(2028, 2)).toEqual({
      startDate: "2028-02-01",
      endDate: "2028-02-29",
    });
  });
});
