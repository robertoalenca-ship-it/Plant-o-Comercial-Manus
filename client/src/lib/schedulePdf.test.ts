import { describe, expect, it } from "vitest";
import {
  buildScheduleCalendarPdfHtml,
  buildSchedulePdfHtml,
} from "@/lib/schedulePdf";

describe("buildSchedulePdfHtml", () => {
  it("renders the selected month with the grouped schedule and doctor summary", () => {
    const html = buildSchedulePdfHtml({
      activeProfileName: "Ortopedia",
      balanceScore: 97,
      doctors: [
        { id: 1, name: "Luiz Rogerio", shortName: "Luiz", cor: "#2563eb" },
        { id: 2, name: "Marcela", shortName: "Marcela", cor: "#dc2626" },
      ],
      entries: [
        {
          id: 10,
          doctorId: 1,
          entryDate: "2026-05-02",
          shiftType: "plantao_24h",
          isFixed: true,
        },
        {
          id: 11,
          doctorId: 2,
          entryDate: "2026-05-03",
          shiftType: "noite",
        },
      ],
      month: 5,
      professionalPlural: "Medicos",
      shiftOptions: [
        { key: "manha", label: "Manha" },
        { key: "noite", label: "Noite" },
      ],
      year: 2026,
    });

    expect(html).toContain("Escala Ortopedia - Maio 2026");
    expect(html).toContain("Luiz");
    expect(html).toContain("Marcela");
    expect(html).toContain("02/05/2026");
    expect(html).toContain("Fixo");
    expect(html).toContain("Resumo por medico");
  });

  it("renders the visual monthly calendar for disclosure", () => {
    const html = buildScheduleCalendarPdfHtml({
      activeProfileName: "Ortopedia",
      doctors: [
        { id: 1, name: "Luiz Rogerio", shortName: "Luiz", cor: "#2563eb" },
      ],
      entries: [
        {
          id: 10,
          doctorId: 1,
          entryDate: "2026-05-02",
          shiftType: "plantao_24h",
        },
      ],
      month: 5,
      professionalPlural: "Medicos",
      shiftOptions: [{ key: "noite", label: "Noite", short: "Noite" }],
      year: 2026,
    });

    expect(html).toContain("Calendario Maio 2026");
    expect(html).toContain("Visualizacao mensal pronta para divulgar a escala");
    expect(html).toContain("calendar-grid");
    expect(html).toContain("Luiz");
  });
});
