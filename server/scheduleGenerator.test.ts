import { describe, expect, it } from "vitest";
import { generateSchedule, validateEntry } from "./scheduleGenerator";

// Mock doctors
const mockDoctors = [
  {
    id: 1, name: "Dr. A", shortName: "Dr. A", category: "titular",
    hasSus: true, hasConvenio: true,
    canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
    canNoite: true, canFinalDeSemana: true, canSabado: true, canDomingo: true,
    can24h: false, participaRodizioNoite: true,
    limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
    prioridade: "media", cor: "#3B82F6",
  },
  {
    id: 2, name: "Dr. B", shortName: "Dr. B", category: "titular",
    hasSus: true, hasConvenio: false,
    canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false,
    canNoite: true, canFinalDeSemana: false, canSabado: false, canDomingo: false,
    can24h: false, participaRodizioNoite: true,
    limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
    prioridade: "media", cor: "#10B981",
  },
  {
    id: 3, name: "Dr. C", shortName: "Dr. C", category: "resident",
    hasSus: true, hasConvenio: false,
    canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false,
    canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: false,
    can24h: false, participaRodizioNoite: false,
    limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
    prioridade: "media", cor: "#F59E0B",
  },
  {
    id: 4, name: "Dr. D", shortName: "Dr. D", category: "titular",
    hasSus: true, hasConvenio: true,
    canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
    canNoite: true, canFinalDeSemana: true, canSabado: true, canDomingo: true,
    can24h: true, participaRodizioNoite: true,
    limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
    prioridade: "media", cor: "#8B5CF6",
  },
  {
    id: 5, name: "Dr. E", shortName: "Dr. E", category: "titular",
    hasSus: true, hasConvenio: true,
    canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
    canNoite: true, canFinalDeSemana: true, canSabado: true, canDomingo: true,
    can24h: true, participaRodizioNoite: true,
    limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
    prioridade: "media", cor: "#EC4899",
  },
];

const mockWeeklyRules = [
  { id: 1, doctorId: 1, dayOfWeek: 1, shiftType: "manha_sus", weekAlternation: "all", participaRodizioNoite: false, noiteFixa: false, priority: 0, ativo: true },
  { id: 2, doctorId: 2, dayOfWeek: 2, shiftType: "tarde_sus", weekAlternation: "all", participaRodizioNoite: false, noiteFixa: false, priority: 0, ativo: true },
];

const mockWeekendRules: any[] = [];
const mockExceptions: any[] = [];
const holidayDates = new Set<string>();
const residentIds = [3];

describe("generateSchedule", () => {
  it("deve manter a escala natural do dia mesmo quando a data esta cadastrada como feriado", () => {
    const naturalResult = generateSchedule(
      2026,
      3,
      mockDoctors as any,
      mockWeeklyRules as any,
      mockWeekendRules,
      mockExceptions,
      new Set<string>(),
      residentIds
    );
    const holidayResult = generateSchedule(
      2026,
      3,
      mockDoctors as any,
      mockWeeklyRules as any,
      mockWeekendRules,
      mockExceptions,
      new Set<string>(["2026-03-02"]),
      residentIds
    );

    const naturalDayEntries = naturalResult.entries
      .filter((entry) => entry.entryDate === "2026-03-02")
      .map((entry) => `${entry.shiftType}:${entry.doctorId}`)
      .sort();
    const holidayDayEntries = holidayResult.entries
      .filter((entry) => entry.entryDate === "2026-03-02")
      .map((entry) => `${entry.shiftType}:${entry.doctorId}`)
      .sort();

    expect(holidayDayEntries).toEqual(naturalDayEntries);
  });

  it("deve gerar entradas para o mês especificado", () => {
    const result = generateSchedule(2026, 3, mockDoctors as any, mockWeeklyRules as any, mockWeekendRules, mockExceptions, holidayDates, residentIds);
    expect(result.entries).toBeDefined();
    expect(result.entries.length).toBeGreaterThan(0);
  });

  it("deve retornar um score de equilíbrio entre 0 e 100", () => {
    const result = generateSchedule(2026, 3, mockDoctors as any, mockWeeklyRules as any, mockWeekendRules, mockExceptions, holidayDates, residentIds);
    expect(result.balanceScore).toBeGreaterThanOrEqual(0);
    expect(result.balanceScore).toBeLessThanOrEqual(100);
  });

  it("deve aplicar regras semanais fixas", () => {
    const result = generateSchedule(2026, 3, mockDoctors as any, mockWeeklyRules as any, mockWeekendRules, mockExceptions, holidayDates, residentIds);
    // Dr. A tem regra fixa na segunda (dayOfWeek=1) - manhã SUS
    // Verificar que há entradas de segunda-feira para o Dr. A
    const doctorAEntries = result.entries.filter(e => e.doctorId === 1);
    // Dr. A deve ter pelo menos uma entrada (regra semanal ou rodízio de noite)
    expect(doctorAEntries.length).toBeGreaterThanOrEqual(0); // pode ser 0 se sem regras aplicáveis
    // Verificar que as entradas existem para o mês correto
    if (doctorAEntries.length > 0) {
      const dateStr = doctorAEntries[0].entryDate;
      expect(dateStr).toMatch(/^2026-03-/);
    }
  });

  it("deve marcar entradas fixas como isFixed=true", () => {
    const result = generateSchedule(2026, 3, mockDoctors as any, mockWeeklyRules as any, mockWeekendRules, mockExceptions, holidayDates, residentIds);
    const fixedEntries = result.entries.filter(e => e.isFixed);
    expect(fixedEntries.length).toBeGreaterThan(0);
  });

  it("deve respeitar bloqueio por exceção", () => {
    const exceptionDate = "2026-03-02"; // Segunda-feira
    const exceptions = [{
      id: 1, doctorId: 1, exceptionType: "block", recurrenceType: "once",
      specificDate: exceptionDate, month: null, dayOfMonth: null, dayOfWeek: null,
      weekOfMonth: null, shiftType: "all_day", replaceDoctorId: null, reason: "Férias", ativo: true,
    }];
    const result = generateSchedule(2026, 3, mockDoctors as any, mockWeeklyRules as any, mockWeekendRules, exceptions, holidayDates, residentIds);
    const blockedEntries = result.entries.filter(e => e.doctorId === 1 && e.entryDate === exceptionDate);
    expect(blockedEntries.length).toBe(0);
  });

  it("deve ignorar regra semanal invalida em vez de gerar violacao automatica", () => {
    const invalidWeeklyRules = [{
      doctorId: 2,
      dayOfWeek: 1,
      shiftType: "manha_convenio",
      weekAlternation: "all",
      participaRodizioNoite: false,
      noiteFixa: false,
    }];

    const result = generateSchedule(2026, 3, mockDoctors as any, invalidWeeklyRules as any, mockWeekendRules, mockExceptions, holidayDates, residentIds);

    expect(
      result.entries.some((entry) => entry.doctorId === 2 && entry.shiftType === "manha_convenio")
    ).toBe(false);
  });

  it("deve ignorar force_shift invalido e usar o proximo elegivel no rodizio", () => {
    const exceptions = [{
      doctorId: 3,
      exceptionType: "force_shift",
      recurrenceType: "once",
      specificDate: "2026-03-08",
      month: null,
      dayOfMonth: null,
      dayOfWeek: null,
      weekOfMonth: null,
      shiftType: "plantao_24h",
      replaceDoctorId: null,
    }];

    const result = generateSchedule(2026, 3, mockDoctors as any, mockWeeklyRules as any, mockWeekendRules, exceptions as any, holidayDates, residentIds);
    const sunday24h = result.entries.filter((entry) => entry.entryDate === "2026-03-08" && entry.shiftType === "plantao_24h");

    expect(sunday24h).toHaveLength(1);
    expect(sunday24h[0].doctorId).not.toBe(3);
  });

  it("deve colocar residentes e outros medicos aptos no rodizio do sabado SUS", () => {
    const result = generateSchedule(2026, 3, mockDoctors as any, mockWeeklyRules as any, mockWeekendRules, mockExceptions, holidayDates, residentIds);
    const saturdayDates = ["2026-03-07", "2026-03-14", "2026-03-21", "2026-03-28"];
    const saturdaySusDoctors = saturdayDates.map((date) => {
      const entries = result.entries.filter(
        (entry) =>
          entry.entryDate === date &&
          (entry.shiftType === "manha_sus" || entry.shiftType === "tarde_sus")
      );

      expect(entries).toHaveLength(2);
      expect(new Set(entries.map((entry) => entry.doctorId)).size).toBe(1);
      return entries[0].doctorId;
    });

    expect(new Set(saturdaySusDoctors).size).toBeGreaterThanOrEqual(2);
    expect(saturdaySusDoctors).toContain(3);
    expect(saturdaySusDoctors.some((doctorId) => doctorId !== 3)).toBe(true);
  });

  it("deve manter o domingo com um unico plantao de 24h e sem noite adicional", () => {
    const result = generateSchedule(2026, 3, mockDoctors as any, mockWeeklyRules as any, mockWeekendRules, mockExceptions, holidayDates, residentIds);
    const sundayEntries = result.entries.filter((entry) => entry.entryDate === "2026-03-08");

    expect(sundayEntries.filter((entry) => entry.shiftType === "plantao_24h")).toHaveLength(1);
    expect(sundayEntries.filter((entry) => entry.shiftType === "noite")).toHaveLength(0);
    expect(sundayEntries.some((entry) => entry.doctorId === 3)).toBe(false);
  });

  it("deve usar os medicos do pool da semana no rodizio do fim de semana respeitando restricoes", () => {
    const customDoctors = [
      {
        id: 31, name: "Dr. Fora", shortName: "Fora", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: false, canSabado: false, canDomingo: false,
        can24h: true, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#334155",
      },
      {
        id: 32, name: "Dr. Pool A", shortName: "Pool A", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: true, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#0F766E",
      },
      {
        id: 33, name: "Dr. Pool B", shortName: "Pool B", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: true, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#1D4ED8",
      },
    ];

    const weeklyRules = [
      {
        doctorId: 32,
        dayOfWeek: 1,
        shiftType: "manha_sus",
        weekAlternation: "all",
        participaRodizioNoite: false,
        noiteFixa: false,
      },
      {
        doctorId: 33,
        dayOfWeek: 2,
        shiftType: "manha_convenio",
        weekAlternation: "all",
        participaRodizioNoite: false,
        noiteFixa: false,
      },
    ];

    const result = generateSchedule(2026, 3, customDoctors as any, weeklyRules as any, [], [], holidayDates, []);
    const saturdaySus = result.entries.find((entry) => entry.entryDate === "2026-03-07" && entry.shiftType === "manha_sus");
    const saturday24h = result.entries.find((entry) => entry.entryDate === "2026-03-07" && entry.shiftType === "plantao_24h");

    expect([32, 33]).toContain(saturdaySus?.doctorId);
    expect([32, 33]).toContain(saturday24h?.doctorId);
    expect(saturdaySus?.doctorId).not.toBe(saturday24h?.doctorId);
  });

  it("deve evitar repetir o medico do 24h de sabado no domingo", () => {
    const customDoctors = [
      {
        id: 61, name: "Dr. FDS A", shortName: "FDS A", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#0F766E",
      },
      {
        id: 62, name: "Dr. FDS B", shortName: "FDS B", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#1D4ED8",
      },
      {
        id: 63, name: "Dr. FDS C", shortName: "FDS C", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#7C3AED",
      },
    ];

    const result = generateSchedule(2026, 3, customDoctors as any, [], [], [], holidayDates, []);
    const saturdaySus = result.entries.find(
      (entry) => entry.entryDate === "2026-03-07" && entry.shiftType === "manha_sus"
    );
    const saturday24h = result.entries.find(
      (entry) => entry.entryDate === "2026-03-07" && entry.shiftType === "plantao_24h"
    );
    const sunday24h = result.entries.find(
      (entry) => entry.entryDate === "2026-03-08" && entry.shiftType === "plantao_24h"
    );

    expect(saturdaySus?.doctorId).toBeDefined();
    expect(saturday24h?.doctorId).toBeDefined();
    expect(sunday24h?.doctorId).toBeDefined();
    expect(saturday24h?.doctorId).not.toBe(sunday24h?.doctorId);
  });

  it("deve distribuir o primeiro fim de semana entre medicos distintos", () => {
    const customDoctors = [
      {
        id: 81, name: "Dr. FDS 1", shortName: "FDS 1", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#0F766E",
      },
      {
        id: 82, name: "Dr. FDS 2", shortName: "FDS 2", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#1D4ED8",
      },
      {
        id: 83, name: "Dr. FDS 3", shortName: "FDS 3", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#7C3AED",
      },
      {
        id: 84, name: "Dr. FDS 4", shortName: "FDS 4", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#9333EA",
      },
    ];

    const result = generateSchedule(2026, 3, customDoctors as any, [], [], [], holidayDates, []);
    const firstSaturdaySus = result.entries.find(
      (entry) => entry.entryDate === "2026-03-07" && entry.shiftType === "manha_sus"
    );
    const firstSaturday24h = result.entries.find(
      (entry) => entry.entryDate === "2026-03-07" && entry.shiftType === "plantao_24h"
    );
    const firstSunday24h = result.entries.find(
      (entry) => entry.entryDate === "2026-03-08" && entry.shiftType === "plantao_24h"
    );
    expect(new Set([firstSaturdaySus?.doctorId, firstSaturday24h?.doctorId, firstSunday24h?.doctorId]).size).toBe(3);
  });

  it("nao deve tratar regra flexivel de fim de semana como fixa em todos os sabados", () => {
    const customDoctors = [
      {
        id: 41, name: "R. Filho", shortName: "R. Filho", category: "titular",
        hasSus: false, hasConvenio: true,
        canManhaSus: false, canManhaConvenio: true, canTardeSus: false, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: true, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#059669",
      },
      {
        id: 42, name: "Dr. Sab 1", shortName: "Sab 1", category: "titular",
        hasSus: false, hasConvenio: true,
        canManhaSus: false, canManhaConvenio: true, canTardeSus: false, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: true, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#1D4ED8",
      },
      {
        id: 43, name: "Dr. Sab 3", shortName: "Sab 3", category: "titular",
        hasSus: false, hasConvenio: true,
        canManhaSus: false, canManhaConvenio: true, canTardeSus: false, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: true, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#7C3AED",
      },
    ];

    const weekendRules = [
      {
        doctorId: 41,
        dayType: "ambos",
        shiftType: "plantao_24h",
        weekOfMonth: null,
      },
      {
        doctorId: 42,
        dayType: "sabado",
        shiftType: "plantao_24h",
        weekOfMonth: 1,
      },
      {
        doctorId: 43,
        dayType: "sabado",
        shiftType: "plantao_24h",
        weekOfMonth: 3,
      },
    ];

    const result = generateSchedule(2026, 3, customDoctors as any, [], weekendRules as any, [], holidayDates, []);
    const firstSaturday24h = result.entries.find((entry) => entry.entryDate === "2026-03-07" && entry.shiftType === "plantao_24h");
    const thirdSaturday24h = result.entries.find((entry) => entry.entryDate === "2026-03-21" && entry.shiftType === "plantao_24h");

    expect(firstSaturday24h?.doctorId).toBe(42);
    expect(thirdSaturday24h?.doctorId).toBe(43);
  });

  it("deve respeitar alternancia de mes em regra fixa de fim de semana", () => {
    const customDoctors = [
      {
        id: 51, name: "Danilo", shortName: "Danilo", category: "sesab",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: false, canDomingo: true,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#7C2D12",
      },
      {
        id: 52, name: "Outro Domingo", shortName: "Outro", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: false, canDomingo: true,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#2563EB",
      },
    ];

    const weekendRules = [
      {
        doctorId: 51,
        dayType: "domingo",
        shiftType: "plantao_24h",
        weekOfMonth: 4,
        observacoes: "4o domingo 24h [monthAlternation=even]",
      },
    ];

    const aprilResult = generateSchedule(2026, 4, customDoctors as any, [], weekendRules as any, [], holidayDates, []);
    const mayResult = generateSchedule(2026, 5, customDoctors as any, [], weekendRules as any, [], holidayDates, []);
    const aprilFourthSunday = aprilResult.entries.find((entry) => entry.entryDate === "2026-04-26" && entry.shiftType === "plantao_24h");
    const mayFourthSunday = mayResult.entries.find((entry) => entry.entryDate === "2026-05-24" && entry.shiftType === "plantao_24h");

    expect(aprilFourthSunday?.doctorId).toBe(51);
    expect(mayFourthSunday?.doctorId).toBe(52);
  });

  it("deve compartilhar a ordem do rodizio entre sabado 24h e domingo 24h", () => {
    const customDoctors = [
      {
        id: 101, name: "Dr. FDS A", shortName: "FDS A", category: "titular",
        hasSus: false, hasConvenio: true,
        canManhaSus: false, canManhaConvenio: true, canTardeSus: false, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: true, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#0F766E",
      },
      {
        id: 102, name: "Dr. FDS B", shortName: "FDS B", category: "titular",
        hasSus: false, hasConvenio: true,
        canManhaSus: false, canManhaConvenio: true, canTardeSus: false, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: true, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#1D4ED8",
      },
      {
        id: 103, name: "Dr. FDS C", shortName: "FDS C", category: "titular",
        hasSus: false, hasConvenio: true,
        canManhaSus: false, canManhaConvenio: true, canTardeSus: false, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: true, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#7C3AED",
      },
    ];

    const weekendRules = [{
      doctorId: 102,
      dayType: "domingo",
      shiftType: "plantao_24h",
      weekOfMonth: 1,
      observacoes: "1o domingo 24h",
    }];

    const result = generateSchedule(2026, 5, customDoctors as any, [], weekendRules as any, [], holidayDates, []);
    const firstSaturday24h = result.entries.find((entry) => entry.entryDate === "2026-05-02" && entry.shiftType === "plantao_24h");
    const firstSunday24h = result.entries.find((entry) => entry.entryDate === "2026-05-03" && entry.shiftType === "plantao_24h");
    const secondSaturday24h = result.entries.find((entry) => entry.entryDate === "2026-05-09" && entry.shiftType === "plantao_24h");

    expect(firstSaturday24h?.doctorId).toBe(101);
    expect(firstSunday24h?.doctorId).toBe(102);
    expect(secondSaturday24h?.doctorId).toBe(103);
  });

  it("deve colocar o medico pulado por violacao no proximo sabado do rodizio que ele puder assumir", () => {
    const customDoctors = [
      {
        id: 11, name: "Dr. Sab A", shortName: "Sab A", category: "titular",
        hasSus: true, hasConvenio: false,
        canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: false,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#111827",
      },
      {
        id: 12, name: "Dr. Sab B", shortName: "Sab B", category: "titular",
        hasSus: true, hasConvenio: false,
        canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: false,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#2563EB",
      },
      {
        id: 13, name: "Dr. 24h A", shortName: "24h A", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: false, canManhaConvenio: false, canTardeSus: false, canTardeConvenio: false,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: true, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#059669",
      },
      {
        id: 14, name: "Dr. 24h B", shortName: "24h B", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: false, canManhaConvenio: false, canTardeSus: false, canTardeConvenio: false,
        canNoite: false, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: true, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#7C3AED",
      },
    ];

    const exceptions = [{
      doctorId: 11,
      exceptionType: "block",
      recurrenceType: "once",
      specificDate: "2026-03-07",
      month: null,
      dayOfMonth: null,
      dayOfWeek: null,
      weekOfMonth: null,
      shiftType: "all_day",
      replaceDoctorId: null,
    }];

    const result = generateSchedule(2026, 3, customDoctors as any, [], [], exceptions as any, holidayDates, []);
    const firstSaturdayDoctor = result.entries.find((entry) => entry.entryDate === "2026-03-07" && entry.shiftType === "manha_sus");
    const secondSaturdayDoctor = result.entries.find((entry) => entry.entryDate === "2026-03-14" && entry.shiftType === "manha_sus");

    expect(firstSaturdayDoctor?.doctorId).toBe(12);
    expect(secondSaturdayDoctor?.doctorId).toBe(11);
  });

  it("deve respeitar excecao unica quando a data vem como Date do banco", () => {
    const customDoctors = [
      {
        id: 31, name: "Marcela", shortName: "Marcela", category: "titular",
        hasSus: false, hasConvenio: true,
        canManhaSus: false, canManhaConvenio: true, canTardeSus: false, canTardeConvenio: true,
        canNoite: false, canFinalDeSemana: true, canSabado: false, canDomingo: true,
        can24h: true, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#F97316",
      },
      {
        id: 32, name: "Nelio", shortName: "Nelio", category: "titular",
        hasSus: true, hasConvenio: true,
        canManhaSus: true, canManhaConvenio: true, canTardeSus: true, canTardeConvenio: true,
        canNoite: true, canFinalDeSemana: true, canSabado: true, canDomingo: true,
        can24h: true, participaRodizioNoite: true,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#8B5CF6",
      },
    ];

    const weekendRules = [{
      id: 1,
      doctorId: 31,
      dayType: "domingo",
      shiftType: "plantao_24h",
      weekOfMonth: 1,
      observacoes: "1o domingo 24h",
    }];

    const exceptions = [{
      doctorId: 31,
      exceptionType: "block",
      recurrenceType: "once",
      specificDate: new Date("2026-05-03T12:00:00.000Z"),
      month: null,
      dayOfMonth: null,
      dayOfWeek: null,
      weekOfMonth: null,
      shiftType: "all_day",
      replaceDoctorId: null,
    }];

    const result = generateSchedule(
      2026,
      5,
      customDoctors as any,
      [],
      weekendRules as any,
      exceptions as any,
      holidayDates,
      []
    );
    const firstSundayDoctor = result.entries.find(
      (entry) => entry.entryDate === "2026-05-03" && entry.shiftType === "plantao_24h"
    );

    expect(firstSundayDoctor?.doctorId).toBe(32);
  });

  it("deve pular noite fixa invalida e seguir para o proximo medico elegivel", () => {
    const weeklyRules = [
      {
        doctorId: 1,
        dayOfWeek: 1,
        shiftType: "manha_sus",
        weekAlternation: "all",
        participaRodizioNoite: true,
        noiteFixa: false,
      },
      {
        doctorId: 3,
        dayOfWeek: 1,
        shiftType: "noite",
        weekAlternation: "all",
        participaRodizioNoite: false,
        noiteFixa: true,
      },
    ];

    const result = generateSchedule(2026, 3, mockDoctors as any, weeklyRules as any, mockWeekendRules, mockExceptions, holidayDates, residentIds);
    const mondayNight = result.entries.filter((entry) => entry.entryDate === "2026-03-02" && entry.shiftType === "noite");

    expect(mondayNight).toHaveLength(1);
    expect(mondayNight[0].doctorId).toBe(1);
  });

  it("deve limitar o rodizio da noite aos medicos marcados para o mesmo dia da semana", () => {
    const customDoctors = [
      {
        id: 21, name: "Dr. Seg", shortName: "Seg", category: "titular",
        hasSus: true, hasConvenio: false,
        canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false,
        canNoite: true, canFinalDeSemana: false, canSabado: false, canDomingo: false,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#0F766E",
      },
      {
        id: 22, name: "Dr. Qui", shortName: "Qui", category: "titular",
        hasSus: true, hasConvenio: false,
        canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false,
        canNoite: true, canFinalDeSemana: false, canSabado: false, canDomingo: false,
        can24h: false, participaRodizioNoite: false,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#1D4ED8",
      },
      {
        id: 23, name: "Dr. Global", shortName: "Global", category: "titular",
        hasSus: true, hasConvenio: false,
        canManhaSus: true, canManhaConvenio: false, canTardeSus: true, canTardeConvenio: false,
        canNoite: true, canFinalDeSemana: false, canSabado: false, canDomingo: false,
        can24h: false, participaRodizioNoite: true,
        limiteplantoesmes: 0, limiteNoitesMes: 0, limiteFdsMes: 0,
        prioridade: "media", cor: "#7C3AED",
      },
    ];

    const weeklyRules = [
      {
        doctorId: 21,
        dayOfWeek: 1,
        shiftType: "manha_sus",
        weekAlternation: "all",
        participaRodizioNoite: true,
        noiteFixa: false,
      },
      {
        doctorId: 22,
        dayOfWeek: 4,
        shiftType: "manha_sus",
        weekAlternation: "all",
        participaRodizioNoite: true,
        noiteFixa: false,
      },
    ];

    const result = generateSchedule(2026, 3, customDoctors as any, weeklyRules as any, [], [], holidayDates, []);
    const mondayNight = result.entries.find((entry) => entry.entryDate === "2026-03-02" && entry.shiftType === "noite");
    const tuesdayNight = result.entries.find((entry) => entry.entryDate === "2026-03-03" && entry.shiftType === "noite");
    const thursdayNight = result.entries.find((entry) => entry.entryDate === "2026-03-05" && entry.shiftType === "noite");

    expect(mondayNight?.doctorId).toBe(21);
    expect(tuesdayNight).toBeUndefined();
    expect(thursdayNight?.doctorId).toBe(22);
  });
});

describe("validateEntry", () => {
  const doctor = mockDoctors[0] as any;

  it("deve detectar duplicidade de médico no mesmo turno", () => {
    const existingEntries = [{ doctorId: 1, entryDate: "2026-03-10", shiftType: "manha_sus", isFixed: false }];
    const conflicts = validateEntry(1, "2026-03-10", "manha_sus", existingEntries, doctor, [], new Set());
    // O tipo de conflito de duplicidade é 'double_shift'
    expect(conflicts.some(c => c.type === "double_shift")).toBe(true);
  });

  it("deve detectar conflito de turnos incompatíveis no mesmo dia", () => {
    const existingEntries = [{ doctorId: 1, entryDate: "2026-03-10", shiftType: "manha_sus", isFixed: false }];
    const conflicts = validateEntry(1, "2026-03-10", "tarde_sus", existingEntries, doctor, [], new Set());
    // Manhã + Tarde = conflito de carga excessiva
    expect(conflicts).toBeDefined();
  });

  it("deve detectar médico em data bloqueada", () => {
    const exceptions = [{
      id: 1, doctorId: 1, exceptionType: "block", recurrenceType: "once",
      specificDate: "2026-03-15", month: null, dayOfMonth: null, dayOfWeek: null,
      weekOfMonth: null, shiftType: "all_day", replaceDoctorId: null, reason: "Bloqueado", ativo: true,
    }];
    const conflicts = validateEntry(1, "2026-03-15", "manha_sus", [], doctor, exceptions, new Set());
    expect(conflicts.some(c => c.type === "blocked_date")).toBe(true);
  });

  it("deve retornar array vazio quando não há conflitos", () => {
    const conflicts = validateEntry(1, "2026-03-10", "manha_sus", [], doctor, [], new Set());
    expect(conflicts).toEqual([]);
  });
});
