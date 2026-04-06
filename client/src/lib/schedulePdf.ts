import { getProductShiftKey } from "@/lib/productShifts";

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

const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
];

const WEEKDAY_NAMES_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const SHIFT_PALETTE: Record<
  string,
  { background: string; border: string; text: string }
> = {
  manha: {
    background: "#dbeafe",
    border: "#93c5fd",
    text: "#1d4ed8",
  },
  tarde: {
    background: "#e0f2fe",
    border: "#7dd3fc",
    text: "#0369a1",
  },
  noite: {
    background: "#ede9fe",
    border: "#c4b5fd",
    text: "#6d28d9",
  },
};

export type SchedulePdfDoctor = {
  id: number;
  name: string;
  shortName?: string | null;
  cor?: string | null;
};

export type SchedulePdfEntry = {
  id: number;
  doctorId: number;
  entryDate: string | Date;
  shiftType: string;
  notes?: string | null;
  isFixed?: boolean;
  conflictWarning?: string | null;
};

export type SchedulePdfShift = {
  key: string;
  label: string;
  short?: string;
};

type BuildSchedulePdfOptions = {
  activeProfileName: string;
  balanceScore?: number | null;
  doctors: SchedulePdfDoctor[];
  entries: SchedulePdfEntry[];
  generatedAt?: Date;
  month: number;
  professionalPlural?: string;
  shiftOptions: readonly SchedulePdfShift[];
  year: number;
};

type DoctorSummary = {
  color: string;
  id: number;
  name: string;
  totalNights: number;
  totalShifts: number;
  totalWeekends: number;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeDateString(entryDate: string | Date) {
  if (typeof entryDate === "string") {
    return entryDate.includes("T") ? entryDate.split("T")[0] : entryDate;
  }

  return entryDate.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${dateStr}T00:00:00`));
}

function buildDoctorSummaries(
  doctors: SchedulePdfDoctor[],
  entries: SchedulePdfEntry[]
) {
  const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const summaryMap = new Map<number, DoctorSummary>();

  for (const entry of entries) {
    const dateStr = normalizeDateString(entry.entryDate);
    const date = new Date(`${dateStr}T00:00:00`);
    const doctor = doctorMap.get(entry.doctorId);

    if (!summaryMap.has(entry.doctorId)) {
      summaryMap.set(entry.doctorId, {
        color: doctor?.cor ?? "#2563eb",
        id: entry.doctorId,
        name: doctor?.name ?? `Medico ${entry.doctorId}`,
        totalNights: 0,
        totalShifts: 0,
        totalWeekends: 0,
      });
    }

    const summary = summaryMap.get(entry.doctorId)!;
    summary.totalShifts += 1;

    if (getProductShiftKey(entry.shiftType) === "noite") {
      summary.totalNights += 1;
    }

    if (date.getDay() === 0 || date.getDay() === 6) {
      summary.totalWeekends += 1;
    }
  }

  return Array.from(summaryMap.values()).sort((left, right) => {
    if (right.totalShifts !== left.totalShifts) {
      return right.totalShifts - left.totalShifts;
    }

    return left.name.localeCompare(right.name);
  });
}

function buildEntriesByDateAndShift(entries: SchedulePdfEntry[]) {
  const map = new Map<string, Map<string, SchedulePdfEntry[]>>();

  for (const entry of entries) {
    const dateStr = normalizeDateString(entry.entryDate);
    const shiftKey = getProductShiftKey(entry.shiftType);
    if (!shiftKey) continue;

    if (!map.has(dateStr)) {
      map.set(dateStr, new Map());
    }

    const shifts = map.get(dateStr)!;
    if (!shifts.has(shiftKey)) {
      shifts.set(shiftKey, []);
    }

    shifts.get(shiftKey)!.push(entry);
  }

  return map;
}

function buildCalendarRowsHtml(options: BuildSchedulePdfOptions) {
  const doctorMap = new Map(options.doctors.map((doctor) => [doctor.id, doctor]));
  const entryMap = buildEntriesByDateAndShift(options.entries);
  const daysInMonth = new Date(options.year, options.month, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const currentDate = new Date(options.year, options.month - 1, index + 1);
    const dateStr = normalizeDateString(currentDate);
    const weekdayName = WEEKDAY_NAMES[currentDate.getDay()];
    const shiftCells = options.shiftOptions
      .map((shift) => {
        const shiftEntries = entryMap.get(dateStr)?.get(shift.key) ?? [];

        if (shiftEntries.length === 0) {
          return `<td class="empty-cell">-</td>`;
        }

        const content = shiftEntries
          .map((entry) => {
            const doctor = doctorMap.get(entry.doctorId);
            const doctorName = escapeHtml(
              doctor?.shortName || doctor?.name || `Medico ${entry.doctorId}`
            );
            const note = entry.notes ? ` <span class="entry-note">(${escapeHtml(entry.notes)})</span>` : "";
            const fixedBadge = entry.isFixed
              ? ' <span class="entry-badge">Fixo</span>'
              : "";
            return `<div class="entry-name">${doctorName}${fixedBadge}${note}</div>`;
          })
          .join("");

        return `<td>${content}</td>`;
      })
      .join("");

    return `
      <tr>
        <td class="date-cell">${escapeHtml(formatDisplayDate(dateStr))}</td>
        <td class="weekday-cell">${escapeHtml(weekdayName)}</td>
        ${shiftCells}
      </tr>
    `;
  }).join("");
}

function getShiftPalette(shiftKey: string) {
  return (
    SHIFT_PALETTE[shiftKey] ?? {
      background: "#f1f5f9",
      border: "#cbd5e1",
      text: "#334155",
    }
  );
}

function buildLegendHtml(shiftOptions: readonly SchedulePdfShift[]) {
  return shiftOptions
    .map((shift) => {
      const palette = getShiftPalette(shift.key);
      return `
        <span
          class="legend-item"
          style="background:${palette.background};border-color:${palette.border};color:${palette.text}"
        >
          ${escapeHtml(shift.label)}
        </span>
      `;
    })
    .join("");
}

function buildCalendarGridHtml(options: BuildSchedulePdfOptions) {
  const doctorMap = new Map(options.doctors.map((doctor) => [doctor.id, doctor]));
  const entryMap = buildEntriesByDateAndShift(options.entries);
  const totalDays = new Date(options.year, options.month, 0).getDate();
  const firstDayOfWeek = new Date(options.year, options.month - 1, 1).getDay();
  const cells: string[] = [];

  for (let index = 0; index < firstDayOfWeek; index += 1) {
    cells.push('<div class="calendar-cell calendar-cell-empty"></div>');
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const currentDate = new Date(options.year, options.month - 1, day);
    const dateStr = normalizeDateString(currentDate);
    const dayEntries = entryMap.get(dateStr);
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const shiftBlocks = options.shiftOptions
      .map((shift) => {
        const shiftEntries = dayEntries?.get(shift.key) ?? [];
        if (shiftEntries.length === 0) {
          return "";
        }

        const palette = getShiftPalette(shift.key);
        const entriesHtml = shiftEntries
          .map((entry) => {
            const doctor = doctorMap.get(entry.doctorId);
            const doctorName = escapeHtml(
              doctor?.shortName || doctor?.name || `Medico ${entry.doctorId}`
            );
            const fixedBadge = entry.isFixed
              ? '<span class="calendar-entry-fixed">Fixo</span>'
              : "";
            return `
              <div class="calendar-entry">
                <span
                  class="calendar-entry-dot"
                  style="background:${escapeHtml(doctor?.cor ?? "#2563eb")}"
                ></span>
                <span class="calendar-entry-name">${doctorName}</span>
                ${fixedBadge}
              </div>
            `;
          })
          .join("");

        return `
          <div
            class="calendar-shift"
            style="background:${palette.background};border-color:${palette.border};color:${palette.text}"
          >
            <div class="calendar-shift-label">${escapeHtml(
              shift.short ?? shift.label
            )}</div>
            ${entriesHtml}
          </div>
        `;
      })
      .join("");

    cells.push(`
      <div class="calendar-cell ${isWeekend ? "calendar-cell-weekend" : ""}">
        <div class="calendar-day-header">
          <span class="calendar-day-number">${day}</span>
          <span class="calendar-day-name">${escapeHtml(
            WEEKDAY_NAMES_SHORT[currentDate.getDay()]
          )}</span>
        </div>
        <div class="calendar-day-body">
          ${shiftBlocks}
        </div>
      </div>
    `);
  }

  while (cells.length % 7 !== 0) {
    cells.push('<div class="calendar-cell calendar-cell-empty"></div>');
  }

  return cells.join("");
}

export function buildSchedulePdfHtml(options: BuildSchedulePdfOptions) {
  const summaries = buildDoctorSummaries(options.doctors, options.entries);
  const totalShifts = options.entries.length;
  const totalProfessionals = new Set(options.entries.map((entry) => entry.doctorId)).size;
  const totalWeekends = options.entries.reduce((count, entry) => {
    const date = new Date(`${normalizeDateString(entry.entryDate)}T00:00:00`);
    return date.getDay() === 0 || date.getDay() === 6 ? count + 1 : count;
  }, 0);
  const generatedAt = (options.generatedAt ?? new Date()).toLocaleString("pt-BR");
  const title = `Escala ${options.activeProfileName} - ${MONTH_NAMES[options.month - 1]} ${options.year}`;
  const tableHeaders = options.shiftOptions
    .map((shift) => `<th>${escapeHtml(shift.label)}</th>`)
    .join("");
  const summaryRows = summaries
    .map(
      (summary) => `
        <tr>
          <td>
            <span class="doctor-dot" style="background:${escapeHtml(summary.color)}"></span>
            ${escapeHtml(summary.name)}
          </td>
          <td>${summary.totalShifts}</td>
          <td>${summary.totalNights}</td>
          <td>${summary.totalWeekends}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            color: #111827;
            font-family: Arial, sans-serif;
            margin: 0;
          }

          .page {
            width: 100%;
          }

          .header {
            align-items: flex-start;
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 20px;
          }

          .title {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 6px;
          }

          .subtitle,
          .meta {
            color: #4b5563;
            font-size: 12px;
            margin: 0;
          }

          .summary-grid {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            margin-bottom: 20px;
          }

          .summary-card {
            background: #f8fafc;
            border: 1px solid #dbeafe;
            border-radius: 10px;
            padding: 12px;
          }

          .summary-card strong {
            display: block;
            font-size: 22px;
            margin-bottom: 4px;
          }

          .summary-card span {
            color: #475569;
            font-size: 11px;
          }

          table {
            border-collapse: collapse;
            width: 100%;
          }

          th,
          td {
            border: 1px solid #d1d5db;
            font-size: 10px;
            padding: 6px 7px;
            text-align: left;
            vertical-align: top;
          }

          thead th {
            background: #eff6ff;
            font-size: 10px;
            text-transform: uppercase;
          }

          .date-cell,
          .weekday-cell {
            white-space: nowrap;
          }

          .empty-cell {
            color: #94a3b8;
            text-align: center;
          }

          .entry-name + .entry-name {
            margin-top: 3px;
          }

          .entry-badge {
            background: #dbeafe;
            border-radius: 999px;
            color: #1d4ed8;
            display: inline-block;
            font-size: 8px;
            margin-left: 4px;
            padding: 1px 4px;
          }

          .entry-note {
            color: #475569;
          }

          .section-title {
            font-size: 14px;
            font-weight: 700;
            margin: 18px 0 8px;
          }

          .doctor-dot {
            border-radius: 999px;
            display: inline-block;
            height: 8px;
            margin-right: 6px;
            width: 8px;
          }

          .footer-note {
            color: #64748b;
            font-size: 11px;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div>
              <h1 class="title">${escapeHtml(title)}</h1>
              <p class="subtitle">${escapeHtml(
                options.professionalPlural ?? "Medicos"
              )} escalados por turno no mes selecionado</p>
              <p class="meta">Gerado em ${escapeHtml(generatedAt)}</p>
            </div>
            <div class="meta">
              <div>Perfil: ${escapeHtml(options.activeProfileName)}</div>
              <div>Mes: ${escapeHtml(MONTH_NAMES[options.month - 1])} ${options.year}</div>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <strong>${totalShifts}</strong>
              <span>Total de plantoes</span>
            </div>
            <div class="summary-card">
              <strong>${totalProfessionals}</strong>
              <span>${escapeHtml(options.professionalPlural ?? "Medicos")} com escala no mes</span>
            </div>
            <div class="summary-card">
              <strong>${totalWeekends}</strong>
              <span>Plantoes em finais de semana</span>
            </div>
            <div class="summary-card">
              <strong>${options.balanceScore ?? "-"}</strong>
              <span>Score de equilibrio</span>
            </div>
          </div>

          <div class="section-title">Escala completa do mes</div>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Dia</th>
                ${tableHeaders}
              </tr>
            </thead>
            <tbody>
              ${buildCalendarRowsHtml(options)}
            </tbody>
          </table>

          <div class="section-title">Resumo por medico</div>
          <table>
            <thead>
              <tr>
                <th>Medico</th>
                <th>Total</th>
                <th>Noites</th>
                <th>FDS</th>
              </tr>
            </thead>
            <tbody>
              ${summaryRows}
            </tbody>
          </table>

          <p class="footer-note">
            Use a opcao "Salvar como PDF" na janela de impressao para guardar o arquivo.
          </p>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => window.print(), 250);
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
    </html>
  `;
}

export function buildScheduleCalendarPdfHtml(options: BuildSchedulePdfOptions) {
  const generatedAt = (options.generatedAt ?? new Date()).toLocaleString("pt-BR");
  const title = `${options.activeProfileName} - Calendario ${MONTH_NAMES[options.month - 1]} ${options.year}`;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            size: A3 landscape;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            color: #0f172a;
            font-family: Arial, sans-serif;
            margin: 0;
          }

          .page {
            width: 100%;
          }

          .header {
            align-items: flex-start;
            display: flex;
            gap: 24px;
            justify-content: space-between;
            margin-bottom: 14px;
          }

          .title {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 4px;
          }

          .subtitle,
          .meta {
            color: #475569;
            font-size: 12px;
            margin: 0;
          }

          .legend {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 12px;
          }

          .legend-item {
            border: 1px solid;
            border-radius: 999px;
            display: inline-flex;
            font-size: 11px;
            font-weight: 600;
            padding: 4px 10px;
          }

          .weekdays,
          .calendar-grid {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(7, minmax(0, 1fr));
          }

          .weekdays {
            margin-bottom: 8px;
          }

          .weekday {
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
            padding: 4px 2px;
            text-align: center;
            text-transform: uppercase;
          }

          .weekday.weekend {
            color: #ea580c;
          }

          .calendar-cell {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            min-height: 170px;
            padding: 10px;
          }

          .calendar-cell-weekend {
            background: #fff7ed;
            border-color: #fed7aa;
          }

          .calendar-cell-empty {
            background: transparent;
            border: none;
          }

          .calendar-day-header {
            align-items: center;
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }

          .calendar-day-number {
            color: #0f172a;
            font-size: 18px;
            font-weight: 700;
          }

          .calendar-day-name {
            color: #64748b;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }

          .calendar-day-body {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }

          .calendar-shift {
            border: 1px solid;
            border-radius: 10px;
            padding: 5px 6px;
          }

          .calendar-shift-label {
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 4px;
            text-transform: uppercase;
          }

          .calendar-entry {
            align-items: center;
            display: flex;
            gap: 5px;
            min-width: 0;
          }

          .calendar-entry + .calendar-entry {
            margin-top: 3px;
          }

          .calendar-entry-dot {
            border-radius: 999px;
            flex-shrink: 0;
            height: 7px;
            width: 7px;
          }

          .calendar-entry-name {
            color: #0f172a;
            font-size: 10px;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .calendar-entry-fixed {
            background: rgba(255, 255, 255, 0.85);
            border-radius: 999px;
            color: #1d4ed8;
            font-size: 8px;
            font-weight: 700;
            margin-left: auto;
            padding: 1px 4px;
          }

          .footer-note {
            color: #64748b;
            font-size: 11px;
            margin-top: 12px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div>
              <h1 class="title">${escapeHtml(title)}</h1>
              <p class="subtitle">Visualizacao mensal pronta para divulgar a escala</p>
              <p class="meta">Gerado em ${escapeHtml(generatedAt)}</p>
            </div>
            <div class="meta">
              <div>Perfil: ${escapeHtml(options.activeProfileName)}</div>
              <div>Mes: ${escapeHtml(MONTH_NAMES[options.month - 1])} ${options.year}</div>
            </div>
          </div>

          <div class="legend">
            ${buildLegendHtml(options.shiftOptions)}
          </div>

          <div class="weekdays">
            ${WEEKDAY_NAMES_SHORT.map(
              (dayName, index) => `
                <div class="weekday ${index === 0 || index === 6 ? "weekend" : ""}">
                  ${escapeHtml(dayName)}
                </div>
              `
            ).join("")}
          </div>

          <div class="calendar-grid">
            ${buildCalendarGridHtml(options)}
          </div>

          <p class="footer-note">
            Use a opcao "Salvar como PDF" na janela de impressao para guardar ou compartilhar este calendario.
          </p>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => window.print(), 250);
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
    </html>
  `;
}

function openHtmlForPrint(html: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}

export function exportScheduleAsPdf(options: BuildSchedulePdfOptions) {
  return openHtmlForPrint(buildSchedulePdfHtml(options));
}

export function exportScheduleCalendarAsPdf(options: BuildSchedulePdfOptions) {
  return openHtmlForPrint(buildScheduleCalendarPdfHtml(options));
}
