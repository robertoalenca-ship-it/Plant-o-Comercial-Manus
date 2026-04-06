import type { InsertDoctor } from "../drizzle/schema";
import {
  createDoctor,
  createEntry,
  createException,
  createHoliday,
  createSchedule,
  createWeeklyRule,
  createWeekendRule,
  deleteEntriesForSchedule,
  deleteException,
  deleteWeeklyRule,
  deleteWeekendRule,
  getAllDoctors,
  getAllExceptions,
  getAllHolidays,
  getAllWeekendRules,
  getAllWeeklyRules,
  getDb,
  getScheduleByMonth,
  updateSchedule,
} from "./db";
import {
  OFFLINE_APRIL_SCHEDULE_ID,
  offlineDoctors,
} from "./offlineOrthopedics";

type OrthopedicsBaselineReport = {
  doctorsCreated: number;
  doctorsReused: number;
  weeklyRulesImported: number;
  weekendRulesImported: number;
  exceptionsImported: number;
  holidaysInserted: number;
  aprilEntriesImported: number;
  aprilScheduleId: number;
};

type SourceModule = {
  APRIL_IMPORT_TAG: string;
  SOURCE_TAG: string;
  april2026ManualEntries: Array<[string, string, string]>;
  doctorCatalog: Record<
    string,
    {
      displayName: string;
      aliases?: string[];
    }
  >;
  doctorProfiles: Record<string, Record<string, unknown>>;
  holidaysFromSource: Array<{
    name: string;
    holidayDate: string;
    isNational: boolean;
    recurrenceType: "annual" | "once";
  }>;
  may2026ExceptionsFromDoc: Array<Record<string, unknown>>;
  placeholderDoctors: Record<string, Record<string, unknown>>;
  recurringExceptionsFromDoc: Array<Record<string, unknown>>;
  sourceMaterialNotes: string[];
  weeklyRulesFromDoc: Array<Record<string, unknown>>;
  weekendRulesFromDoc: Array<Record<string, unknown>>;
};

type DoctorRecord = Awaited<ReturnType<typeof getAllDoctors>>[number];

function normalizeName(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bdra?\b/gi, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getDoctorMatchScore(doctor: DoctorRecord, aliases: string[]) {
  const normalizedName = normalizeName(doctor.name);
  const normalizedShortName = normalizeName(doctor.shortName);
  let score = 0;

  for (const alias of aliases) {
    const normalizedAlias = normalizeName(alias);

    if (!normalizedAlias) continue;
    if (normalizedName === normalizedAlias) score = Math.max(score, 100);
    if (normalizedShortName === normalizedAlias) score = Math.max(score, 95);
    if (normalizedName.includes(normalizedAlias)) score = Math.max(score, 40);
    if (normalizedAlias.includes(normalizedName)) score = Math.max(score, 35);
    if (normalizedShortName.includes(normalizedAlias)) score = Math.max(score, 30);
    if (normalizedAlias.includes(normalizedShortName)) score = Math.max(score, 25);
  }

  return score;
}

function getHolidayKey(item: {
  name: string;
  holidayDate: string | Date;
  recurrenceType: string;
}) {
  const holidayDate =
    typeof item.holidayDate === "string"
      ? item.holidayDate
      : item.holidayDate.toISOString().split("T")[0];

  if (item.recurrenceType === "annual") {
    return `${normalizeName(item.name)}|${holidayDate.slice(5)}|annual`;
  }

  return `${normalizeName(item.name)}|${holidayDate}|${item.recurrenceType}`;
}

function buildDoctorPayload(
  profileId: number,
  doctorKey: string,
  source: SourceModule
): InsertDoctor {
  const catalogEntry = source.doctorCatalog[doctorKey];
  const baseProfile =
    source.placeholderDoctors[doctorKey] ?? source.doctorProfiles[doctorKey];

  if (!catalogEntry || !baseProfile) {
    throw new Error(`Base do medico nao encontrada para ${doctorKey}`);
  }

  const note = String(
    baseProfile.observacoes ??
      "Cadastro base importado do material ortopedico de abril/maio 2026."
  );

  return {
    profileId,
    name: String(baseProfile.name ?? catalogEntry.displayName),
    shortName: String(baseProfile.shortName ?? catalogEntry.displayName),
    category: String(baseProfile.category ?? "titular") as
      | "titular"
      | "resident"
      | "sesab",
    hasSus: Boolean(baseProfile.hasSus),
    hasConvenio: Boolean(baseProfile.hasConvenio),
    canManhaSus: Boolean(baseProfile.canManhaSus),
    canManhaConvenio: Boolean(baseProfile.canManhaConvenio),
    canTardeSus: Boolean(baseProfile.canTardeSus),
    canTardeConvenio: Boolean(baseProfile.canTardeConvenio),
    canNoite: Boolean(baseProfile.canNoite),
    canFinalDeSemana: Boolean(baseProfile.canFinalDeSemana),
    canSabado: Boolean(baseProfile.canSabado),
    canDomingo: Boolean(baseProfile.canDomingo),
    can24h: Boolean(baseProfile.can24h),
    participaRodizioNoite: Boolean(baseProfile.participaRodizioNoite),
    limiteplantoesmes: Number(baseProfile.limiteplantoesmes ?? 0),
    limiteNoitesMes: Number(baseProfile.limiteNoitesMes ?? 0),
    limiteFdsMes: Number(baseProfile.limiteFdsMes ?? 0),
    prioridade: String(baseProfile.prioridade ?? "media") as
      | "baixa"
      | "media"
      | "alta",
    cor: String(baseProfile.cor ?? "#64748B"),
    observacoes: `${source.SOURCE_TAG} ${note}`.trim(),
    ativo:
      typeof baseProfile.ativo === "boolean" ? baseProfile.ativo : true,
  };
}

async function loadSourceModule(): Promise<SourceModule> {
  const source = (await import("../april-may-2026-source.mjs")) as unknown as SourceModule;
  return source;
}

async function resolveDoctorIds(
  profileId: number,
  source: SourceModule,
  report: OrthopedicsBaselineReport
) {
  const resolvedDoctorIds = new Map<string, number>();
  let doctors = await getAllDoctors(profileId);

  const sourceDoctorKeys = new Set<string>([
    ...source.april2026ManualEntries.map(([, , doctorKey]) => doctorKey),
    ...source.weeklyRulesFromDoc.map((item) => String(item.doctorKey)),
    ...source.weekendRulesFromDoc.map((item) => String(item.doctorKey)),
    ...source.recurringExceptionsFromDoc.map((item) => String(item.doctorKey)),
    ...source.recurringExceptionsFromDoc
      .map((item) => item.replaceDoctorKey)
      .filter(Boolean)
      .map((value) => String(value)),
    ...source.may2026ExceptionsFromDoc.map((item) => String(item.doctorKey)),
    ...source.may2026ExceptionsFromDoc
      .map((item) => item.replaceDoctorKey)
      .filter(Boolean)
      .map((value) => String(value)),
  ]);

  for (const doctorKey of Array.from(sourceDoctorKeys)) {
    const catalogEntry = source.doctorCatalog[doctorKey];

    if (!catalogEntry) {
      throw new Error(`doctorKey desconhecido: ${doctorKey}`);
    }

    const aliases = Array.from(
      new Set([catalogEntry.displayName, ...(catalogEntry.aliases ?? [])])
    );
    let matchedDoctor =
      doctors
        .map((doctor) => ({
          doctor,
          score: getDoctorMatchScore(doctor, aliases),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.doctor ?? null;

    if (!matchedDoctor) {
      await createDoctor(buildDoctorPayload(profileId, doctorKey, source));
      report.doctorsCreated += 1;
      doctors = await getAllDoctors(profileId);
      matchedDoctor =
        doctors
          .map((doctor) => ({
            doctor,
            score: getDoctorMatchScore(doctor, aliases),
          }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)[0]?.doctor ?? null;
    } else {
      report.doctorsReused += 1;
    }

    if (!matchedDoctor) {
      throw new Error(`Nao foi possivel resolver o medico ${doctorKey}`);
    }

    resolvedDoctorIds.set(doctorKey, matchedDoctor.id);
  }

  return resolvedDoctorIds;
}

export async function applyOrthopedicsBaseline(
  profileId: number
): Promise<OrthopedicsBaselineReport> {
  const db = await getDb();
  const source = await loadSourceModule();

  if (!db) {
    return {
      doctorsCreated: 0,
      doctorsReused: offlineDoctors.filter((doctor) => doctor.ativo).length,
      weeklyRulesImported: source.weeklyRulesFromDoc.length,
      weekendRulesImported: source.weekendRulesFromDoc.length,
      exceptionsImported:
        source.recurringExceptionsFromDoc.length +
        source.may2026ExceptionsFromDoc.length,
      holidaysInserted: source.holidaysFromSource.length,
      aprilEntriesImported: source.april2026ManualEntries.length,
      aprilScheduleId: OFFLINE_APRIL_SCHEDULE_ID,
    };
  }

  const report: OrthopedicsBaselineReport = {
    doctorsCreated: 0,
    doctorsReused: 0,
    weeklyRulesImported: 0,
    weekendRulesImported: 0,
    exceptionsImported: 0,
    holidaysInserted: 0,
    aprilEntriesImported: 0,
    aprilScheduleId: 0,
  };

  const resolvedDoctorIds = await resolveDoctorIds(profileId, source, report);

  const importedWeeklyRules = (await getAllWeeklyRules(profileId)).filter((rule: any) =>
    String(rule.observacoes ?? "").includes(source.SOURCE_TAG)
  );
  for (const rule of importedWeeklyRules) {
    await deleteWeeklyRule(rule.id, profileId);
  }

  for (const item of source.weeklyRulesFromDoc) {
    await createWeeklyRule({
      profileId,
      doctorId: resolvedDoctorIds.get(String(item.doctorKey))!,
      dayOfWeek: Number(item.dayOfWeek),
      shiftType: String(item.shiftType) as
        | "manha_sus"
        | "manha_convenio"
        | "tarde_sus"
        | "tarde_convenio"
        | "noite",
      weekAlternation: String(item.weekAlternation ?? "all") as
        | "all"
        | "odd"
        | "even",
      participaRodizioNoite: Boolean(item.participatesNightRotation),
      noiteFixa: Boolean(item.fixedNight),
      priority: 0,
      observacoes: `${source.SOURCE_TAG} ${String(item.note ?? "").trim()}`.trim(),
      ativo: true,
    });
    report.weeklyRulesImported += 1;
  }

  const importedWeekendRules = (await getAllWeekendRules(profileId)).filter((rule: any) =>
    String(rule.observacoes ?? "").includes(source.SOURCE_TAG)
  );
  for (const rule of importedWeekendRules) {
    await deleteWeekendRule(rule.id, profileId);
  }

  for (const item of source.weekendRulesFromDoc) {
    await createWeekendRule({
      profileId,
      doctorId: resolvedDoctorIds.get(String(item.doctorKey))!,
      dayType: String(item.dayType) as "sabado" | "domingo" | "ambos",
      shiftType: String(item.shiftType) as
        | "manha_sus"
        | "manha_convenio"
        | "tarde_sus"
        | "tarde_convenio"
        | "noite"
        | "plantao_24h",
      weekOfMonth:
        item.weekOfMonth === null || item.weekOfMonth === undefined
          ? null
          : Number(item.weekOfMonth),
      priority: 0,
      observacoes: `${source.SOURCE_TAG} ${String(item.note ?? "").trim()}`.trim(),
      ativo: true,
    });
    report.weekendRulesImported += 1;
  }

  const importedExceptions = (await getAllExceptions(profileId)).filter((item: any) =>
    String(item.reason ?? "").includes(source.SOURCE_TAG)
  );
  for (const item of importedExceptions) {
    await deleteException(item.id, profileId);
  }

  for (const item of [
    ...source.recurringExceptionsFromDoc,
    ...source.may2026ExceptionsFromDoc,
  ]) {
    const replaceDoctorKey = item.replaceDoctorKey
      ? String(item.replaceDoctorKey)
      : null;

    await createException({
      profileId,
      doctorId: resolvedDoctorIds.get(String(item.doctorKey))!,
      exceptionType: String(item.exceptionType) as
        | "block"
        | "force_shift"
        | "replace"
        | "swap",
      recurrenceType: String(item.recurrenceType) as
        | "annual"
        | "monthly"
        | "once"
        | "recurring",
      specificDate: item.specificDate
        ? (String(item.specificDate) as unknown as Date)
        : null,
      month:
        item.month === null || item.month === undefined
          ? null
          : Number(item.month),
      dayOfMonth:
        item.dayOfMonth === null || item.dayOfMonth === undefined
          ? null
          : Number(item.dayOfMonth),
      dayOfWeek:
        item.dayOfWeek === null || item.dayOfWeek === undefined
          ? null
          : Number(item.dayOfWeek),
      weekOfMonth:
        item.weekOfMonth === null || item.weekOfMonth === undefined
          ? null
          : Number(item.weekOfMonth),
      shiftType: item.shiftType
        ? (String(item.shiftType) as
            | "manha_sus"
            | "manha_convenio"
            | "tarde_sus"
            | "tarde_convenio"
            | "noite"
            | "plantao_24h"
            | "all_day")
        : null,
      replaceDoctorId: replaceDoctorKey
        ? resolvedDoctorIds.get(replaceDoctorKey) ?? null
        : null,
      reason: `${source.SOURCE_TAG} ${String(item.reason ?? "").trim()}`.trim(),
      ativo: true,
    });
    report.exceptionsImported += 1;
  }

  const existingHolidayKeys = new Set(
    (await getAllHolidays()).map((item) =>
      getHolidayKey({
        name: item.name,
        holidayDate: item.holidayDate as unknown as string,
        recurrenceType: item.recurrenceType,
      })
    )
  );

  for (const holiday of source.holidaysFromSource) {
    const key = getHolidayKey(holiday);

    if (existingHolidayKeys.has(key)) {
      continue;
    }

    await createHoliday({
      name: holiday.name,
      holidayDate: holiday.holidayDate as unknown as Date,
      isNational: holiday.isNational,
      recurrenceType: holiday.recurrenceType,
    });
    existingHolidayKeys.add(key);
    report.holidaysInserted += 1;
  }

  const notes = [
    `${source.APRIL_IMPORT_TAG} Escala manual de abril/2026 importada para servir de referencia aos meses seguintes.`,
    ...source.sourceMaterialNotes,
  ].join("\n");

  let aprilSchedule = await getScheduleByMonth(profileId, 2026, 4);
  if (!aprilSchedule) {
    await createSchedule({
      profileId,
      year: 2026,
      month: 4,
      status: "approved",
      generatedAt: new Date(),
      approvedAt: new Date(),
      notes,
    });
    aprilSchedule = await getScheduleByMonth(profileId, 2026, 4);
  } else {
    await updateSchedule(aprilSchedule.id, profileId, {
      status: "approved",
      generatedAt: new Date(),
      approvedAt: new Date(),
      notes,
    });
    await deleteEntriesForSchedule(aprilSchedule.id);
  }

  if (!aprilSchedule) {
    throw new Error("Nao foi possivel preparar a escala de abril/2026.");
  }

  for (const [entryDate, shiftType, doctorKey] of source.april2026ManualEntries) {
    await createEntry({
      scheduleId: aprilSchedule.id,
      doctorId: resolvedDoctorIds.get(doctorKey)!,
      entryDate: entryDate as unknown as Date,
      shiftType: shiftType as
        | "manha_sus"
        | "manha_convenio"
        | "tarde_sus"
        | "tarde_convenio"
        | "noite"
        | "plantao_24h",
      isFixed: true,
      isManualOverride: true,
      isLocked: false,
      notes: source.APRIL_IMPORT_TAG,
    });
    report.aprilEntriesImported += 1;
  }

  report.aprilScheduleId = aprilSchedule.id;
  return report;
}
