import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppBrand from "@/components/AppBrand";
import TemporalTimeline from "@/components/TemporalTimeline";
import { appPath } from "@/lib/appRoutes";
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
import { cn } from "@/lib/utils";

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

  // Process today's entries for the timeline
  const todayEntries = useMemo(() => {
    if (!scheduleQuery.data?.entries || !doctorsQuery.data) return [];
    
    // For demo/dev purposes, if we are in April 2026 (preloaded), 
    // we use April 1st as "today" if our real date isn't in April.
    const refDate = (year === 2026 && month === 4) ? "2026-04-01" : now.toISOString().split('T')[0];
    
    return scheduleQuery.data.entries
      .filter(entry => entry.entryDate.toString().startsWith(refDate))
      .map(entry => {
        const doctor = doctorsQuery.data.find(d => d.id === entry.doctorId);
        return {
          doctorId: entry.doctorId,
          doctorName: doctor?.shortName ?? "Desconhecido",
          doctorColor: doctor?.cor ?? "#334155",
          shiftType: entry.shiftType as any,
          confirmationStatus: (entry as any).confirmationStatus ?? "confirmed", // Default to confirmed for existing
        };
      });
  }, [scheduleQuery.data, doctorsQuery.data, year, month]);

  const statusColors: Record<string, string> = {
    draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    preliminary: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
    approved: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
    locked: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
  };

  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    preliminary: "Preliminar",
    approved: "Aprovada",
    locked: "Bloqueada",
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            {MONTH_NAMES[month - 1]} {year} • <span className="text-primary">{activeProfileName}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => generateMutation.mutate({ year, month })}
            disabled={generateMutation.isPending}
            className="bg-primary hover:bg-primary/90 shadow-sm"
          >
            <Zap className="mr-2 h-4 w-4 fill-current" />
            {generateMutation.isPending ? "Gerando..." : "Gerar Escala"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation(appPath("/calendar"))}
            className="glass shadow-sm"
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Ver Calendario
          </Button>
        </div>
      </div>

      <Card className="relative overflow-hidden border-0 shadow-lg bg-premium-gradient text-white">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <TrendingUp size={240} />
        </div>
        <CardContent className="grid gap-8 p-8 md:grid-cols-[1fr_auto]">
          <div className="space-y-6 relative z-10">
            <AppBrand className="text-white" hideSubtitle />
            <div className="space-y-3">
              <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl text-white">
                Gestão de escalas de alto desempenho.
              </h2>
              <p className="max-w-2xl text-lg leading-relaxed text-teal-50/80">
                Otimize a cobertura hospitalar, gerencie restrições e garanta a equidade na carga de trabalho da sua equipe.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 self-center relative z-10">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col gap-1 min-w-[140px] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-100/70">Mês Ativo</span>
              <strong className="text-lg font-bold">{MONTH_NAMES[month - 1]} {year}</strong>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col gap-1 min-w-[140px] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-100/70">Ocupação</span>
              <strong className="text-lg font-bold">{totalEntries} Plantões</strong>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col gap-1 min-w-[140px] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-100/70">Eficiência</span>
              <strong className="text-lg font-bold">{scheduleQuery.data?.balanceScore ?? 0}/100</strong>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col gap-1 min-w-[140px] shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-100/70">Status</span>
              <strong className="text-lg font-bold">
                {scheduleQuery.data ? statusLabels[scheduleQuery.data.status] : "Pendente"}
              </strong>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="bg-card/40 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <div className="rounded-full bg-teal-100 w-10 h-10 flex items-center justify-center dark:bg-teal-900/30">
                <CalendarDays className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <p className="text-3xl font-extrabold tracking-tight mt-1">{totalEntries}</p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total de Plantões</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <div className="rounded-full bg-blue-100 w-10 h-10 flex items-center justify-center dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-3xl font-extrabold tracking-tight mt-1">{activeDoctors}</p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{professionalPlural}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <div
                className={`rounded-full w-10 h-10 flex items-center justify-center ${
                  conflicts > 0 ? "bg-rose-100 dark:bg-rose-900/30" : "bg-teal-100 dark:bg-teal-900/30"
                }`}
              >
                {conflicts > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                )}
              </div>
              <p className={cn("text-3xl font-extrabold tracking-tight mt-1", conflicts > 0 && "text-rose-600")}>{conflicts}</p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Conflitos de Escala</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <div className="rounded-full bg-amber-100 w-10 h-10 flex items-center justify-center dark:bg-amber-900/30">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-3xl font-extrabold tracking-tight mt-1">
                {scheduleQuery.data?.balanceScore ?? "0"}%
              </p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Equidade Térmica</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <TemporalTimeline 
          entries={todayEntries} 
          dateLabel={year === 2026 && month === 4 ? "Visão Temporal: 01 de Abril de 2026" : `Visão Temporal: ${now.toLocaleDateString('pt-BR')}`}
        />

        <div className="space-y-6">
          {statsQuery.data && statsQuery.data.length > 0 && (
            <Card className="bg-card/40 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Ranking de Carga Horária
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-5">
                  {statsQuery.data
                    .filter((item) => item.totalShifts > 0)
                    .sort((left, right) => right.totalShifts - left.totalShifts)
                    .slice(0, 8)
                    .map((item) => (
                      <div key={item.doctorId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="truncate">{item.doctorName}</span>
                          <span className="text-muted-foreground">{item.totalShifts} Plantões</span>
                        </div>
                        <Progress 
                          value={(item.totalShifts / 25) * 100} 
                          className="h-1.5"
                          style={{ "--progress-foreground": item.doctorColor } as any}
                        />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card/40 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4 hover:border-teal-500/50 hover:bg-teal-50/10 transition-all border-slate-200/60 dark:border-slate-800/60"
                  onClick={() => setLocation(appPath("/calendar"))}
                >
                  <CalendarDays className="h-5 w-5 text-teal-500" />
                  <span className="text-xs font-bold tracking-tight">Escala Mensal</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4 hover:border-teal-500/50 hover:bg-teal-50/10 transition-all border-slate-200/60 dark:border-slate-800/60"
                  onClick={() => setLocation(appPath("/swaps"))}
                >
                  <Repeat className="h-5 w-5 text-teal-500" />
                  <span className="text-xs font-bold tracking-tight">Mural de Trocas</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4 hover:border-teal-500/50 hover:bg-teal-50/10 transition-all border-slate-200/60 dark:border-slate-800/60"
                  onClick={() => setLocation(appPath("/attendance"))}
                >
                  <MapPin className="h-5 w-5 text-teal-500" />
                  <span className="text-xs font-bold tracking-tight">Bater Ponto</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4 hover:border-teal-500/50 hover:bg-teal-50/10 transition-all border-slate-200/60 dark:border-slate-800/60"
                  onClick={() => setLocation(appPath("/finance"))}
                >
                  <Wallet className="h-5 w-5 text-teal-500" />
                  <span className="text-xs font-bold tracking-tight">Financeiro</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4 hover:border-teal-500/50 hover:bg-teal-50/10 transition-all border-slate-200/60 dark:border-slate-800/60"
                  onClick={() => setLocation(appPath("/doctors"))}
                >
                  <Users className="h-5 w-5 text-teal-500" />
                  <span className="text-xs font-bold tracking-tight">{professionalPlural}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4 hover:border-teal-500/50 hover:bg-teal-50/10 transition-all border-slate-200/60 dark:border-slate-800/60"
                  onClick={() => setLocation(appPath("/reports"))}
                >
                  <BarChart3 className="h-5 w-5 text-teal-500" />
                  <span className="text-xs font-bold tracking-tight">Faturamento</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
