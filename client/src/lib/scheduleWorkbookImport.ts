import * as XLSX from "xlsx";
import type { LegacyShiftType } from "./productShifts";

export type ScheduleWorkbookImportSource = "xlsx" | "xls";

export type ScheduleWorkbookParseError = {
  rowNumber: number;
  message: string;
};

export type ScheduleWorkbookPreviewRow = {
  doctorName: string;
  entryDate: string;
  shiftType: LegacyShiftType;
  sourceLabel: string;
};

export type ScheduleWorkbookPreview = {
  errors: ScheduleWorkbookParseError[];
  month: number;
  monthLabel: string;
  rows: ScheduleWorkbookPreviewRow[];
  sheetName: string;
  source: ScheduleWorkbookImportSource;
  title: string;
  totalRows: number;
  year: number;
};

type BlockAssignment = {
  doctorName: string;
  label: string;
  normalizedLabel: string;
  rowNumber: number;
};

type DayBlock = {
  assignments: BlockAssignment[];
  entryDate: string;
  hasHolidayMarker: boolean;
  rowNumber: number;
};

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  abril: 4,
  agosto: 8,
  dezembro: 12,
  fevereiro: 2,
  janeiro: 1,
  julho: 7,
  junho: 6,
  maio: 5,
  marco: 3,
  novembro: 11,
  outubro: 10,
  setembro: 9,
};

const WEEKDAY_NAMES = new Set([
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
]);

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cleanDoctorName(value: string) {
  return value
    .replace(/\b(?:sus|conv|cov|convenio)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectImportSource(
  fileName: string,
  mimeType = ""
): ScheduleWorkbookImportSource | null {
  const normalizedName = fileName.trim().toLowerCase();

  if (normalizedName.endsWith(".xlsx")) return "xlsx";
  if (normalizedName.endsWith(".xls")) return "xls";

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "xlsx";
  }

  if (mimeType === "application/vnd.ms-excel") {
    return "xls";
  }

  return null;
}

function parseDisplayedDate(rawValue: string) {
  const match = rawValue.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (!match) return null;

  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);
  const rawYear = Number.parseInt(match[3], 10);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseMonthYearFromTitle(title: string) {
  const normalizedTitle = normalizeText(title);
  const match = normalizedTitle.match(
    /\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b.*?\b(20\d{2})\b/
  );

  if (!match) return null;

  const month = MONTH_NAME_TO_NUMBER[match[1]];
  const year = Number.parseInt(match[2], 10);

  if (!month || Number.isNaN(year)) return null;

  return { month, year };
}

function parseMonthYearFromEntryDates(entryDates: string[]) {
  const firstDate = entryDates[0];
  if (!firstDate) return null;

  const date = new Date(`${firstDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function getStandardShiftType(label: string): LegacyShiftType | null {
  const normalizedLabel = normalizeText(label);

  if (normalizedLabel === "manha sus") return "manha_sus";
  if (normalizedLabel === "manha convenio") return "manha_convenio";
  if (normalizedLabel === "tarde sus") return "tarde_sus";
  if (normalizedLabel === "tarde convenio") return "tarde_convenio";
  if (normalizedLabel === "noite") return "noite";
  if (normalizedLabel === "plantao 24h") return "plantao_24h";

  return null;
}

function getSheetScore(rows: string[][]) {
  let score = 0;

  for (const row of rows.slice(0, 12)) {
    for (const cell of row) {
      const normalizedCell = normalizeText(cell);

      if (normalizedCell.includes("plantoes")) score += 10;
      if (parseMonthYearFromTitle(cell)) score += 8;
      if (WEEKDAY_NAMES.has(normalizedCell)) score += 2;
      if (parseDisplayedDate(cell)) score += 3;
      if (getStandardShiftType(cell)) score += 2;
      if (normalizedCell === "convenio" || normalizedCell === "sus") score += 2;
      if (normalizedCell === "feriado") score += 4;
    }
  }

  return score;
}

function chooseBestSheet(
  workbook: XLSX.WorkBook
): { rows: string[][]; sheetName: string } | null {
  const parsedSheets = workbook.SheetNames.map(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const rows =
      (XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        blankrows: false,
        defval: "",
      }) as string[][]) ?? [];

    return {
      rows: rows.map(row => row.map(value => `${value ?? ""}`.trim())),
      score: getSheetScore(rows),
      sheetName,
    };
  }).sort((left, right) => right.score - left.score);

  return parsedSheets[0] ?? null;
}

function extractDayBlocks(rows: string[][]) {
  const blockStarts: Array<{
    entryDate: string;
    rowIndex: number;
    startCol: number;
  }> = [];

  rows.forEach((row, rowIndex) => {
    for (let colIndex = 0; colIndex < row.length - 1; colIndex += 1) {
      const weekdayCell = normalizeText(row[colIndex] ?? "");
      const entryDate = parseDisplayedDate(`${row[colIndex + 1] ?? ""}`);

      if (!entryDate || !WEEKDAY_NAMES.has(weekdayCell)) {
        continue;
      }

      blockStarts.push({
        entryDate,
        rowIndex,
        startCol: colIndex,
      });
    }
  });

  const blocks: DayBlock[] = [];
  const errors: ScheduleWorkbookParseError[] = [];
  const groupedStarts = new Map<number, typeof blockStarts>();

  for (const blockStart of blockStarts) {
    if (!groupedStarts.has(blockStart.startCol)) {
      groupedStarts.set(blockStart.startCol, []);
    }
    groupedStarts.get(blockStart.startCol)!.push(blockStart);
  }

  for (const starts of Array.from(groupedStarts.values())) {
    starts.sort(
      (
        left: { entryDate: string; rowIndex: number; startCol: number },
        right: { entryDate: string; rowIndex: number; startCol: number }
      ) => left.rowIndex - right.rowIndex
    );

    starts.forEach(
      (
        blockStart: { entryDate: string; rowIndex: number; startCol: number },
        index: number
      ) => {
      const nextBlock = starts[index + 1];
      const endRowIndex = nextBlock ? nextBlock.rowIndex - 1 : rows.length - 1;
      const assignments: BlockAssignment[] = [];
      let hasHolidayMarker =
        normalizeText(
          `${rows[blockStart.rowIndex]?.[blockStart.startCol + 2] ?? ""}`
        ) === "feriado";

      for (
        let rowIndex = blockStart.rowIndex + 1;
        rowIndex <= endRowIndex;
        rowIndex += 1
      ) {
        const row = rows[rowIndex] ?? [];
        const label = `${row[blockStart.startCol + 2] ?? ""}`.trim();
        const doctorName = `${row[blockStart.startCol + 3] ?? ""}`.trim();

        if (!label && !doctorName) {
          continue;
        }

        if (normalizeText(label) === "feriado") {
          hasHolidayMarker = true;
          continue;
        }

        if (!label) {
          errors.push({
            rowNumber: rowIndex + 1,
            message: "Linha com medico, mas sem rotulo de plantao",
          });
          continue;
        }

        if (!doctorName) {
          errors.push({
            rowNumber: rowIndex + 1,
            message: `Linha com rotulo '${label}', mas sem medico`,
          });
          continue;
        }

        const cleanedDoctorName = cleanDoctorName(doctorName);

        if (!cleanedDoctorName) {
          errors.push({
            rowNumber: rowIndex + 1,
            message: `Nao foi possivel identificar o medico em '${doctorName}'`,
          });
          continue;
        }

        assignments.push({
          doctorName: cleanedDoctorName,
          label,
          normalizedLabel: normalizeText(label),
          rowNumber: rowIndex + 1,
        });
      }

      blocks.push({
        assignments,
        entryDate: blockStart.entryDate,
        hasHolidayMarker,
        rowNumber: blockStart.rowIndex + 1,
      });
      }
    );
  }

  return { blocks, errors };
}

function createPreviewRow(
  block: DayBlock,
  assignment: BlockAssignment,
  shiftType: LegacyShiftType
): ScheduleWorkbookPreviewRow {
  return {
    doctorName: assignment.doctorName,
    entryDate: block.entryDate,
    shiftType,
    sourceLabel: assignment.label,
  };
}

function findAssignment(
  block: DayBlock,
  candidateLabels: readonly string[]
): BlockAssignment | undefined {
  return candidateLabels
    .map(candidateLabel => normalizeText(candidateLabel))
    .map(candidateLabel =>
      block.assignments.find(
        assignment => assignment.normalizedLabel === candidateLabel
      )
    )
    .find(Boolean);
}

function dedupeRows(rows: ScheduleWorkbookPreviewRow[]) {
  const uniqueRows = new Map<string, ScheduleWorkbookPreviewRow>();

  for (const row of rows) {
    const key = `${row.entryDate}|${row.shiftType}|${normalizeText(row.doctorName)}`;
    if (!uniqueRows.has(key)) {
      uniqueRows.set(key, row);
    }
  }

  return Array.from(uniqueRows.values());
}

function sortRows(rows: ScheduleWorkbookPreviewRow[]) {
  const shiftOrder: Record<LegacyShiftType, number> = {
    plantao_24h: 0,
    manha_sus: 1,
    manha_convenio: 2,
    tarde_sus: 3,
    tarde_convenio: 4,
    noite: 5,
  };

  return [...rows].sort((left, right) => {
    const dateCompare = left.entryDate.localeCompare(right.entryDate);
    if (dateCompare !== 0) return dateCompare;

    const shiftCompare = shiftOrder[left.shiftType] - shiftOrder[right.shiftType];
    if (shiftCompare !== 0) return shiftCompare;

    return left.doctorName.localeCompare(right.doctorName, "pt-BR", {
      sensitivity: "base",
    });
  });
}

function expandDayBlock(block: DayBlock) {
  const errors: ScheduleWorkbookParseError[] = [];
  const expandedRows: ScheduleWorkbookPreviewRow[] = [];
  const date = new Date(`${block.entryDate}T00:00:00`);
  const dayOfWeek = date.getDay();
  const standardAssignments = block.assignments
    .map(assignment => {
      const shiftType = getStandardShiftType(assignment.label);
      return shiftType
        ? createPreviewRow(block, assignment, shiftType)
        : null;
    })
    .filter((row): row is ScheduleWorkbookPreviewRow => Boolean(row));

  if (dayOfWeek === 6) {
    expandedRows.push(...standardAssignments);

    const plantao24h = findAssignment(block, ["Convenio", "Plantao 24h"]);
    const susCoverage = findAssignment(block, ["SUS"]);

    if (plantao24h) {
      expandedRows.push(createPreviewRow(block, plantao24h, "plantao_24h"));
    }

    if (susCoverage) {
      expandedRows.push(createPreviewRow(block, susCoverage, "manha_sus"));
      expandedRows.push(createPreviewRow(block, susCoverage, "tarde_sus"));
    }
  } else if (dayOfWeek === 0) {
    expandedRows.push(...standardAssignments);

    const convenioDay = findAssignment(block, ["Convenio - dia", "Convenio"]);
    const susDay = findAssignment(block, ["SUS - dia", "SUS"]);
    const nightCoverage = findAssignment(block, ["Convenio noite", "Noite"]);

    if (
      convenioDay &&
      susDay &&
      normalizeText(convenioDay.doctorName) !== normalizeText(susDay.doctorName)
    ) {
      errors.push({
        rowNumber: susDay.rowNumber,
        message:
          "Domingo com medicos diferentes em convenio e SUS durante o dia; usando o medico de convenio para o plantao_24h",
      });
    }

    if (convenioDay ?? susDay) {
      expandedRows.push(
        createPreviewRow(block, convenioDay ?? susDay!, "plantao_24h")
      );
    }

    if (nightCoverage) {
      expandedRows.push(createPreviewRow(block, nightCoverage, "noite"));
    }
  } else if (block.hasHolidayMarker) {
    const convenio = findAssignment(block, ["Convenio"]);
    const sus = findAssignment(block, ["SUS"]);

    if (convenio) {
      expandedRows.push(createPreviewRow(block, convenio, "manha_convenio"));
    }

    if (sus) {
      expandedRows.push(createPreviewRow(block, sus, "manha_sus"));
    }
  } else {
    expandedRows.push(...standardAssignments);
  }

  if (expandedRows.length === 0) {
    errors.push({
      rowNumber: block.rowNumber,
      message: `Nenhum plantao reconhecido para o dia ${block.entryDate}`,
    });
  }

  return {
    errors,
    rows: dedupeRows(expandedRows),
  };
}

function buildWorkbookPreview(
  rows: string[][],
  source: ScheduleWorkbookImportSource,
  sheetName: string
): ScheduleWorkbookPreview {
  const title =
    rows
      .slice(0, 4)
      .flat()
      .map(value => `${value ?? ""}`.trim())
      .find(Boolean) ?? "";
  const { blocks, errors: blockErrors } = extractDayBlocks(rows);
  const entryDates = Array.from(new Set(blocks.map(block => block.entryDate)));
  const parsedMonthYear =
    parseMonthYearFromTitle(title) ?? parseMonthYearFromEntryDates(entryDates);

  if (!parsedMonthYear) {
    throw new Error("Nao foi possivel identificar o mes e o ano da planilha.");
  }

  const rowsToImport: ScheduleWorkbookPreviewRow[] = [];
  const errors = [...blockErrors];

  blocks.forEach(block => {
    const expandedBlock = expandDayBlock(block);
    rowsToImport.push(...expandedBlock.rows);
    errors.push(...expandedBlock.errors);
  });

  const dedupedRows = sortRows(dedupeRows(rowsToImport));

  return {
    errors,
    month: parsedMonthYear.month,
    monthLabel: MONTH_NAMES[parsedMonthYear.month - 1] ?? String(parsedMonthYear.month),
    rows: dedupedRows,
    sheetName,
    source,
    title,
    totalRows: dedupedRows.length + errors.length,
    year: parsedMonthYear.year,
  };
}

export async function parseScheduleWorkbookFile(
  file: Pick<File, "arrayBuffer" | "name" | "type">
): Promise<ScheduleWorkbookPreview> {
  const source = detectImportSource(file.name, file.type);

  if (!source) {
    throw new Error("Formato nao suportado. Use XLSX ou XLS.");
  }

  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    dense: true,
  });
  const bestSheet = chooseBestSheet(workbook);

  if (!bestSheet) {
    throw new Error("Planilha vazia ou sem abas validas.");
  }

  return buildWorkbookPreview(bestSheet.rows, source, bestSheet.sheetName);
}
