/**
 * Algoritmo de Geração Automática de Escala Médica
 * Ordem de execução:
 * 1. Médicos fixos por dia/turno (regras semanais)
 * 2. Aplicar exceções do mês
 * 3. Finais de semana conforme regras fixas
 * 4. Noites fixas
 * 5. Completar rodízio das noites
 * 6. Residentes no SUS de sábado (manhã e tarde)
 * 7. Validação final e score de equilíbrio
 */

import type { Doctor } from "../drizzle/schema";

export type ShiftType = "manha_sus" | "manha_convenio" | "tarde_sus" | "tarde_convenio" | "noite" | "plantao_24h";

export interface GeneratedEntry {
  doctorId: number;
  entryDate: string; // YYYY-MM-DD
  shiftType: ShiftType;
  isFixed: boolean;
  conflictWarning?: string;
}

export interface ValidationConflict {
  date: string;
  shiftType: ShiftType;
  doctorId: number;
  type: "double_shift" | "blocked_date" | "excess_nights" | "excess_shifts" | "missing_coverage" | "rotation_break" | "restriction_violation";
  message: string;
  suggestedDoctorIds?: number[];
}

export interface GenerationResult {
  entries: GeneratedEntry[];
  conflicts: ValidationConflict[];
  balanceScore: number;
  stats: DoctorStats[];
}

export interface DoctorStats {
  doctorId: number;
  totalShifts: number;
  totalNights: number;
  totalWeekends: number;
  totalSus: number;
  totalConvenio: number;
}

interface WeeklyRule {
  doctorId: number;
  dayOfWeek: number;
  shiftType: ShiftType;
  weekAlternation: "all" | "odd" | "even";
  participaRodizioNoite: boolean;
  noiteFixa: boolean;
}

interface WeekendRule {
  doctorId: number;
  dayType: "sabado" | "domingo" | "ambos";
  shiftType: ShiftType;
  weekOfMonth: number | null;
  observacoes?: string | null;
  monthAlternation?: "all" | "odd" | "even";
}

interface Exception {
  doctorId: number;
  exceptionType: "block" | "force_shift" | "replace" | "swap";
  recurrenceType: "annual" | "monthly" | "once" | "recurring";
  specificDate: string | Date | null;
  month: number | null;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  weekOfMonth: number | null;
  shiftType: ShiftType | "all_day" | null;
  replaceDoctorId: number | null;
}

function normalizeSpecificDateValue(value: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getWeekOfMonth(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function fromDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

function getWeekendBlockKey(date: Date): string | null {
  if (!isWeekend(date)) return null;

  const weekendAnchor = new Date(date);
  if (weekendAnchor.getDay() === 0) {
    weekendAnchor.setDate(weekendAnchor.getDate() - 1);
  }

  return toDateStr(weekendAnchor);
}

function getWeekendRotationShiftPriority(date: Date, shiftType: string): number {
  if (date.getDay() === 6) {
    if (shiftType === "manha_sus") return 0;
    if (shiftType === "plantao_24h") return 1;
  }

  if (date.getDay() === 0 && shiftType === "plantao_24h") {
    return 0;
  }

  return 99;
}

function isWeekendRotationShift(date: Date, shiftType: string): boolean {
  return getWeekendRotationShiftPriority(date, shiftType) !== 99;
}

function isBlockedByException(
  doctorId: number,
  date: Date,
  shiftType: ShiftType,
  exceptions: Exception[]
): boolean {
  const dateStr = toDateStr(date);
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();
  const dayOfWeek = date.getDay();
  const weekOfMonth = getWeekOfMonth(date);

  return exceptions.some((ex) => {
    if (ex.doctorId !== doctorId) return false;
    if (ex.exceptionType !== "block") return false;

    let matchesDate = false;
    if (
      ex.recurrenceType === "once" &&
      normalizeSpecificDateValue(ex.specificDate) === dateStr
    ) {
      matchesDate = true;
    }
    if (ex.recurrenceType === "monthly" && ex.month === month && ex.dayOfMonth === dayOfMonth) matchesDate = true;
    if (ex.recurrenceType === "annual" && ex.month === month && ex.dayOfMonth === dayOfMonth) matchesDate = true;
    if (ex.recurrenceType === "recurring" && ex.dayOfWeek === dayOfWeek) {
      if (!ex.weekOfMonth || ex.weekOfMonth === weekOfMonth) matchesDate = true;
    }

    if (!matchesDate) return false;
    return !ex.shiftType || ex.shiftType === "all_day" || ex.shiftType === shiftType;
  });
}

function isAlreadyAssigned(
  entries: GeneratedEntry[],
  doctorId: number,
  dateStr: string
): boolean {
  return entries.some((e) => e.doctorId === doctorId && e.entryDate === dateStr);
}

function hasConflict(
  entries: GeneratedEntry[],
  doctorId: number,
  dateStr: string,
  shiftType: ShiftType
): boolean {
  return entries.some(
    (e) => e.doctorId === doctorId && e.entryDate === dateStr && e.shiftType === shiftType
  );
}

function hasShiftCoverage(
  entries: GeneratedEntry[],
  dateStr: string,
  shiftType: ShiftType
): boolean {
  return entries.some((e) => e.entryDate === dateStr && e.shiftType === shiftType);
}

function countNightsInMonth(entries: GeneratedEntry[], doctorId: number): number {
  return entries.filter((e) => e.doctorId === doctorId && e.shiftType === "noite").length;
}

function getLastNightDate(entries: GeneratedEntry[], doctorId: number): string | null {
  const nights = entries
    .filter((e) => e.doctorId === doctorId && e.shiftType === "noite")
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  return nights.length > 0 ? nights[nights.length - 1].entryDate : null;
}

function getAutomaticAssignmentConflicts(
  doctor: Doctor,
  dateStr: string,
  shiftType: ShiftType,
  existingEntries: GeneratedEntry[],
  exceptions: Exception[],
  holidayDates: Set<string>
): ValidationConflict[] {
  return validateEntry(doctor.id, dateStr, shiftType, existingEntries, doctor, exceptions, holidayDates);
}

function canAssignAutomatically(
  doctor: Doctor,
  dateStr: string,
  shiftType: ShiftType,
  existingEntries: GeneratedEntry[],
  exceptions: Exception[],
  holidayDates: Set<string>
): boolean {
  return getAutomaticAssignmentConflicts(doctor, dateStr, shiftType, existingEntries, exceptions, holidayDates).length === 0;
}

function findFirstAutomaticallyAssignable(
  doctors: Doctor[],
  dateStr: string,
  shiftType: ShiftType,
  existingEntries: GeneratedEntry[],
  exceptions: Exception[],
  holidayDates: Set<string>
): Doctor | null {
  return doctors.find((doctor) => canAssignAutomatically(doctor, dateStr, shiftType, existingEntries, exceptions, holidayDates)) ?? null;
}

function matchesWeekAlternation(
  weekAlternation: "all" | "odd" | "even",
  isOddWeek: boolean
): boolean {
  if (weekAlternation === "odd" && !isOddWeek) return false;
  if (weekAlternation === "even" && isOddWeek) return false;
  return true;
}

function getWeekendRuleMonthAlternation(rule: WeekendRule): "all" | "odd" | "even" {
  if (rule.monthAlternation) return rule.monthAlternation;
  const match = String(rule.observacoes ?? "").match(/\[monthAlternation=(all|odd|even)\]/i);
  if (!match) return "all";
  return match[1].toLowerCase() as "all" | "odd" | "even";
}

function matchesWeekendRuleMonth(rule: WeekendRule, month: number): boolean {
  const alternation = getWeekendRuleMonthAlternation(rule);
  if (alternation === "odd") return month % 2 === 1;
  if (alternation === "even") return month % 2 === 0;
  return true;
}

export function generateSchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  weeklyRules: WeeklyRule[],
  weekendRules: WeekendRule[],
  exceptions: Exception[],
  // Feriado é apenas referência cadastral; a escala continua seguindo a regra natural do dia.
  holidayDates: Set<string>,
  residentIds: number[],
  prevMonthEntries: Array<{
    doctorId: number;
    shiftType: string;
    entryDate?: string;
  }> = []
): GenerationResult {
  const entries: GeneratedEntry[] = [];
  const conflicts: ValidationConflict[] = [];
  const days = getDaysInMonth(year, month);
  const doctorById = new Map(doctors.map((doctor) => [doctor.id, doctor]));

  // Médicos residentes (para SUS de sábado)

  // ── PASSO 1: Médicos fixos por dia da semana ──────────────────────────────
  for (const day of days) {
    if (isWeekend(day)) continue;
    const dateStr = toDateStr(day);
    const dow = day.getDay(); // 1=Mon ... 5=Fri
    const weekOfMonth = getWeekOfMonth(day);
    const isOddWeek = weekOfMonth % 2 === 1;

    const rulesForDay = weeklyRules.filter((r) => r.dayOfWeek === dow);

    for (const rule of rulesForDay) {
      // Verificar alternância
      if (rule.weekAlternation === "odd" && !isOddWeek) continue;
      if (rule.weekAlternation === "even" && isOddWeek) continue;

      const doctor = doctorById.get(rule.doctorId);
      if (!doctor) continue;

      // Verificar exceções (bloqueios)
      if (isBlockedByException(rule.doctorId, day, rule.shiftType, exceptions)) continue;

      // Verificar duplicidade
      if (hasConflict(entries, rule.doctorId, dateStr, rule.shiftType)) continue;

      if (!canAssignAutomatically(doctor, dateStr, rule.shiftType, entries, exceptions, holidayDates)) continue;

      entries.push({
        doctorId: rule.doctorId,
        entryDate: dateStr,
        shiftType: rule.shiftType,
        isFixed: true,
      });
    }
  }

  // ── PASSO 2: Aplicar exceções force_shift ─────────────────────────────────
  for (const ex of exceptions) {
    if (ex.exceptionType !== "force_shift") continue;
    if (!ex.shiftType || ex.shiftType === "all_day") continue;

    for (const day of days) {
      const dateStr = toDateStr(day);
      const month_num = day.getMonth() + 1;
      const dayOfMonth = day.getDate();
      const dayOfWeek = day.getDay();
      const weekOfMonth = getWeekOfMonth(day);

      let matches = false;
      if (
        ex.recurrenceType === "once" &&
        normalizeSpecificDateValue(ex.specificDate) === dateStr
      ) {
        matches = true;
      }
      if (ex.recurrenceType === "monthly" && ex.month === month_num && ex.dayOfMonth === dayOfMonth) matches = true;
      if (ex.recurrenceType === "annual" && ex.month === month_num && ex.dayOfMonth === dayOfMonth) matches = true;
      if (ex.recurrenceType === "recurring" && ex.dayOfWeek === dayOfWeek) {
        if (!ex.weekOfMonth || ex.weekOfMonth === weekOfMonth) matches = true;
      }

      if (!matches) continue;
      const shiftType = ex.shiftType as ShiftType;
      const doctor = doctorById.get(ex.doctorId);
      if (!doctor) continue;

      if (!hasConflict(entries, ex.doctorId, dateStr, shiftType) && canAssignAutomatically(doctor, dateStr, shiftType, entries, exceptions, holidayDates)) {
        entries.push({ doctorId: ex.doctorId, entryDate: dateStr, shiftType, isFixed: true });
      }
    }
  }

  // ── PASSO 3: Finais de semana ─────────────────────────────────────────────
  // Estrutura:
  //   SÁBADO: 1 médico SUS 12h (manhã + tarde) + 1 médico Convênio 24h + residentes no SUS
  //   DOMINGO: 1 médico 24h (cobre SUS + Convênio)
  // Rodízio automático equilibrado entre elegíveis de cada pool

  // Pool de médicos elegíveis para cada função no FDS
  // Prioridade: regras fixas de FDS com weekOfMonth específico primeiro, depois rodízio geral
  const saturdaySusPool = doctors.filter((d) => {
    return d.hasSus && d.canSabado && d.canFinalDeSemana && d.canManhaSus && d.canTardeSus;
  });

  const fdsSabConvPool = doctors.filter((d) => {
    if (residentIds.includes(d.id)) return false;
    const hasRule = weekendRules.some(
      (r) =>
        r.doctorId === d.id &&
        matchesWeekendRuleMonth(r, month) &&
        (r.dayType === "sabado" || r.dayType === "ambos") &&
        r.shiftType === "plantao_24h"
    );
    return hasRule || (d.canSabado && d.canFinalDeSemana);
  });

  const fdsDomPool = doctors.filter((d) => {
    if (residentIds.includes(d.id)) return false;
    const hasRule = weekendRules.some((r) =>
      r.doctorId === d.id &&
      matchesWeekendRuleMonth(r, month) &&
      (r.dayType === "domingo" || r.dayType === "ambos") &&
      r.shiftType === "plantao_24h"
    );
    return hasRule || (d.canDomingo && d.canFinalDeSemana);
  });
  const weekend24hPool = doctors.filter((doctor) => {
    return (
      fdsSabConvPool.some((candidate) => candidate.id === doctor.id) ||
      fdsDomPool.some((candidate) => candidate.id === doctor.id)
    );
  });

  const masterWeekendRotationPool = doctors.filter((doctor) => {
    return (
      saturdaySusPool.some((candidate) => candidate.id === doctor.id) ||
      fdsSabConvPool.some((candidate) => candidate.id === doctor.id) ||
      fdsDomPool.some((candidate) => candidate.id === doctor.id)
    );
  });

  type WeekendRotationState = {
    orderedDoctorIds: number[];
    nextIndex: number;
  };

  function buildWeekendRotationHistoryIds(
    sourceEntries: Array<{
      doctorId: number;
      entryDate?: string;
      shiftType: string;
    }>,
    matcher: (entryDate: Date, shiftType: string) => boolean = (
      entryDate,
      shiftType
    ) => isWeekendRotationShift(entryDate, shiftType)
  ) {
    return sourceEntries
      .map((entry) => {
        if (!entry.entryDate) return null;

        const entryDate = fromDateStr(entry.entryDate);
        if (!matcher(entryDate, entry.shiftType)) return null;

        return {
          doctorId: entry.doctorId,
          entryDate: entry.entryDate,
          priority: getWeekendRotationShiftPriority(entryDate, entry.shiftType),
        };
      })
      .filter(
        (
          entry
        ): entry is {
          doctorId: number;
          entryDate: string;
          priority: number;
        } => entry !== null
      )
      .sort(
        (a, b) =>
          a.entryDate.localeCompare(b.entryDate) || a.priority - b.priority
      )
      .map((entry) => entry.doctorId);
  }

  function createWeekendRotationState(
    pool: Doctor[],
    historyDoctorIds: number[]
  ): WeekendRotationState {
    const orderedDoctorIds: number[] = [];
    const poolIds = new Set(pool.map((doctor) => doctor.id));

    for (const doctorId of historyDoctorIds) {
      if (!poolIds.has(doctorId) || orderedDoctorIds.includes(doctorId)) continue;
      orderedDoctorIds.push(doctorId);
    }

    for (const doctor of pool) {
      if (orderedDoctorIds.includes(doctor.id)) continue;
      orderedDoctorIds.push(doctor.id);
    }

    const lastAssignedDoctorId = [...historyDoctorIds]
      .reverse()
      .find((doctorId) => orderedDoctorIds.includes(doctorId));

    const nextIndex =
      orderedDoctorIds.length === 0
        ? 0
        : lastAssignedDoctorId === undefined
          ? 0
          : (orderedDoctorIds.indexOf(lastAssignedDoctorId) + 1) %
            orderedDoctorIds.length;

    return {
      orderedDoctorIds,
      nextIndex,
    };
  }

  function advanceMasterWeekendRotation(
    rotationState: WeekendRotationState,
    doctorId: number
  ) {
    if (rotationState.orderedDoctorIds.length === 0) return;

    const doctorIndex = rotationState.orderedDoctorIds.indexOf(doctorId);
    if (doctorIndex < 0) return;

    rotationState.nextIndex =
      (doctorIndex + 1) % rotationState.orderedDoctorIds.length;
  }

  function hasSpecificFixedWeekendRule(
    doctorId: number,
    day: Date,
    shiftType: ShiftType
  ) {
    const isSaturday = day.getDay() === 6;
    const weekOfMonth = getWeekOfMonth(day);

    return weekendRules.some((rule) => {
      if (rule.doctorId !== doctorId) return false;
      if (rule.shiftType !== shiftType) return false;
      if (rule.weekOfMonth === null) return false;
      if (rule.weekOfMonth !== weekOfMonth) return false;
      if (!matchesWeekendRuleMonth(rule, day.getMonth() + 1)) return false;
      if (rule.dayType === "sabado" && !isSaturday) return false;
      if (rule.dayType === "domingo" && isSaturday) return false;
      return true;
    });
  }

  const masterWeekendRotationState = createWeekendRotationState(
    masterWeekendRotationPool,
    buildWeekendRotationHistoryIds(prevMonthEntries)
  );

  const saturdaySusRotationState = createWeekendRotationState(
    saturdaySusPool,
    buildWeekendRotationHistoryIds(
      prevMonthEntries,
      (entryDate, shiftType) =>
        entryDate.getDay() === 6 && shiftType === "manha_sus"
    )
  );
  const weekend24hRotationState = createWeekendRotationState(
    weekend24hPool,
    buildWeekendRotationHistoryIds(
      prevMonthEntries,
      (entryDate, shiftType) =>
        isWeekend(entryDate) && shiftType === "plantao_24h"
    )
  );
  const weekendDoctorsUsedThisMonth = new Set<number>();
  const weekendBlockCountThisMonth = new Map<number, number>(
    doctors.map((doctor) => [doctor.id, 0])
  );
  const weekendBlockSeenThisMonth = new Set<string>();

  for (const doctorId of buildWeekendRotationHistoryIds(entries)) {
    advanceMasterWeekendRotation(masterWeekendRotationState, doctorId);
    weekendDoctorsUsedThisMonth.add(doctorId);
  }
  for (const entry of entries) {
    if (!entry.entryDate) continue;

    const entryDate = fromDateStr(entry.entryDate);
    if (!isWeekendRotationShift(entryDate, entry.shiftType)) continue;

    const weekendBlockKey = getWeekendBlockKey(entryDate);
    if (!weekendBlockKey) continue;

    incrementWeekendCounter(
      weekendBlockCountThisMonth,
      weekendBlockSeenThisMonth,
      entry.doctorId,
      weekendBlockKey
    );
  }
  for (const doctorId of buildWeekendRotationHistoryIds(
    entries,
    (entryDate, shiftType) =>
      entryDate.getDay() === 6 && shiftType === "manha_sus"
  )) {
    advanceMasterWeekendRotation(saturdaySusRotationState, doctorId);
  }
  for (const doctorId of buildWeekendRotationHistoryIds(
    entries,
    (entryDate, shiftType) =>
      isWeekend(entryDate) && shiftType === "plantao_24h"
  )) {
    advanceMasterWeekendRotation(weekend24hRotationState, doctorId);
  }

  function getMasterWeekendPriority(doctorId: number): number {
    const orderedDoctorIds = masterWeekendRotationState.orderedDoctorIds;
    if (orderedDoctorIds.length === 0) return Number.MAX_SAFE_INTEGER;

    const doctorIndex = orderedDoctorIds.indexOf(doctorId);
    if (doctorIndex < 0) return Number.MAX_SAFE_INTEGER;

    return (
      (doctorIndex - masterWeekendRotationState.nextIndex + orderedDoctorIds.length) %
      orderedDoctorIds.length
    );
  }

  function finalizeWeekendRotationChoice(
    rotationState: WeekendRotationState,
    doctorId: number
  ) {
    advanceMasterWeekendRotation(masterWeekendRotationState, doctorId);
    advanceMasterWeekendRotation(rotationState, doctorId);
  }

  function pickSequentialWeekendDoctor(
    rotationState: WeekendRotationState,
    pool: Doctor[],
    day: Date,
    shiftType: ShiftType,
    alreadyUsedToday: Set<number>,
    weekOfMonth: number,
    isEligibleDoctor: (doctor: Doctor) => boolean
  ): Doctor | null {
    const dateStr = toDateStr(day);
    const poolIds = new Set(pool.map((doctor) => doctor.id));

    const fixedRule = weekendRules.find((rule) => {
      if (!poolIds.has(rule.doctorId)) return false;
      const isSaturday = day.getDay() === 6;
      if (rule.dayType === "sabado" && !isSaturday) return false;
      if (rule.dayType === "domingo" && isSaturday) return false;
      if (!matchesWeekendRuleMonth(rule, day.getMonth() + 1)) return false;
      if (rule.weekOfMonth === null) return false;
      if (rule.weekOfMonth !== weekOfMonth) return false;
      if (rule.shiftType !== shiftType) return false;
      return true;
    });

    if (fixedRule) {
      const doctor = pool.find((candidate) => candidate.id === fixedRule.doctorId);
      if (
        doctor &&
        !alreadyUsedToday.has(doctor.id) &&
        !isAlreadyAssigned(entries, doctor.id, dateStr) &&
        !isBlockedByException(doctor.id, day, shiftType, exceptions) &&
        isEligibleDoctor(doctor) &&
        canAssignAutomatically(
          doctor,
          dateStr,
          shiftType,
          entries,
          exceptions,
          holidayDates
        )
      ) {
        finalizeWeekendRotationChoice(rotationState, doctor.id);
        return doctor;
      }
    }

    if (rotationState.orderedDoctorIds.length === 0) return null;

    const findDoctor = (skipDoctorsUsedThisMonth: boolean) => {
      for (
        let offset = 0;
        offset < rotationState.orderedDoctorIds.length;
        offset += 1
      ) {
        const rotationIndex =
          (rotationState.nextIndex + offset) %
          rotationState.orderedDoctorIds.length;
        const doctorId = rotationState.orderedDoctorIds[rotationIndex];

        if (!poolIds.has(doctorId)) continue;

        const doctor = doctorById.get(doctorId);
        if (!doctor) continue;
        if (alreadyUsedToday.has(doctor.id)) continue;
        if (isAlreadyAssigned(entries, doctor.id, dateStr)) continue;
        if (isBlockedByException(doctor.id, day, shiftType, exceptions)) continue;
        if (skipDoctorsUsedThisMonth && weekendDoctorsUsedThisMonth.has(doctor.id)) {
          continue;
        }
        if (!isEligibleDoctor(doctor)) continue;
        if (
          !canAssignAutomatically(
            doctor,
            dateStr,
            shiftType,
            entries,
            exceptions,
            holidayDates
          )
        ) {
          continue;
        }

        finalizeWeekendRotationChoice(rotationState, doctor.id);
        return doctor;
      }

      return null;
    };

    const freshDoctor = findDoctor(true);
    if (freshDoctor) return freshDoctor;

    const fallbackCandidates: Array<{
      doctor: Doctor;
      rotationIndex: number;
      rolePriority: number;
      masterPriority: number;
      weekendBlocks: number;
    }> = [];

    for (
      let offset = 0;
      offset < rotationState.orderedDoctorIds.length;
      offset += 1
    ) {
      const rotationIndex =
        (rotationState.nextIndex + offset) %
        rotationState.orderedDoctorIds.length;
      const doctorId = rotationState.orderedDoctorIds[rotationIndex];

      if (!poolIds.has(doctorId)) continue;

      const doctor = doctorById.get(doctorId);
      if (!doctor) continue;
      if (alreadyUsedToday.has(doctor.id)) continue;
      if (isAlreadyAssigned(entries, doctor.id, dateStr)) continue;
      if (isBlockedByException(doctor.id, day, shiftType, exceptions)) continue;
      if (!isEligibleDoctor(doctor)) continue;
      if (
        !canAssignAutomatically(
          doctor,
          dateStr,
          shiftType,
          entries,
          exceptions,
          holidayDates
        )
      ) {
        continue;
      }

      fallbackCandidates.push({
        doctor,
        rotationIndex,
        rolePriority: offset,
        masterPriority: getMasterWeekendPriority(doctor.id),
        weekendBlocks: weekendBlockCountThisMonth.get(doctor.id) ?? 0,
      });
    }

    if (fallbackCandidates.length === 0) return null;

    fallbackCandidates.sort(
      (a, b) =>
        a.weekendBlocks - b.weekendBlocks ||
        a.masterPriority - b.masterPriority ||
        a.rolePriority - b.rolePriority
    );

    const selectedCandidate = fallbackCandidates[0];
    finalizeWeekendRotationChoice(rotationState, selectedCandidate.doctor.id);
    return selectedCandidate.doctor;
  }

  // Contadores de FDS por médico para rodízio equilibrado
  // Inicializar com carga do mês anterior para balancear o rodízio
  function prevFdsCount(pool: Doctor[], shiftTypes: string[]): Map<number, number> {
    const map = new Map<number, number>(pool.map((d) => [d.id, 0]));
    for (const e of prevMonthEntries) {
      if (shiftTypes.includes(e.shiftType) && map.has(e.doctorId)) {
        map.set(e.doctorId, (map.get(e.doctorId) ?? 0) + 1);
      }
    }
    return map;
  }
  const fdsSabSusCount = prevFdsCount(saturdaySusPool, ["manha_sus"]);
  const fdsSabConvCount = prevFdsCount(fdsSabConvPool, ["plantao_24h"]);
  const fdsDomCount = prevFdsCount(fdsDomPool, ["plantao_24h"]);
  const weekendLoadCount = new Map<number, number>(doctors.map((doctor) => [doctor.id, 0]));
  const weekendLoadSeen = new Set<string>();

  for (const entry of prevMonthEntries) {
    if (!entry.entryDate) continue;
    const entryDate = fromDateStr(entry.entryDate);
    const weekendBlockKey = getWeekendBlockKey(entryDate);
    if (!weekendBlockKey) continue;

    incrementWeekendCounter(
      weekendLoadCount,
      weekendLoadSeen,
      entry.doctorId,
      weekendBlockKey
    );
  }

  const saturdaySusSeen = new Set<string>();
  const saturday24hSeen = new Set<string>();
  const sunday24hSeen = new Set<string>();

  function incrementWeekendCounter(
    counter: Map<number, number>,
    seen: Set<string>,
    doctorId: number,
    dateStr: string
  ) {
    const key = `${doctorId}-${dateStr}`;
    if (seen.has(key)) return;
    seen.add(key);
    counter.set(doctorId, (counter.get(doctorId) ?? 0) + 1);
  }

  // Função para escolher médico com menos FDS no pool, respeitando exceções e bloqueios
  function pickFdsDoctor(
    pool: Doctor[],
    counter: Map<number, number>,
    totalWeekendCounter: Map<number, number>,
    day: Date,
    shiftType: ShiftType,
    alreadyUsedToday: Set<number>,
    weekOfMonth: number
  ): Doctor | null {
    const dateStr = toDateStr(day);

    // Primeiro: verificar se há regra fixa para esta semana específica
    const fixedRule = weekendRules.find((r) => {
      if (!pool.some((d) => d.id === r.doctorId)) return false;
      const isSaturday = day.getDay() === 6;
      if (r.dayType === "sabado" && !isSaturday) return false;
      if (r.dayType === "domingo" && isSaturday) return false;
      if (!matchesWeekendRuleMonth(r, day.getMonth() + 1)) return false;
      if (r.weekOfMonth === null) return false;
      if (r.weekOfMonth !== weekOfMonth) return false;
      if (r.shiftType !== shiftType) return false;
      if (isBlockedByException(r.doctorId, day, shiftType, exceptions)) return false;
      if (alreadyUsedToday.has(r.doctorId)) return false;
      return true;
    });
    if (fixedRule) {
      const doc = pool.find((d) => d.id === fixedRule.doctorId);
      if (doc && canAssignAutomatically(doc, dateStr, shiftType, entries, exceptions, holidayDates)) {
        return doc;
      }
    }
    // Rodízio: menor contador, sem bloqueio, sem duplicidade no dia
    const eligible = pool
      .filter((d) => {
        if (alreadyUsedToday.has(d.id)) return false;
        if (isBlockedByException(d.id, day, shiftType, exceptions)) return false;
        return true;
      })
      .sort((a, b) => {
        const totalWeekendDiff =
          (totalWeekendCounter.get(a.id) ?? 0) -
          (totalWeekendCounter.get(b.id) ?? 0);
        if (totalWeekendDiff !== 0) return totalWeekendDiff;

        const roleSpecificDiff =
          (counter.get(a.id) ?? 0) - (counter.get(b.id) ?? 0);
        if (roleSpecificDiff !== 0) return roleSpecificDiff;

        return a.id - b.id;
      });

    if (eligible.length === 0) return null;

    return findFirstAutomaticallyAssignable(eligible, dateStr, shiftType, entries, exceptions, holidayDates);
  }

  // Rastrear médico do convênio de cada sábado para bloquear no domingo seguinte
  const satConvDoctorByDate = new Map<string, number>(); // dateStr do domingo -> doctorId do sábado anterior

  for (const entry of entries) {
    const entryDate = fromDateStr(entry.entryDate);
    const weekendBlockKey = getWeekendBlockKey(entryDate);
    if (!weekendBlockKey) continue;

    incrementWeekendCounter(
      weekendLoadCount,
      weekendLoadSeen,
      entry.doctorId,
      weekendBlockKey
    );

    if (entryDate.getDay() === 6) {
      if (entry.shiftType === "manha_sus" || entry.shiftType === "tarde_sus") {
        incrementWeekendCounter(
          fdsSabSusCount,
          saturdaySusSeen,
          entry.doctorId,
          entry.entryDate
        );
      }

      if (entry.shiftType === "plantao_24h") {
        incrementWeekendCounter(
          fdsSabConvCount,
          saturday24hSeen,
          entry.doctorId,
          entry.entryDate
        );
        const nextDay = new Date(entryDate);
        nextDay.setDate(nextDay.getDate() + 1);
        satConvDoctorByDate.set(toDateStr(nextDay), entry.doctorId);
      }
    }

    if (entryDate.getDay() === 0 && entry.shiftType === "plantao_24h") {
      incrementWeekendCounter(
        fdsDomCount,
        sunday24hSeen,
        entry.doctorId,
        entry.entryDate
      );
    }
  }

  for (const day of days) {
    if (!isWeekend(day)) continue;
    const dateStr = toDateStr(day);
    const weekendBlockKey = getWeekendBlockKey(day) ?? dateStr;
    const isSaturday = day.getDay() === 6;
    const weekOfMonth = getWeekOfMonth(day);
    const usedToday = new Set<number>();

    if (isSaturday) {
      // ── SÁBADO: 1 médico SUS 12h (manhã + tarde) ──
      const needsSaturdayMorningSus = !hasShiftCoverage(entries, dateStr, "manha_sus");
      const needsSaturdayAfternoonSus = !hasShiftCoverage(entries, dateStr, "tarde_sus");

      if (needsSaturdayMorningSus || needsSaturdayAfternoonSus) {
        const saturdaySusDoctor = pickSequentialWeekendDoctor(
          saturdaySusRotationState,
          saturdaySusPool,
          day,
          "manha_sus",
          usedToday,
          weekOfMonth,
          (doctor) => {
            if (
              hasSpecificFixedWeekendRule(doctor.id, day, "plantao_24h")
            ) {
              return false;
            }
            if (
              needsSaturdayMorningSus &&
              !canAssignAutomatically(
                doctor,
                dateStr,
                "manha_sus",
                entries,
                exceptions,
                holidayDates
              )
            ) {
              return false;
            }
            if (
              needsSaturdayAfternoonSus &&
              !canAssignAutomatically(
                doctor,
                dateStr,
                "tarde_sus",
                entries,
                exceptions,
                holidayDates
              )
            ) {
              return false;
            }
            return true;
          }
        );

        if (saturdaySusDoctor) {
          if (needsSaturdayMorningSus && !hasConflict(entries, saturdaySusDoctor.id, dateStr, "manha_sus")) {
            entries.push({ doctorId: saturdaySusDoctor.id, entryDate: dateStr, shiftType: "manha_sus", isFixed: true });
          }
          if (needsSaturdayAfternoonSus && !hasConflict(entries, saturdaySusDoctor.id, dateStr, "tarde_sus")) {
            entries.push({ doctorId: saturdaySusDoctor.id, entryDate: dateStr, shiftType: "tarde_sus", isFixed: true });
          }
          usedToday.add(saturdaySusDoctor.id);
          weekendDoctorsUsedThisMonth.add(saturdaySusDoctor.id);
          incrementWeekendCounter(
            weekendBlockCountThisMonth,
            weekendBlockSeenThisMonth,
            saturdaySusDoctor.id,
            weekendBlockKey
          );
        } else {
          if (needsSaturdayMorningSus) {
            conflicts.push({ date: dateStr, shiftType: "manha_sus", doctorId: 0, type: "missing_coverage", message: `Sem médico disponível para SUS no sábado ${dateStr}`, suggestedDoctorIds: saturdaySusPool.map((d) => d.id) });
          }
          if (needsSaturdayAfternoonSus) {
            conflicts.push({ date: dateStr, shiftType: "tarde_sus", doctorId: 0, type: "missing_coverage", message: `Sem médico disponível para SUS no sábado ${dateStr}`, suggestedDoctorIds: saturdaySusPool.map((d) => d.id) });
          }
        }
      }

      // ── SÁBADO: 1 médico Convênio 24h ──
      // Sábado 24h e domingo 24h compartilham a mesma ordem de rodízio.
      // O médico do convênio de sábado faz 24h (sáb 8h → dom 8h), portanto NÃO pode fazer o domingo também
      const convDoc = pickSequentialWeekendDoctor(
        weekend24hRotationState,
        fdsSabConvPool,
        day,
        "plantao_24h",
        usedToday,
        weekOfMonth,
        () => true
      );
      if (convDoc) {
        entries.push({ doctorId: convDoc.id, entryDate: dateStr, shiftType: "plantao_24h", isFixed: true });
        usedToday.add(convDoc.id);
        weekendDoctorsUsedThisMonth.add(convDoc.id);
        incrementWeekendCounter(
          weekendBlockCountThisMonth,
          weekendBlockSeenThisMonth,
          convDoc.id,
          weekendBlockKey
        );
        // Registrar para bloquear no domingo seguinte
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        satConvDoctorByDate.set(toDateStr(nextDay), convDoc.id);
      } else {
        conflicts.push({ date: dateStr, shiftType: "plantao_24h", doctorId: 0, type: "missing_coverage", message: `Sem médico disponível para Convênio 24h no sábado ${dateStr}`, suggestedDoctorIds: fdsSabConvPool.map((d) => d.id) });
      }

    } else {
      // ── DOMINGO: 1 médico 24h (SUS + Convênio) ──
      // Bloquear o médico que fez convênio 24h no sábado anterior (já trabalhou até 8h deste domingo)
      const blockedFromSat = satConvDoctorByDate.get(dateStr);
      if (blockedFromSat) usedToday.add(blockedFromSat);

      const existingSunday24h = entries.find((entry) => entry.entryDate === dateStr && entry.shiftType === "plantao_24h");
      if (existingSunday24h) {
        usedToday.add(existingSunday24h.doctorId);
        weekendDoctorsUsedThisMonth.add(existingSunday24h.doctorId);
        incrementWeekendCounter(
          weekendBlockCountThisMonth,
          weekendBlockSeenThisMonth,
          existingSunday24h.doctorId,
          weekendBlockKey
        );
        advanceMasterWeekendRotation(weekend24hRotationState, existingSunday24h.doctorId);
        continue;
      }

      const domDoc = pickSequentialWeekendDoctor(
        weekend24hRotationState,
        fdsDomPool,
        day,
        "plantao_24h",
        usedToday,
        weekOfMonth,
        () => true
      );
      if (domDoc) {
        entries.push({ doctorId: domDoc.id, entryDate: dateStr, shiftType: "plantao_24h", isFixed: true });
        usedToday.add(domDoc.id);
        weekendDoctorsUsedThisMonth.add(domDoc.id);
        incrementWeekendCounter(
          weekendBlockCountThisMonth,
          weekendBlockSeenThisMonth,
          domDoc.id,
          weekendBlockKey
        );
      } else {
        conflicts.push({ date: dateStr, shiftType: "plantao_24h", doctorId: 0, type: "missing_coverage", message: `Sem médico disponível para plantão 24h no domingo ${dateStr}`, suggestedDoctorIds: fdsDomPool.map((d) => d.id) });
      }
    }
  }

  // ── PASSO 4 e 5: Noites fixas e rodízio de noites ─────────────────────────
  const globalNightRotationDoctors = doctors.filter((d) => d.participaRodizioNoite);
  const anyNightRotationDoctors = doctors.filter((d) => {
    const rules = weeklyRules.filter((r) => r.doctorId === d.id && r.participaRodizioNoite);
    return rules.length > 0 || d.participaRodizioNoite;
  });

  // Inicializar contador de noites com carga do mês anterior
  const nightCountPrev = new Map<number, number>(anyNightRotationDoctors.map((d) => [d.id, 0]));
  for (const e of prevMonthEntries) {
    if (e.shiftType === "noite" && nightCountPrev.has(e.doctorId)) {
      nightCountPrev.set(e.doctorId, (nightCountPrev.get(e.doctorId) ?? 0) + 1);
    }
  }

  for (const day of days) {
    const dateStr = toDateStr(day);
    const dow = day.getDay();
    const weekOfMonth = getWeekOfMonth(day);
    const isOddWeek = weekOfMonth % 2 === 1;
    const configuredNightRulesForDay = weeklyRules.filter(
      (rule) => rule.dayOfWeek === dow && rule.participaRodizioNoite
    );
    const activeNightRotationDoctorsForDay = Array.from(
      new Map(
        configuredNightRulesForDay
          .filter((rule) => matchesWeekAlternation(rule.weekAlternation, isOddWeek))
          .map((rule) => {
            const doctor = doctorById.get(rule.doctorId);
            return doctor ? [doctor.id, doctor] : null;
          })
          .filter((item): item is [number, Doctor] => item !== null)
      ).values()
    );
    const isWeekday = dow >= 1 && dow <= 5;
    const nightRotationDoctorsForDay =
      isWeekday || configuredNightRulesForDay.length > 0
        ? activeNightRotationDoctorsForDay
        : globalNightRotationDoctors;

    if (hasShiftCoverage(entries, dateStr, "plantao_24h")) continue;

    // Verificar se já tem noite neste dia
    const hasNightCoverage = entries.some((e) => e.entryDate === dateStr && e.shiftType === "noite");
    if (hasNightCoverage) continue;

    // Noites fixas por regra semanal (respeitando alternância odd/even)
    const fixedNightRule = weeklyRules.find(
      (r) => {
        if (r.dayOfWeek !== dow || !r.noiteFixa) return false;
        if (!matchesWeekAlternation(r.weekAlternation, isOddWeek)) return false;
        return !isBlockedByException(r.doctorId, day, "noite", exceptions);
      }
    );

    if (fixedNightRule) {
      const fixedNightDoctor = doctorById.get(fixedNightRule.doctorId);
      if (
        fixedNightDoctor &&
        !hasConflict(entries, fixedNightRule.doctorId, dateStr, "noite") &&
        canAssignAutomatically(fixedNightDoctor, dateStr, "noite", entries, exceptions, holidayDates)
      ) {
        entries.push({ doctorId: fixedNightRule.doctorId, entryDate: dateStr, shiftType: "noite", isFixed: true });
        continue;
      }
    }

    // Rodízio de noites: escolher médico com menos noites que pode fazer noite
    if (nightRotationDoctorsForDay.length > 0) {
      const eligible = nightRotationDoctorsForDay
        .filter((d) => {
          if (!d.canNoite) return false;
          if (isBlockedByException(d.id, day, "noite", exceptions)) return false;
          // Evitar noite consecutiva (verificar dia anterior)
          const prevDate = new Date(day);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateStr = toDateStr(prevDate);
          const hadNightYesterday = entries.some((e) => e.doctorId === d.id && e.entryDate === prevDateStr && e.shiftType === "noite");
          if (hadNightYesterday) return false;
          // Verificar limite de noites
          if (d.limiteNoitesMes && d.limiteNoitesMes > 0) {
            const nightCount = countNightsInMonth(entries, d.id);
            if (nightCount >= d.limiteNoitesMes) return false;
          }
          if (!canAssignAutomatically(d, dateStr, "noite", entries, exceptions, holidayDates)) return false;
          return true;
        })
        .sort((a, b) => {
          // Ordenar por: noites no mês atual + noites do mês anterior (para balancear)
          const aNights = countNightsInMonth(entries, a.id) + (nightCountPrev.get(a.id) ?? 0);
          const bNights = countNightsInMonth(entries, b.id) + (nightCountPrev.get(b.id) ?? 0);
          return aNights - bNights;
        });

      if (eligible.length > 0) {
        const chosen = eligible[0];
        entries.push({ doctorId: chosen.id, entryDate: dateStr, shiftType: "noite", isFixed: false });
      } else {
        conflicts.push({
          date: dateStr,
          shiftType: "noite",
          doctorId: 0,
          type: "missing_coverage",
          message: `Sem médico disponível para noite em ${dateStr}`,
          suggestedDoctorIds: nightRotationDoctorsForDay.map((d) => d.id),
        });
      }
    }
  }

  // ── PASSO 6: Validação final ──────────────────────────────────────────────
  const entryMap = new Map<string, GeneratedEntry[]>();
  for (const entry of entries) {
    const key = `${entry.entryDate}`;
    if (!entryMap.has(key)) entryMap.set(key, []);
    entryMap.get(key)!.push(entry);
  }

  // Verificar duplicidade de médico no mesmo turno
  for (const [date, dayEntries] of Array.from(entryMap.entries())) {
    const seen = new Map<string, number>();
    for (const entry of dayEntries) {
      const key = `${entry.doctorId}-${entry.shiftType}`;
      if (seen.has(key)) {
        conflicts.push({
          date,
          shiftType: entry.shiftType,
          doctorId: entry.doctorId,
          type: "double_shift",
          message: `Médico escalado duas vezes no mesmo turno em ${date}`,
        });
      }
      seen.set(key, entry.doctorId);
    }
  }

  // ── PASSO 7: Calcular estatísticas e score ────────────────────────────────
  const stats: DoctorStats[] = doctors.map((d) => {
    const doctorEntries = entries.filter((e) => e.doctorId === d.id);
    return {
      doctorId: d.id,
      totalShifts: doctorEntries.length,
      totalNights: doctorEntries.filter((e) => e.shiftType === "noite").length,
      totalWeekends: doctorEntries.filter((e) => {
        const date = fromDateStr(e.entryDate);
        return isWeekend(date);
      }).length,
      totalSus: doctorEntries.filter((e) => e.shiftType.includes("sus")).length,
      totalConvenio: doctorEntries.filter((e) => e.shiftType.includes("convenio") || e.shiftType === "plantao_24h").length,
    };
  });

  // Score: desvio padrão dos plantões (menor = mais equilibrado, score mais alto)
  const shiftsArr = stats.filter((s) => s.totalShifts > 0).map((s) => s.totalShifts);
  let balanceScore = 100;
  if (shiftsArr.length > 1) {
    const avg = shiftsArr.reduce((a, b) => a + b, 0) / shiftsArr.length;
    const variance = shiftsArr.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / shiftsArr.length;
    const stdDev = Math.sqrt(variance);
    balanceScore = Math.max(0, Math.round(100 - stdDev * 5));
  }

  return { entries, conflicts, balanceScore, stats };
}

// ── Validação de conflitos para edição manual ─────────────────────────────────
export function validateEntry(
  doctorId: number,
  dateStr: string,
  shiftType: ShiftType,
  existingEntries: GeneratedEntry[],
  doctor: Doctor,
  exceptions: Exception[],
  holidayDates: Set<string>
): ValidationConflict[] {
  const conflicts: ValidationConflict[] = [];
  const date = fromDateStr(dateStr);

  // Duplicidade no mesmo turno
  if (hasConflict(existingEntries, doctorId, dateStr, shiftType)) {
    conflicts.push({ date: dateStr, shiftType, doctorId, type: "double_shift", message: "Médico já escalado neste turno" });
  }

  // Data bloqueada por exceção
  if (isBlockedByException(doctorId, date, shiftType, exceptions)) {
    conflicts.push({ date: dateStr, shiftType, doctorId, type: "blocked_date", message: "Médico indisponível nesta data" });
  }

  // Excesso de noites
  if (shiftType === "noite" && doctor.limiteNoitesMes && doctor.limiteNoitesMes > 0) {
    const nights = countNightsInMonth(existingEntries, doctorId);
    if (nights >= doctor.limiteNoitesMes) {
      conflicts.push({ date: dateStr, shiftType, doctorId, type: "excess_nights", message: `Limite de ${doctor.limiteNoitesMes} noites/mês atingido` });
    }
  }

  // Noite consecutiva
  if (shiftType === "noite") {
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = toDateStr(prevDate);
    const hadNightYesterday = existingEntries.some((e) => e.doctorId === doctorId && e.entryDate === prevDateStr && e.shiftType === "noite");
    if (hadNightYesterday) {
      conflicts.push({ date: dateStr, shiftType, doctorId, type: "excess_nights", message: "Noite consecutiva — médico fez noite ontem" });
    }
  }

  // Restrição do médico para o turno
  const isSaturday = date.getDay() === 6;
  const isSunday = date.getDay() === 0;
  const canDoWeekend24h =
    doctor.category !== "resident" &&
    doctor.canFinalDeSemana &&
    ((isSaturday && doctor.canSabado) || (isSunday && doctor.canDomingo));

  const canDoShift = {
    manha_sus: doctor.canManhaSus,
    manha_convenio: doctor.canManhaConvenio,
    tarde_sus: doctor.canTardeSus,
    tarde_convenio: doctor.canTardeConvenio,
    noite: doctor.canNoite,
    plantao_24h: doctor.can24h || canDoWeekend24h,
  }[shiftType];

  if (!canDoShift) {
    conflicts.push({ date: dateStr, shiftType, doctorId, type: "restriction_violation", message: `Médico não pode fazer ${shiftType.replace("_", " ")}` });
  }

  return conflicts;
}
