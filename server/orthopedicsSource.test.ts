import { describe, expect, it } from "vitest";
import {
  doctorCatalog,
  doctorProfiles,
  may2026ExceptionsFromDoc,
  weeklyRulesFromDoc,
} from "../april-may-2026-source.mjs";

describe("orthopedics source configuration", () => {
  it("keeps Juarez inactive in the orthopedics base profile", () => {
    expect(doctorProfiles.juarez.ativo).toBe(false);
  });

  it("treats Wednesday night for Daniel Souza as rotation coverage instead of a fixed shift", () => {
    const wednesdayNightRule = weeklyRulesFromDoc.find(
      (rule) =>
        rule.doctorKey === "daniel_souza" &&
        rule.dayOfWeek === 3 &&
        rule.shiftType === "noite"
    );

    expect(wednesdayNightRule).toBeDefined();
    expect(wednesdayNightRule?.participatesNightRotation).toBe(true);
    expect(wednesdayNightRule?.fixedNight).toBe(false);
  });

  it("keeps Friday SUS afternoons assigned to residents on the 1st, 3rd and 5th Fridays", () => {
    const residentFridayRules = may2026ExceptionsFromDoc
      .filter(
        (exception) =>
          exception.exceptionType === "force_shift" &&
          exception.recurrenceType === "recurring" &&
          exception.dayOfWeek === 5 &&
          exception.shiftType === "tarde_sus"
      )
      .map((exception) => [exception.doctorKey, exception.weekOfMonth]);

    expect(residentFridayRules).toEqual([
      ["walesca", 1],
      ["caio_silva", 3],
      ["walesca", 5],
    ]);
  });

  it("overrides Marcela in May with a block on the first Sunday and a force shift on 17/05", () => {
    const marcelaMayExceptions = may2026ExceptionsFromDoc.filter(
      (exception) => exception.doctorKey === "marcela"
    );

    expect(
      marcelaMayExceptions.some(
        (exception) =>
          exception.exceptionType === "block" &&
          exception.specificDate === "2026-05-03" &&
          exception.shiftType === "all_day"
      )
    ).toBe(true);

    expect(
      marcelaMayExceptions.some(
        (exception) =>
          exception.exceptionType === "force_shift" &&
          exception.specificDate === "2026-05-17" &&
          exception.shiftType === "plantao_24h"
      )
    ).toBe(true);
  });

  it("accepts the Valesca spelling from the source material", () => {
    expect(doctorCatalog.walesca.aliases).toContain("Valesca");
  });
});
