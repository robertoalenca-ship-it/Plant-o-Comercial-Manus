import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseScheduleWorkbookFile } from "./scheduleWorkbookImport";

describe("parseScheduleWorkbookFile", () => {
  it("parseia escala mensal com dias uteis, feriado, sabado e domingo", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["PLANTOES ABRIL 2026"],
      [],
      ["Quarta", "4/1/26", "", "", "", "Sexta", "4/3/26", "FERIADO", ""],
      ["", "", "Manha SUS", "Fernando Melo Sus", "", "", "", "Convenio", "Daniel Souza Conv"],
      ["", "", "Manha convenio", "Marcela Conv", "", "", "", "SUS", "Daniel Souza Sus"],
      ["", "", "Tarde SUS", "Rigel Sus"],
      ["", "", "Tarde convenio", "Luan Conv"],
      ["", "", "Noite", "Fernando Melo Conv"],
      ["Sabado", "4/4/26", "", "", "", "Domingo", "4/5/26", "", ""],
      ["", "", "Convenio", "Daniel Souza Conv", "", "", "", "Convenio - dia", "Felipe Conv"],
      ["", "", "SUS", "Lara Sus", "", "", "", "SUS - dia", "Felipe Conv"],
      ["", "", "", "", "", "", "", "Convenio noite", "Lara Conv"],
    ]);

    XLSX.utils.book_append_sheet(workbook, sheet, "Escala");

    const content = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });
    const file = new File([content], "escala-abril.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseScheduleWorkbookFile(file);

    expect(result.sheetName).toBe("Escala");
    expect(result.month).toBe(4);
    expect(result.year).toBe(2026);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(12);
    expect(result.rows).toEqual(
      expect.arrayContaining([
      {
        doctorName: "Fernando Melo",
        entryDate: "2026-04-01",
        shiftType: "manha_sus",
        sourceLabel: "Manha SUS",
      },
      {
        doctorName: "Marcela",
        entryDate: "2026-04-01",
        shiftType: "manha_convenio",
        sourceLabel: "Manha convenio",
      },
      {
        doctorName: "Rigel",
        entryDate: "2026-04-01",
        shiftType: "tarde_sus",
        sourceLabel: "Tarde SUS",
      },
      {
        doctorName: "Luan",
        entryDate: "2026-04-01",
        shiftType: "tarde_convenio",
        sourceLabel: "Tarde convenio",
      },
      {
        doctorName: "Fernando Melo",
        entryDate: "2026-04-01",
        shiftType: "noite",
        sourceLabel: "Noite",
      },
      {
        doctorName: "Daniel Souza",
        entryDate: "2026-04-03",
        shiftType: "manha_convenio",
        sourceLabel: "Convenio",
      },
      {
        doctorName: "Daniel Souza",
        entryDate: "2026-04-03",
        shiftType: "manha_sus",
        sourceLabel: "SUS",
      },
      {
        doctorName: "Daniel Souza",
        entryDate: "2026-04-04",
        shiftType: "plantao_24h",
        sourceLabel: "Convenio",
      },
      {
        doctorName: "Lara",
        entryDate: "2026-04-04",
        shiftType: "manha_sus",
        sourceLabel: "SUS",
      },
      {
        doctorName: "Lara",
        entryDate: "2026-04-04",
        shiftType: "tarde_sus",
        sourceLabel: "SUS",
      },
      {
        doctorName: "Felipe",
        entryDate: "2026-04-05",
        shiftType: "plantao_24h",
        sourceLabel: "Convenio - dia",
      },
      {
        doctorName: "Lara",
        entryDate: "2026-04-05",
        shiftType: "noite",
        sourceLabel: "Convenio noite",
      },
      ])
    );
  });

  it("escolhe automaticamente a aba com a escala", async () => {
    const workbook = XLSX.utils.book_new();
    const introSheet = XLSX.utils.aoa_to_sheet([
      ["Leia-me"],
      ["A escala esta na aba seguinte"],
    ]);
    const scheduleSheet = XLSX.utils.aoa_to_sheet([
      ["PLANTOES ABRIL 2026"],
      [],
      ["Segunda", "4/6/26", "", ""],
      ["", "", "Manha SUS", "Nelio Sus"],
      ["", "", "Manha convenio", "Luiz Rogerio Conv"],
      ["", "", "Tarde SUS", "Nelio Sus"],
      ["", "", "Tarde convenio", "Humberto Conv"],
      ["", "", "Noite", "Nelio Conv"],
    ]);

    XLSX.utils.book_append_sheet(workbook, introSheet, "Leia-me");
    XLSX.utils.book_append_sheet(workbook, scheduleSheet, "Abril");

    const content = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });
    const file = new File([content], "escala-com-abas.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseScheduleWorkbookFile(file);

    expect(result.sheetName).toBe("Abril");
    expect(result.rows).toHaveLength(5);
    expect(result.rows[0]).toMatchObject({
      doctorName: "Nelio",
      entryDate: "2026-04-06",
      shiftType: "manha_sus",
    });
  });
});
