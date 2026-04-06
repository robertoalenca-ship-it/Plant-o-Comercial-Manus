import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getAllDoctors,
  getAllExceptions,
  getAllWeekendRules,
  getAllWeeklyRules,
  getEntriesForSchedule,
  getHolidaysForMonth,
  getScheduleByMonth,
} from "../server/db.ts";
import { generateSchedule } from "../server/scheduleGenerator.ts";

const YEAR = 2026;
const MONTH = 5;
const OUTPUT_DIR = path.resolve("reports");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "maio-2026-proposta.md");

function normalizeDate(value: unknown): string {
  if (typeof value === "string") return value;
  return new Date(value as Date).toISOString().split("T")[0];
}

function formatDay(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const shiftOrder = [
  "manha_sus",
  "manha_convenio",
  "tarde_sus",
  "tarde_convenio",
  "plantao_24h",
  "noite",
] as const;

const shiftLabels: Record<(typeof shiftOrder)[number], string> = {
  manha_sus: "Manha SUS",
  manha_convenio: "Manha Convenio",
  tarde_sus: "Tarde SUS",
  tarde_convenio: "Tarde Convenio",
  plantao_24h: "Plantao 24h",
  noite: "Noite",
};

async function main() {
  const allDoctors = await getAllDoctors();
  const weeklyRules = await getAllWeeklyRules();
  const weekendRules = await getAllWeekendRules();
  const exceptions = await getAllExceptions();
  const holidays = await getHolidaysForMonth(YEAR, MONTH);
  const holidayDates = new Set(holidays.map((item) => normalizeDate(item.holidayDate)));
  const residentIds = allDoctors.filter((doctor) => doctor.category === "resident").map((doctor) => doctor.id);

  const prevSchedule = await getScheduleByMonth(2026, 4);
  let prevMonthEntries: Array<{ doctorId: number; shiftType: string }> = [];
  if (prevSchedule) {
    const entries = await getEntriesForSchedule(prevSchedule.id);
    prevMonthEntries = entries.map((entry) => ({
      doctorId: entry.doctorId,
      shiftType: entry.shiftType,
    }));
  }

  const result = generateSchedule(
    YEAR,
    MONTH,
    allDoctors as any,
    weeklyRules as any,
    weekendRules as any,
    exceptions as any,
    holidayDates,
    residentIds,
    prevMonthEntries,
  );

  const doctorNameById = new Map(allDoctors.map((doctor) => [doctor.id, doctor.name]));
  const grouped = new Map<string, typeof result.entries>();

  for (const entry of result.entries) {
    const key = entry.entryDate;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }

  const sortedDays = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));
  const lines: string[] = [];

  lines.push("# Proposta de Escala Maio 2026");
  lines.push("");
  lines.push(`- Score de equilibrio: ${result.balanceScore}`);
  lines.push(`- Total de entradas: ${result.entries.length}`);
  lines.push(`- Total de conflitos: ${result.conflicts.length}`);
  lines.push("");

  if (result.conflicts.length > 0) {
    lines.push("## Conflitos");
    lines.push("");
    for (const conflict of result.conflicts) {
      lines.push(`- ${conflict.date} | ${conflict.shiftType} | ${conflict.message}`);
    }
    lines.push("");
  }

  lines.push("## Escala");
  lines.push("");

  for (const dateStr of sortedDays) {
    const entries = grouped.get(dateStr)!;
    entries.sort((a, b) => shiftOrder.indexOf(a.shiftType as (typeof shiftOrder)[number]) - shiftOrder.indexOf(b.shiftType as (typeof shiftOrder)[number]));
    lines.push(`### ${formatDay(dateStr)} (${dateStr})`);
    for (const entry of entries) {
      lines.push(`- ${shiftLabels[entry.shiftType as (typeof shiftOrder)[number]]}: ${doctorNameById.get(entry.doctorId) ?? `Medico ${entry.doctorId}`}`);
    }
    lines.push("");
  }

  lines.push("## Carga por Medico");
  lines.push("");
  for (const stat of [...result.stats].sort((a, b) => b.totalShifts - a.totalShifts || a.doctorId - b.doctorId)) {
    if (stat.totalShifts === 0) continue;
    lines.push(`- ${doctorNameById.get(stat.doctorId) ?? `Medico ${stat.doctorId}`}: total ${stat.totalShifts}, noites ${stat.totalNights}, fins de semana ${stat.totalWeekends}`);
  }
  lines.push("");

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, lines.join("\n"), "utf8");

  console.log(`Arquivo gerado em: ${OUTPUT_FILE}`);
  console.log(`Entradas: ${result.entries.length}`);
  console.log(`Conflitos: ${result.conflicts.length}`);
  console.log(`Score: ${result.balanceScore}`);
}

await main();
