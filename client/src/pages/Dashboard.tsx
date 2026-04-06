import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppBrand from "@/components/AppBrand";
import { useActiveProfilePresentation } from "@/lib/profilePresentation";
import {
  ORTHOPEDICS_PRELOADED_MONTH,
  ORTHOPEDICS_PRELOADED_YEAR,
} from "@shared/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const {
    activeProfileName,
    monthlyScheduleLabel,
    professionalPlural,
    professionalSingular,
  } = useActiveProfilePresentation();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [autoSelectedReferenceMonth, setAutoSelectedReferenceMonth] =
    useState(false);

  const scheduleQuery = trpc.schedules.getByMonth.useQuery({ year, month });
  const preloadedAprilSchedule = trpc.schedules.getByMonth.useQuery(
    {
      year: ORTHOPEDICS_PRELOADED_YEAR,
      month: ORTHOPEDICS_PRELOADED_MONTH,
    },
    {
      enabled:
        year !== ORTHOPEDICS_PRELOADED_YEAR ||
        month !== ORTHOPEDICS_PRELOADED_MONTH,
    }
  );
  const doctorsQuery = trpc.doctors.list.useQuery();
  const statsQuery = trpc.schedules.getStats.useQuery(
    { scheduleId: scheduleQuery.data?.id ?? 0 },
    { enabled: !!scheduleQuery.data?.id }
  );
  const validationQuery = trpc.schedules.validate.useQuery(
    { scheduleId: scheduleQuery.data?.id ?? 0 },
    { enabled: !!scheduleQuery.data?.id }
  );

  const generateMutation = trpc.schedules.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Escala gerada! Score de equilibrio: ${data.balanceScore}/100`);
      scheduleQuery.refetch();
    },
    onError: (err) => toast.error(`Erro ao gerar escala: ${err.message}`),
  });

  useEffect(() => {
    if (autoSelectedReferenceMonth) return;
    if (year !== currentYear || month !== currentMonth) return;
    if (scheduleQuery.isLoading || scheduleQuery.data) return;
    if (!preloadedAprilSchedule.data) return;

    setYear(ORTHOPEDICS_PRELOADED_YEAR);
    setMonth(ORTHOPEDICS_PRELOADED_MONTH);
    setAutoSelectedReferenceMonth(true);
  }, [
    autoSelectedReferenceMonth,
    currentMonth,
    currentYear,
    month,
    preloadedAprilSchedule.data,
    scheduleQuery.data,
    scheduleQuery.isLoading,
    year,
  ]);

  const totalEntries = scheduleQuery.data?.entries?.length ?? 0;
  const conflicts = validationQuery.data?.conflicts?.length ?? 0;
  const activeDoctors = doctorsQuery.data?.length ?? 0;
  const uncoveredShifts =
    validationQuery.data?.conflicts?.filter(
      (conflict) => conflict.type === "missing_coverage"
    ).length ?? 0;

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    preliminary: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    locked: "bg-gray-100 text-gray-800",
  };

  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    preliminary: "Preliminar",
    approved: "Aprovada",
    locked: "Bloqueada",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {MONTH_NAMES[month - 1]} {year} - Visao geral da {monthlyScheduleLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => generateMutation.mutate({ year, month })}
            disabled={generateMutation.isPending}
            size="sm"
          >
            <Zap className="mr-2 h-4 w-4" />
            {generateMutation.isPending ? "Gerando..." : "Gerar Escala"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/calendar")}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Ver Calendario
          </Button>
        </div>
      </div>

      <Card className="app-hero-card overflow-hidden border-0">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <AppBrand />
            <div className="space-y-2 mt-4">
              <h2 className="text-3xl font-bold leading-tight text-foreground md:text-4xl tracking-tight">
                Escala de plantões inteligente e automatizada.
              </h2>
              <p className="max-w-2xl text-base leading-6 text-muted-foreground mt-2">
                Acompanhe as restrições da sua equipe, avalie a carga de trabalho mensal, previna furos de cobertura e tenha o relatório consolidado pronto para faturamento.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 mt-6 lg:mt-0">
            <div className="app-hero-chip">
              <span className="app-hero-chip-label">Escala ativa</span>
              <strong>{activeProfileName}</strong>
            </div>
            <div className="app-hero-chip">
              <span className="app-hero-chip-label">Mes em foco</span>
              <strong>
                {MONTH_NAMES[month - 1]} {year}
              </strong>
            </div>
            <div className="app-hero-chip">
              <span className="app-hero-chip-label">Cobertura</span>
              <strong>{totalEntries} plantoes</strong>
            </div>
            <div className="app-hero-chip">
              <span className="app-hero-chip-label">Status</span>
              <strong>
                {scheduleQuery.data
                  ? statusLabels[scheduleQuery.data.status]
                  : "Aguardando geracao"}
              </strong>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-950">
                <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEntries}</p>
                <p className="text-xs text-muted-foreground">Plantoes escalados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-100 p-2 dark:bg-teal-950">
                <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeDoctors}</p>
                <p className="text-xs text-muted-foreground">
                  {professionalPlural} ativos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-lg p-2 ${
                  conflicts > 0 ? "bg-red-100 dark:bg-red-950" : "bg-emerald-100 dark:bg-emerald-950"
                }`}
              >
                {conflicts > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold">{conflicts}</p>
                <p className="text-xs text-muted-foreground">Conflitos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-100 p-2 dark:bg-cyan-950">
                <TrendingUp className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {scheduleQuery.data?.balanceScore ?? "-"}
                </p>
                <p className="text-xs text-muted-foreground">Score equilibrio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {scheduleQuery.data && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Status da Escala</CardTitle>
              <Badge className={statusColors[scheduleQuery.data.status]}>
                {statusLabels[scheduleQuery.data.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Gerada em:{" "}
                {scheduleQuery.data.generatedAt
                  ? new Date(scheduleQuery.data.generatedAt).toLocaleString(
                      "pt-BR"
                    )
                  : "-"}
              </span>
              {uncoveredShifts > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  {uncoveredShifts} cobertura(s) descoberta(s)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {statsQuery.data && statsQuery.data.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Carga por {professionalSingular} - {MONTH_NAMES[month - 1]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statsQuery.data
                .filter((item) => item.totalShifts > 0)
                .sort((left, right) => right.totalShifts - left.totalShifts)
                .slice(0, 12)
                .map((item) => (
                  <div key={item.doctorId} className="flex items-center gap-3">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.doctorColor ?? "#3B82F6" }}
                    />
                    <span className="w-28 truncate text-sm font-medium">
                      {item.doctorName}
                    </span>
                    <div className="flex-1">
                      <Progress value={(item.totalShifts / 25) * 100} className="h-2" />
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {item.totalShifts} plant.
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Acoes Rapidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto flex-col gap-1 py-3 hover:border-primary/50"
              onClick={() => setLocation("/calendar")}
            >
              <CalendarDays className="h-5 w-5 text-emerald-500" />
              <span className="text-xs">Ver Calendario</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-1 py-3 hover:border-primary/50"
              onClick={() => setLocation("/doctors")}
            >
              <Users className="h-5 w-5 text-teal-500" />
              <span className="text-xs">{professionalPlural}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-1 py-3 hover:border-primary/50"
              onClick={() => setLocation("/weekly-rules")}
            >
              <Clock className="h-5 w-5 text-cyan-500" />
              <span className="text-xs">Regras Semanais</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-1 py-3 hover:border-primary/50"
              onClick={() => setLocation("/reports")}
            >
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              <span className="text-xs">Relatorios</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {!scheduleQuery.isLoading && !scheduleQuery.data && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <CalendarDays className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">
              Nenhuma escala gerada para {MONTH_NAMES[month - 1]}
            </p>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              Clique em "Gerar Escala" para montar a escala automaticamente com
              base nas regras configuradas.
            </p>
            <Button
              onClick={() => generateMutation.mutate({ year, month })}
              disabled={generateMutation.isPending}
            >
              <Zap className="mr-2 h-4 w-4" />
              Gerar Escala Automatica
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
