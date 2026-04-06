import type {
  Doctor,
  Schedule,
  ScheduleEntry,
  ScheduleProfile,
} from "../drizzle/schema";
import {
  april2026ManualEntries,
  doctorCatalog,
  doctorProfiles,
  holidaysFromSource,
  may2026ExceptionsFromDoc,
  placeholderDoctors,
  recurringExceptionsFromDoc,
  sourceMaterialNotes,
  weeklyRulesFromDoc,
  weekendRulesFromDoc,
} from "../april-may-2026-source.mjs";

export const OFFLINE_PROFILE_ID = 1;
export const OFFLINE_PRELOADED_YEAR = 2026;
export const OFFLINE_PRELOADED_MONTH = 4;
export const OFFLINE_APRIL_SCHEDULE_ID = 202604;

const createdAt = new Date("2026-03-28T12:00:00");
const updatedAt = new Date("2026-03-28T12:00:00");
const generatedAt = new Date("2026-04-30T12:00:00");
const sourceManualEntries = [] as Array<[string, string, string]>;
const sourceWeeklyRules = [] as Array<Record<string, unknown>>;
const sourceWeekendRules = [] as Array<Record<string, unknown>>;
const sourceRecurringExceptions = [] as Array<
  Record<string, unknown>
>;
const sourceMayExceptions = [] as Array<
  Record<string, unknown>
>;
const sourceHolidays = holidaysFromSource as Array<{
  name: string;
  holidayDate: string;
  isNational: boolean;
  recurrenceType: "annual" | "once";
}>;
const sourceNotes = sourceMaterialNotes as string[];

function toLocalDateValue(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

function getOfflineDoctorKeys() {
  return [];
}

export const offlineScheduleProfile: ScheduleProfile = {
  id: OFFLINE_PROFILE_ID,
  name: "Clínica Padrão",
  description: "Base local da escala padrão vazia",
  active: true,
  createdAt,
  updatedAt,
};

export const offlineDoctors: Doctor[] = [];
export const offlineWeeklyRules: any[] = [];
export const offlineWeekendRules: any[] = [];
export const offlineExceptions: any[] = [];

export const offlineHolidays = sourceHolidays.map((holiday, index) => ({
  id: index + 1,
  name: holiday.name,
  holidayDate: toLocalDateValue(holiday.holidayDate),
  isNational: holiday.isNational,
  recurrenceType: holiday.recurrenceType,
  createdAt,
}));

export const offlineAprilSchedule: Schedule = {
  id: OFFLINE_APRIL_SCHEDULE_ID,
  profileId: OFFLINE_PROFILE_ID,
  year: OFFLINE_PRELOADED_YEAR,
  month: OFFLINE_PRELOADED_MONTH,
  status: "preliminary",
  generatedAt,
  approvedAt: null,
  approvedBy: null,
  balanceScore: null,
  notes: [
    "Base manual de abril/2026 carregada automaticamente no modo local.",
    "As inconsistencias do material original foram preservadas para referencia.",
    ...sourceNotes,
  ].join("\n"),
  createdAt,
  updatedAt,
};

export const offlineAprilEntries: ScheduleEntry[] = [];

export function matchesOfflineProfile(profileId: number) {
  return profileId === OFFLINE_PROFILE_ID;
}

export function getOfflineDoctorById(id: number) {
  return offlineDoctors.find((doctor) => doctor.id === id);
}

export function getOfflineScheduleById(id: number) {
  return id === OFFLINE_APRIL_SCHEDULE_ID ? offlineAprilSchedule : undefined;
}

export function getOfflineScheduleByMonth(year: number, month: number) {
  return year === OFFLINE_PRELOADED_YEAR && month === OFFLINE_PRELOADED_MONTH
    ? offlineAprilSchedule
    : undefined;
}

export function getOfflineEntriesForSchedule(scheduleId: number) {
  return scheduleId === OFFLINE_APRIL_SCHEDULE_ID ? offlineAprilEntries : [];
}

export function getOfflineHolidaysForMonth(year: number, month: number) {
  return offlineHolidays.filter((holiday) => {
    const holidayDate =
      holiday.holidayDate instanceof Date
        ? holiday.holidayDate.toISOString().slice(0, 10)
        : String(holiday.holidayDate);
    const holidayYear = Number(holidayDate.slice(0, 4));
    const holidayMonth = Number(holidayDate.slice(5, 7));

    if (holiday.recurrenceType === "annual") {
      return holidayMonth === month;
    }

    return holidayYear === year && holidayMonth === month;
  });
}

export function getOfflineExceptionsForMonth(year: number, month: number) {
  return offlineExceptions.filter((exception) => {
    if (!exception.ativo) return false;

    if (exception.recurrenceType === "recurring") return true;
    if (exception.recurrenceType === "monthly") return exception.month === month;
    if (exception.recurrenceType === "annual") return exception.month === month;
    if (exception.recurrenceType === "once") {
      const specificDate = String(exception.specificDate ?? "");
      return (
        specificDate.slice(0, 4) === String(year) &&
        specificDate.slice(5, 7) === String(month).padStart(2, "0")
      );
    }

    return false;
  });
}
