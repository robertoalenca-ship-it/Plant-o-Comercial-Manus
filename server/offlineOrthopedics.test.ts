import { describe, expect, it } from "vitest";
import {
  april2026ManualEntries,
} from "../april-may-2026-source.mjs";
import type { TrpcContext } from "./_core/context";
import {
  OFFLINE_PRELOADED_MONTH,
  OFFLINE_PRELOADED_YEAR,
  OFFLINE_PROFILE_ID,
  getOfflineEntriesForSchedule,
  getOfflineScheduleByMonth,
  offlineDoctors,
  offlineExceptions,
  offlineWeeklyRules,
  offlineWeekendRules,
} from "./offlineOrthopedics";
import { appRouter } from "./routers";

function createOfflineOrthopedicsContext(
  scheduleProfileId: number = OFFLINE_PROFILE_ID
): TrpcContext {
  const now = new Date();

  return {
    user: {
      id: 1,
      openId: "offline-admin",
      email: "offline@example.test",
      name: "Offline Admin",
      loginMethod: "local-dev",
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    scheduleProfileId,
    req: {
      protocol: "http",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
}

describe("offline orthopedics fallback", () => {
  it("exposes the active orthopedics doctors even without database connectivity", () => {
    const activeDoctorNames = offlineDoctors
      .filter((doctor) => doctor.ativo)
      .map((doctor) => doctor.name);

    expect(activeDoctorNames).toContain("Humberto");
    expect(activeDoctorNames).not.toContain("Juarez");
  });

  it("keeps April 2026 preloaded with the manual table entries", () => {
    const aprilSchedule = getOfflineScheduleByMonth(
      OFFLINE_PRELOADED_YEAR,
      OFFLINE_PRELOADED_MONTH
    );

    expect(aprilSchedule).toBeDefined();
    expect(getOfflineEntriesForSchedule(aprilSchedule!.id)).toHaveLength(
      april2026ManualEntries.length
    );
  });

  it("provides the orthopedics weekly, weekend and exception rules in offline mode", () => {
    expect(offlineWeeklyRules.length).toBeGreaterThan(0);
    expect(offlineWeekendRules.length).toBeGreaterThan(0);
    expect(offlineExceptions.length).toBeGreaterThan(0);
  });

  it("generates a new orthopedics month even when the database is unavailable", async () => {
    const caller = appRouter.createCaller(createOfflineOrthopedicsContext());

    const generated = await caller.schedules.generate({ year: 2026, month: 5 });
    const maySchedule = await caller.schedules.getByMonth({ year: 2026, month: 5 });

    expect(generated.scheduleId).toBe(202605);
    expect(generated.entries.length).toBeGreaterThan(0);
    expect(maySchedule).not.toBeNull();
    expect(maySchedule?.entries.length).toBeGreaterThan(0);
  });

  it("keeps the saturday SUS rotation sequential across the eligible doctors in May 2026", async () => {
    const caller = appRouter.createCaller(createOfflineOrthopedicsContext());

    await caller.schedules.generate({ year: 2026, month: 5 });
    const maySchedule = await caller.schedules.getByMonth({ year: 2026, month: 5 });

    const doctorById = new Map(
      offlineDoctors.map((doctor) => [doctor.id, doctor.name])
    );
    const saturdaySusDoctors = (maySchedule?.entries ?? [])
      .filter((entry) => {
        const date = new Date(
          `${String(entry.entryDate).slice(0, 10)}T12:00:00`
        );
        return date.getDay() === 6 && entry.shiftType === "manha_sus";
      })
      .map((entry) => doctorById.get(entry.doctorId));

    expect(saturdaySusDoctors).toEqual([
      "Humberto",
      "Luiz Rogerio",
      "Daniel Souza",
      "Roberto Filho",
      "Caio Petruz",
    ]);
    expect(
      saturdaySusDoctors.filter((doctor) => doctor === "Caio Petruz")
    ).toHaveLength(1);
  });

  it("does not assign Roberto Filho to both Saturday and Sunday in the same May weekend cycle", async () => {
    const caller = appRouter.createCaller(createOfflineOrthopedicsContext());

    await caller.schedules.generate({ year: 2026, month: 5 });
    const maySchedule = await caller.schedules.getByMonth({ year: 2026, month: 5 });

    const doctorById = new Map(
      offlineDoctors.map((doctor) => [doctor.id, doctor.name])
    );
    const robertoWeekendEntries = (maySchedule?.entries ?? []).filter((entry) => {
      const date = new Date(
        `${String(entry.entryDate).slice(0, 10)}T12:00:00`
      );
      return (
        doctorById.get(entry.doctorId) === "Roberto Filho" &&
        (date.getDay() === 6 || date.getDay() === 0) &&
        ["manha_sus", "tarde_sus", "plantao_24h"].includes(entry.shiftType)
      );
    });

    expect(robertoWeekendEntries).toHaveLength(2);
    expect(
      robertoWeekendEntries.map((entry) => ({
        date: String(entry.entryDate).slice(0, 10),
        shiftType: entry.shiftType,
      }))
    ).toEqual([
      { date: "2026-05-23", shiftType: "manha_sus" },
      { date: "2026-05-23", shiftType: "tarde_sus" },
    ]);
  });

  it("updates doctors in offline mode without requiring the database", async () => {
    const caller = appRouter.createCaller(createOfflineOrthopedicsContext());
    const humberto = offlineDoctors.find((doctor) => doctor.name === "Humberto");

    expect(humberto).toBeDefined();

    await caller.doctors.update({
      id: humberto!.id,
      data: {
        canNoite: false,
        observacoes: "Atualizado offline",
      },
    });

    const updated = await caller.doctors.getById({ id: humberto!.id });

    expect(updated?.canNoite).toBe(false);
    expect(updated?.observacoes).toBe("Atualizado offline");
  });

  it("creates an additional medical profile offline and keeps its doctors isolated", async () => {
    const rootCaller = appRouter.createCaller(createOfflineOrthopedicsContext());

    const createdProfile = await rootCaller.scheduleProfiles.create({
      name: "Clinica Medica",
      description: "Escala medica separada",
    });

    expect(createdProfile?.name).toBe("Clinica Medica");

    const clinicCaller = appRouter.createCaller(
      createOfflineOrthopedicsContext(createdProfile!.id)
    );

    await clinicCaller.doctors.create({
      name: "Dr. Teste",
      shortName: "Teste",
      category: "titular",
      hasSus: true,
      hasConvenio: false,
      canManhaSus: true,
      canManhaConvenio: false,
      canTardeSus: true,
      canTardeConvenio: false,
      canNoite: false,
      canFinalDeSemana: false,
      canSabado: false,
      canDomingo: false,
      can24h: false,
      participaRodizioNoite: false,
      prioridade: "media",
      cor: "#2563EB",
    });

    const clinicDoctors = await clinicCaller.doctors.list();
    const orthopedicsDoctors = await rootCaller.doctors.list();

    expect(clinicDoctors.map((doctor) => doctor.name)).toContain("Dr. Teste");
    expect(orthopedicsDoctors.map((doctor) => doctor.name)).not.toContain(
      "Dr. Teste"
    );
  });

  it("stores weekly rules offline for a newly created medical profile", async () => {
    const rootCaller = appRouter.createCaller(createOfflineOrthopedicsContext());

    const createdProfile = await rootCaller.scheduleProfiles.create({
      name: "Pediatria",
      description: "Escala medica pediatrica",
    });

    const pediatricsCaller = appRouter.createCaller(
      createOfflineOrthopedicsContext(createdProfile!.id)
    );

    await pediatricsCaller.doctors.create({
      name: "Dra. Pediatra",
      shortName: "Pediatra",
      category: "titular",
      hasSus: true,
      hasConvenio: true,
      canManhaSus: true,
      canManhaConvenio: true,
      canTardeSus: true,
      canTardeConvenio: true,
      canNoite: false,
      canFinalDeSemana: false,
      canSabado: false,
      canDomingo: false,
      can24h: false,
      participaRodizioNoite: false,
      prioridade: "media",
      cor: "#9333EA",
    });

    const doctor = (await pediatricsCaller.doctors.list()).find(
      (item) => item.name === "Dra. Pediatra"
    );

    expect(doctor).toBeDefined();

    await pediatricsCaller.weeklyRules.create({
      doctorId: doctor!.id,
      dayOfWeek: 1,
      shiftType: "manha_sus",
      weekAlternation: "all",
      participaRodizioNoite: false,
      noiteFixa: false,
      priority: 0,
      observacoes: "Regra semanal offline",
    });

    const weeklyRules = await pediatricsCaller.weeklyRules.list();

    expect(
      weeklyRules.some(
        (rule) =>
          rule.doctorId === doctor!.id &&
          rule.shiftType === "manha_sus" &&
          rule.observacoes === "Regra semanal offline"
      )
    ).toBe(true);
  });
});
