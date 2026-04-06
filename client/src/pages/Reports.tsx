import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProfilePresentation } from "@/lib/profilePresentation";
import {
  getProductShiftKey,
  getProductShiftLabel,
} from "@/lib/productShifts";
import { exportScheduleAsPdf } from "@/lib/schedulePdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, FileDown, Moon, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

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

export default function Reports() {
  const { activeProfileName, professionalPlural, shiftOptions } =
    useActiveProfilePresentation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: schedule } = trpc.schedules.getByMonth.useQuery({ year, month });
  const { data: doctors } = trpc.doctors.list.useQuery();
  const { data: stats } = trpc.schedules.getStats.useQuery(
    { scheduleId: schedule?.id ?? 0 },
    { enabled: !!schedule?.id }
  );

  function prevMonth() {
    if (month === 1) {
      setYear((value) => value - 1);
      setMonth(12);
      return;
    }

    setMonth((value) => value - 1);
  }

  function nextMonth() {
    if (month === 12) {
      setYear((value) => value + 1);
      setMonth(1);
      return;
    }

    setMonth((value) => value + 1);
  }

  const doctorMap = new Map(doctors?.map((doctor) => [doctor.id, doctor]) ?? []);

  const shiftDistribution: Record<string, number> = {};
  if (schedule?.entries) {
    for (const entry of schedule.entries) {
      const shiftKey = getProductShiftKey(entry.shiftType);
      if (!shiftKey) continue;
      shiftDistribution[shiftKey] = (shiftDistribution[shiftKey] ?? 0) + 1;
    }
  }

  function exportCSV() {
    if (!stats || !schedule?.entries) {
      toast.error("Nenhuma escala para exportar");
      return;
    }

    const rows = [
      ["Medico", "Total Plantoes", "Noites", "Finais de Semana"],
      ...stats
        .filter((stat) => stat.totalShifts > 0)
        .map((stat) => [
          stat.doctorName,
          stat.totalShifts,
          stat.totalNights,
          stat.totalWeekends,
        ]),
    ];

    const csv = rows.map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `escala_${month}_${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  }

  function exportDetailedCSV() {
    if (!schedule?.entries) {
      toast.error("Nenhuma escala para exportar");
      return;
    }

    const rows = [
      ["Data", "Dia da Semana", "Turno", "Medico"],
      ...[...schedule.entries]
        .sort((entryA, entryB) => {
          const dateA = String(entryA.entryDate);
          const dateB = String(entryB.entryDate);
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          return entryA.shiftType.localeCompare(entryB.shiftType);
        })
        .map((entry) => {
          const date = new Date(`${entry.entryDate}T00:00:00`);
          const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
          const doctor = doctorMap.get(entry.doctorId);

          return [
            date.toLocaleDateString("pt-BR"),
            weekdayLabels[date.getDay()],
            getProductShiftLabel(entry.shiftType),
            doctor?.name ?? `Medico ${entry.doctorId}`,
          ];
        }),
    ];

    const csv = rows.map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `escala_detalhada_${month}_${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV detalhado exportado!");
  }

  function exportPDF() {
    if (!schedule?.entries?.length) {
      toast.error("Nenhuma escala para exportar");
      return;
    }

    const opened = exportScheduleAsPdf({
      activeProfileName,
      balanceScore: schedule.balanceScore,
      doctors: doctors ?? [],
      entries: schedule.entries,
      month,
      professionalPlural,
      shiftOptions: shiftOptions.map((shift) => ({
        key: shift.key,
        label: shift.label,
        short: shift.short,
      })),
      year,
    });

    if (!opened) {
      toast.error("Nao foi possivel abrir a janela de impressao");
      return;
    }

    toast.success('Janela de impressao aberta. Escolha "Salvar como PDF".');
  }

  const totalShifts = stats?.reduce((sum, stat) => sum + stat.totalShifts, 0) ?? 0;
  const totalNights = stats?.reduce((sum, stat) => sum + stat.totalNights, 0) ?? 0;
  const totalWeekends = stats?.reduce((sum, stat) => sum + stat.totalWeekends, 0) ?? 0;

  const exportSection = schedule ? (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileDown className="h-4 w-4" /> Exportacoes Gerenciais
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={exportCSV}>
          <FileDown className="h-4 w-4 mr-2" /> Resumo por Medico (CSV)
        </Button>
        <Button variant="outline" onClick={exportDetailedCSV}>
          <FileDown className="h-4 w-4 mr-2" /> Escala Detalhada (CSV)
        </Button>
        <Button
          variant="outline"
          onClick={exportPDF}
        >
          <FileDown className="h-4 w-4 mr-2" /> Relatorio Gerencial (PDF)
        </Button>
      </CardContent>
    </Card>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatorios</h1>
          <p className="text-muted-foreground text-sm">Analise e exportacao da escala</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[150px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalShifts}</p>
                <p className="text-xs text-muted-foreground">Total de plantoes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Moon className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{totalNights}</p>
                <p className="text-xs text-muted-foreground">Plantoes noturnos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{schedule?.balanceScore ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Score equilibrio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(shiftDistribution).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuicao por Turno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(shiftDistribution).map(([shift, count]) => (
                <div key={shift} className="flex items-center gap-3">
                  <span className="text-sm w-32">{getProductShiftLabel(shift)}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: totalShifts > 0 ? `${(count / totalShifts) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats && stats.filter((stat) => stat.totalShifts > 0).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Plantoes por Medico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 font-medium">Medico</th>
                    <th className="text-right py-2 font-medium">Total</th>
                    <th className="text-right py-2 font-medium">Noites</th>
                    <th className="text-right py-2 font-medium">FDS</th>
                  </tr>
                </thead>
                <tbody>
                  {stats
                    .filter((stat) => stat.totalShifts > 0)
                    .sort((statA, statB) => statB.totalShifts - statA.totalShifts)
                    .map((stat) => (
                      <tr key={stat.doctorId} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: stat.doctorColor ?? "#3B82F6" }}
                            />
                            {stat.doctorName}
                          </div>
                        </td>
                        <td className="text-right py-2 font-medium">{stat.totalShifts}</td>
                        <td className="text-right py-2 text-purple-600">{stat.totalNights}</td>
                        <td className="text-right py-2 text-orange-600">{stat.totalWeekends}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {exportSection}

      {!schedule && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>
            Nenhuma escala gerada para {MONTH_NAMES[month - 1]} {year}
          </p>
          <p className="text-sm mt-1">Gere a escala no Dashboard para visualizar os relatorios.</p>
        </div>
      )}
    </div>
  );
}
