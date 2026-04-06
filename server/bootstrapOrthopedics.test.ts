import { describe, expect, it } from "vitest";
import {
  offlineAprilEntries,
  offlineDoctors,
  offlineExceptions,
  offlineWeeklyRules,
  offlineWeekendRules,
} from "./offlineOrthopedics";

describe("bootstrap ortopedico", () => {
  it("mantem base minima para abril de 2026", () => {
    expect(offlineDoctors.length).toBeGreaterThan(10);
    expect(offlineWeeklyRules.length).toBeGreaterThan(10);
    expect(offlineWeekendRules.length).toBeGreaterThan(5);
    expect(offlineExceptions.length).toBeGreaterThan(0);
    expect(offlineAprilEntries.length).toBeGreaterThan(100);
  });
});
