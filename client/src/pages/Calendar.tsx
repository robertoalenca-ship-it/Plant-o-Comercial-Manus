import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { appPath } from "@/lib/appRoutes";
import { trpc } from "@/lib/trpc";
import { useActiveProfilePresentation } from "@/lib/profilePresentation";
import {
  getProductShiftKey,
  getProductShiftLabel,
  toLegacyStandardShiftType,
} from "@/lib/productShifts";
import { exportScheduleCalendarAsPdf } from "@/lib/schedulePdf";
import {
  parseScheduleWorkbookFile,
  type ScheduleWorkbookPreview,
} from "@/lib/scheduleWorkbookImport";
import {
  ORTHOPEDICS_PRELOADED_MONTH,
  ORTHOPEDICS_PRELOADED_YEAR,
} from "@shared/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Zap,
  Lock,
  Plus,
  CheckCircle2,
  FileDown,
  Upload,
  User,
  ArrowRightLeft,
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

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const CONFLICT_TYPE_LABELS: Record<string, string> = {
  double_shift: "Duplicidade",
  blocked_date: "Indisponibilidade",
  excess_nights: "Excesso de noites",
  excess_shifts: "Excesso de plantoes",
  missing_coverage: "Cobertura faltando",
  rotation_break: "Quebra de rodizio",
  restriction_violation: "Restricao violada",
};

function getDaysInMonth(year: number, month: number) {
  const days: Date[] = [];
  const date = new Date(year, month - 1, 1);

  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return days;
}

function toDateStr(date: Date) {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    weekday: "short",
  }).format(new Date(`${dateStr}T00:00:00`));
}

export default function Calendar() {
  const {
    activeProfileName,
    professionalSingular,
    professionalPluralLower,
    shiftOptions,
  } = useActiveProfilePresentation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [autoSelectedReferenceMonth, setAutoSelectedReferenceMonth] =
    useState(false);
  const [filterDoctor, setFilterDoctor] = useState<string>("all");
  const [filterShift, setFilterShift] = useState<string>("all");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");
  const [editModal, setEditModal] = useState<{
    open: boolean;
    date: string;
    shiftType: string;
  } | null>(null);
  const [addModal, setAddModal] = useState<{
    open: boolean;
    date: string;
  } | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [focusedConflictKey, setFocusedConflictKey] = useState<string | null>(
    null
  );
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importPreview, setImportPreview] =
    useState<ScheduleWorkbookPreview | null>(null);
  const [isReadingImportFile, setIsReadingImportFile] = useState(false);
  const [swapModal, setSwapModal] = useState<{
    entryId: number;
    scheduleId: number;
    currentDoctorId: number;
    currentDoctorName: string;
  } | null>(null);
  const [swapTargetDoctorId, setSwapTargetDoctorId] = useState<string>("none");
  const [swapReason, setSwapReason] = useState("");
  const [approvalDoctorByRequestId, setApprovalDoctorByRequestId] = useState<
    Record<number, string>
  >({});

  const scheduleQuery = trpc.schedules.getByMonth.useQuery({ year, month });
  const swapRequestsQuery = trpc.swapRequests.listForSchedule.useQuery(
    { scheduleId: scheduleQuery.data?.id ?? 0 },
    { enabled: !!scheduleQuery.data?.id }
  );
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
  const validationQuery = trpc.schedules.validate.useQuery(
    { scheduleId: scheduleQuery.data?.id ?? 0 },
    { enabled: !!scheduleQuery.data?.id }
  );

  const generateMutation = trpc.schedules.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Escala gerada! Score: ${data.balanceScore}/100`);
      scheduleQuery.refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const importWorkbookMutation = trpc.schedules.importWorkbook.useMutation({
    onSuccess: data => {
      setImportModalOpen(false);
      setImportFileName("");
      setImportPreview(null);
      setYear(data.year);
      setMonth(data.month);
      doctorsQuery.refetch();
      scheduleQuery.refetch();

      if (data.createdDoctors > 0) {
        toast.success(
          `${data.importedEntries} plantoes importados e ${data.createdDoctors} medico(s) criado(s).`
        );
        return;
      }

      toast.success(`${data.importedEntries} plantoes importados com sucesso.`);
    },
    onError: err => toast.error(`Erro: ${err.message}`),
  });

  const addEntryMutation = trpc.schedules.addEntry.useMutation({
    onSuccess: (data) => {
      if (data.conflicts.length > 0) {
        toast.warning(
          `Plantao adicionado com alertas: ${data.conflicts[0].message}`
        );
      } else {
        toast.success("Plantao adicionado com sucesso");
      }
      setAddModal(null);
      scheduleQuery.refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const removeEntryMutation = trpc.schedules.removeEntry.useMutation({
    onSuccess: () => {
      toast.success("Plantao removido");
      setEditModal(null);
      scheduleQuery.refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const createSwapRequestMutation = trpc.swapRequests.create.useMutation({
    onSuccess: async () => {
      toast.success("Solicitacao de troca criada");
      setSwapModal(null);
      setSwapTargetDoctorId("none");
      setSwapReason("");
      await swapRequestsQuery.refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const approveSwapRequestMutation = trpc.swapRequests.approve.useMutation({
    onSuccess: async () => {
      toast.success("Troca aprovada");
      await Promise.all([scheduleQuery.refetch(), swapRequestsQuery.refetch()]);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const rejectSwapRequestMutation = trpc.swapRequests.reject.useMutation({
    onSuccess: async () => {
      toast.success("Solicitacao rejeitada");
      await swapRequestsQuery.refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const days = useMemo(() => getDaysInMonth(year, month), [month, year]);
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const doctorMap = useMemo(
    () =>
      new Map((doctorsQuery.data ?? []).map((doctor) => [doctor.id, doctor])),
    [doctorsQuery.data]
  );
  
  const specialties = useMemo(() => {
    const set = new Set<string>();
    doctorsQuery.data?.forEach(d => {
      if (d.specialty) set.add(d.specialty);
    });
    return Array.from(set).sort();
  }, [doctorsQuery.data]);

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

  const entryMap = useMemo(() => {
    const map = new Map<
      string,
      Map<
        string,
        Array<{
          conflictWarning?: string | null;
          id: number;
          doctorId: number;
          doctorName: string;
          doctorColor: string;
          isFixed: boolean;
          confirmationStatus: string;
        }>
      >
    >();

    if (!scheduleQuery.data?.entries || !doctorsQuery.data) return map;

    for (const entry of scheduleQuery.data.entries) {
      const publicShiftType = getProductShiftKey(entry.shiftType);
      if (!publicShiftType) continue;

      const dateStr =
        typeof entry.entryDate === "string"
          ? entry.entryDate
          : new Date(entry.entryDate as unknown as Date)
              .toISOString()
              .split("T")[0];

      const doctor = doctorMap.get(entry.doctorId);
      
      // Filters
      if (filterDoctor !== "all" && entry.doctorId !== Number.parseInt(filterDoctor)) continue;
      if (filterShift !== "all" && publicShiftType !== filterShift) continue;
      if (filterSpecialty !== "all" && doctor?.specialty !== filterSpecialty) continue;

      if (!map.has(dateStr)) map.set(dateStr, new Map());
      const dayMap = map.get(dateStr)!;
      if (!dayMap.has(publicShiftType)) dayMap.set(publicShiftType, []);

      dayMap.get(publicShiftType)!.push({
        id: entry.id,
        doctorId: entry.doctorId,
        doctorName:
          doctor?.shortName ?? `${professionalSingular} ${entry.doctorId}`,
        doctorColor: doctor?.cor ?? "#3B82F6",
        isFixed: entry.isFixed,
        conflictWarning: entry.conflictWarning,
        confirmationStatus: (entry as any).confirmationStatus ?? "pending",
      });
    }

    return map;
  }, [
    doctorMap,
    doctorsQuery.data,
    filterDoctor,
    filterShift,
    filterSpecialty,
    professionalSingular,
    scheduleQuery.data?.entries,
  ]);

  const conflictDates = useMemo(() => {
    const set = new Set<string>();
    validationQuery.data?.conflicts?.forEach((conflict) => set.add(conflict.date));
    return set;
  }, [validationQuery.data]);

  const isManager =
    user?.role === "admin" || user?.role === "coordinator" || user?.role === "staff";

  type SwapRequestItem = NonNullable<typeof swapRequestsQuery.data>[number];

  const swapRequestsByEntryId = useMemo(() => {
    const map = new Map<number, SwapRequestItem[]>();
    (swapRequestsQuery.data ?? []).forEach((request) => {
      if (!map.has(request.scheduleEntryId)) {
        map.set(request.scheduleEntryId, []);
      }
      map.get(request.scheduleEntryId)!.push(request);
    });
    return map;
  }, [swapRequestsQuery.data]);

  const conflictsByDateShift = useMemo(() => {
    const map = new Map<string, NonNullable<typeof validationQuery.data>["conflicts"]>();
    validationQuery.data?.conflicts?.forEach((conflict) => {
      const publicShiftType = getProductShiftKey(conflict.shiftType);
      if (!publicShiftType) return;
      const key = `${conflict.date}|${publicShiftType}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(conflict);
    });
    return map;
  }, [validationQuery.data]);

  const sortedConflicts = useMemo(() => {
    if (!validationQuery.data?.conflicts) return [];

    return [...validationQuery.data.conflicts].sort((left, right) => {
      const dateCompare = left.date.localeCompare(right.date);
      if (dateCompare !== 0) return dateCompare;

      const leftShiftKey = getProductShiftKey(left.shiftType);
      const rightShiftKey = getProductShiftKey(right.shiftType);
      const leftShiftIndex = shiftOptions.findIndex(
        (shift) => shift.key === leftShiftKey
      );
      const rightShiftIndex = shiftOptions.findIndex(
        (shift) => shift.key === rightShiftKey
      );

      if (leftShiftIndex !== rightShiftIndex) {
        return leftShiftIndex - rightShiftIndex;
      }

      return left.message.localeCompare(right.message);
    });
  }, [shiftOptions, validationQuery.data]);

  const editModalConflicts = useMemo(() => {
    if (!editModal) return [];
    return (
      conflictsByDateShift.get(`${editModal.date}|${editModal.shiftType}`) ?? []
    );
  }, [conflictsByDateShift, editModal]);

  const editModalEntries = useMemo(() => {
    if (!editModal) return [];
    return entryMap.get(editModal.date)?.get(editModal.shiftType) ?? [];
  }, [editModal, entryMap]);

  function focusConflict(date: string, shiftType: string) {
    const key = `${date}|${shiftType}`;
    setFocusedConflictKey(key);
    document
      .getElementById(`calendar-day-${date}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function describeConflictDoctor(doctorId: number) {
    if (!doctorId) {
      return `Sem ${professionalSingular.toLowerCase()} escalado`;
    }
    return doctorMap.get(doctorId)?.name ?? `${professionalSingular} ${doctorId}`;
  }

  function prevMonth() {
    if (month === 1) {
      setYear((current) => current - 1);
      setMonth(12);
      return;
    }
    setMonth((current) => current - 1);
  }

  function nextMonth() {
    if (month === 12) {
      setYear((current) => current + 1);
      setMonth(1);
      return;
    }
    setMonth((current) => current + 1);
  }

  function openImportModal() {
    setImportModalOpen(true);
    setImportFileName("");
    setImportPreview(null);
  }

  async function handleImportFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsReadingImportFile(true);
    setImportFileName(file.name);

    try {
      const parsed = await parseScheduleWorkbookFile(file);
      setImportPreview(parsed);

      if (parsed.rows.length === 0) {
        toast.error("Nenhum plantao valido encontrado na planilha.");
      } else if (parsed.errors.length > 0) {
        toast.warning(
          `${parsed.rows.length} lancamento(s) reconhecido(s) e ${parsed.errors.length} aviso(s) na leitura.`
        );
      } else {
        toast.success(
          `${parsed.rows.length} lancamento(s) prontos para importar em ${parsed.monthLabel}/${parsed.year}.`
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel ler a planilha. Use XLSX ou XLS."
      );
      setImportPreview(null);
    } finally {
      setIsReadingImportFile(false);
      event.target.value = "";
    }
  }

  function handleImportWorkbookSubmit() {
    if (!importPreview || importPreview.rows.length === 0) {
      toast.error("Selecione uma planilha com pelo menos um lancamento valido.");
      return;
    }

    importWorkbookMutation.mutate({
      entries: importPreview.rows,
      month: importPreview.month,
      year: importPreview.year,
    });
  }

  function handleAddEntry() {
    if (!selectedDoctorId || !selectedShift || !addModal) {
      toast.error("Selecione o profissional e o turno");
      return;
    }
    if (!scheduleQuery.data?.id) return;

    addEntryMutation.mutate({
      scheduleId: scheduleQuery.data.id,
      doctorId: Number.parseInt(selectedDoctorId),
      entryDate: addModal.date,
      shiftType: toLegacyStandardShiftType(selectedShift),
      notes,
    });
  }

  function openSwapRequestModal(entry: {
    id: number;
    doctorId: number;
    doctorName: string;
  }) {
    if (!scheduleQuery.data?.id) return;

    setSwapModal({
      entryId: entry.id,
      scheduleId: scheduleQuery.data.id,
      currentDoctorId: entry.doctorId,
      currentDoctorName: entry.doctorName,
    });
    setSwapTargetDoctorId("none");
    setSwapReason("");
  }

  function handleCreateSwapRequest() {
    if (!swapModal) return;

    const trimmedReason = swapReason.trim();
    if (trimmedReason.length < 3) {
      toast.error("Descreva o motivo da troca com pelo menos 3 caracteres.");
      return;
    }

    createSwapRequestMutation.mutate({
      scheduleId: swapModal.scheduleId,
      entryId: swapModal.entryId,
      requesterDoctorId: swapModal.currentDoctorId,
      targetDoctorId:
        swapTargetDoctorId === "none"
          ? null
          : Number.parseInt(swapTargetDoctorId),
      requestType: swapTargetDoctorId === "none" ? "open_cover" : "direct_swap",
      reason: trimmedReason,
    });
  }

  function handleApproveSwapRequest(request: {
    id: number;
    targetDoctorId: number | null;
  }) {
    const chosenDoctorId =
      request.targetDoctorId ??
      (approvalDoctorByRequestId[request.id]
        ? Number.parseInt(approvalDoctorByRequestId[request.id]!)
        : null);

    if (!chosenDoctorId) {
      toast.error("Escolha o médico substituto para aprovar a troca.");
      return;
    }

    approveSwapRequestMutation.mutate({
      requestId: request.id,
      targetDoctorId: chosenDoctorId,
    });
  }

  function handleExportPdf() {
    if (!scheduleQuery.data?.entries?.length) {
      toast.error("Nenhuma escala para exportar");
      return;
    }

    const opened = exportScheduleCalendarAsPdf({
      activeProfileName,
      balanceScore: scheduleQuery.data.balanceScore,
      doctors: doctorsQuery.data ?? [],
      entries: scheduleQuery.data.entries,
      month,
      professionalPlural: "Medicos",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex bg-card p-1 rounded-xl border border-border/60 shadow-sm">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center px-4 font-bold text-sm min-w-[140px] justify-center text-foreground">
              {MONTH_NAMES[month - 1]} {year}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight hidden md:block">Calendário Escala</h1>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <div className="flex items-center bg-card p-1 rounded-xl border border-border/60 shadow-sm gap-1">
            <Select value={filterDoctor} onValueChange={setFilterDoctor}>
              <SelectTrigger className="h-8 w-40 border-0 bg-transparent text-[11px] font-bold uppercase tracking-tight focus:ring-0">
                <SelectValue placeholder="Profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos {professionalPluralLower}</SelectItem>
                {doctorsQuery.data?.map((doctor) => (
                  <SelectItem key={doctor.id} value={String(doctor.id)}>
                    {doctor.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="h-4 w-px bg-border/40 mx-1" />
            <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
              <SelectTrigger className="h-8 w-36 border-0 bg-transparent text-[11px] font-bold uppercase tracking-tight focus:ring-0">
                <SelectValue placeholder="Especialidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Especialidades</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => user?.isPaid ? handleExportPdf() : setLocation(appPath("/upgrade"))} 
              className="glass shadow-sm h-10 px-4"
            >
              <FileDown className="mr-2 h-4 w-4" />
              PDF
              {!user?.isPaid && <Lock className="ml-2 h-3 w-3 opacity-60" />}
            </Button>
            <Button variant="outline" size="sm" onClick={openImportModal} className="glass shadow-sm h-10 px-4">
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Button
              size="sm"
              onClick={() => user?.isPaid ? generateMutation.mutate({ year, month }) : setLocation(appPath("/upgrade"))}
              disabled={generateMutation.isPending}
              className={cn(
                "shadow-sm h-10 px-4",
                user?.isPaid 
                  ? "bg-primary hover:bg-primary/90 text-white" 
                  : "bg-amber-500 hover:bg-amber-600 text-white"
              )}
            >
              {user?.isPaid ? (
                <Zap className="mr-2 h-4 w-4 fill-current" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {generateMutation.isPending ? "Gerando..." : "Gerar Escala"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {shiftOptions.map((shift) => (
          <div
            key={shift.key}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all",
              shift.colorClass
            )}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {shift.label}
          </div>
        ))}
        {validationQuery.data && validationQuery.data.conflicts.length > 0 && (
          <Badge variant="destructive" className="rounded-full px-3 py-1 flex gap-1.5 text-[10px] font-bold uppercase tracking-wider">
            <AlertTriangle className="h-3 w-3" />
            {validationQuery.data.conflicts.length} conflitos
          </Badge>
        )}
      </div>

      {validationQuery.data && validationQuery.data.conflicts.length > 0 && (
        <Card className="border-rose-200/60 bg-rose-50/10 backdrop-blur-sm overflow-hidden dark:border-rose-900/40">
          <CardHeader className="pb-3 border-b border-rose-200/40 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              Alertas Operacionais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-52 overflow-y-auto custom-scrollbar">
              <div className="grid gap-px bg-rose-200/40 dark:bg-rose-900/20">
                {sortedConflicts.map((conflict, index) => {
                  const conflictShiftKey = getProductShiftKey(conflict.shiftType);
                  const isFocused = focusedConflictKey === `${conflict.date}|${conflictShiftKey}`;

                  return (
                    <button
                      key={index}
                      onClick={() => focusConflict(conflict.date, conflictShiftKey ?? conflict.shiftType)}
                      className={cn(
                        "flex items-center gap-4 px-6 py-3 text-left transition-all hover:bg-rose-100/50 bg-white dark:bg-slate-900/40",
                        isFocused && "bg-rose-50 dark:bg-rose-900/30 ring-inset ring-2 ring-rose-500/30"
                      )}
                    >
                      <Badge variant="outline" className="h-7 border-rose-200 text-[10px] font-bold tabular-nums">
                        {conflict.date.split('-').reverse().slice(0, 2).join('/')}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-rose-900 dark:text-rose-100 truncate">
                          {conflict.message}
                        </p>
                        <p className="text-[10px] font-medium text-rose-700/70 dark:text-rose-400/70">
                          {describeConflictDoctor(conflict.doctorId)} • {CONFLICT_TYPE_LABELS[conflict.type]}
                        </p>
                      </div>
                      <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[9px] dark:bg-rose-950 dark:text-rose-400">
                        Corrigir
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-border/60 shadow-xl bg-card/60 backdrop-blur-md">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 gap-px bg-border/40 border-b border-border/40">
            {DAY_NAMES.map((dayName) => (
              <div
                key={dayName}
                className={cn(
                  "py-4 text-center text-[10px] font-extrabold uppercase tracking-[0.2em]",
                  (dayName === "Dom" || dayName === "Sab") ? "text-primary/70" : "text-muted-foreground"
                )}
              >
                {dayName}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-border/40">
            {Array.from({ length: firstDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[140px] bg-slate-50/30 dark:bg-slate-900/10" />
            ))}

            {days.map((day) => {
              const dateStr = toDateStr(day);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isToday = dateStr === toDateStr(new Date());
              const hasConflict = conflictDates.has(dateStr);
              const dayEntries = entryMap.get(dateStr);

              return (
                <div
                  key={dateStr}
                  id={`calendar-day-${dateStr}`}
                  className={cn(
                    "min-h-[140px] p-2 transition-all flex flex-col gap-1.5 group hover:bg-slate-50/50 dark:hover:bg-slate-900/20 bg-white dark:bg-slate-900/60",
                    isToday && "ring-2 ring-primary ring-inset z-10",
                    focusedConflictKey?.startsWith(`${dateStr}|`) && "ring-2 ring-rose-500 ring-inset z-10",
                    isWeekend && "bg-slate-50/40 dark:bg-slate-900/40"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg transition-all",
                        isToday ? "bg-primary text-white shadow-md shadow-primary/20 scale-110" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {day.getDate()}
                    </span>
                    <button
                      onClick={() => setAddModal({ open: true, date: dateStr })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded-md"
                    >
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-1.5 min-h-0 overflow-visible">
                    {shiftOptions.map((shift) => {
                      const shiftEntries = dayEntries?.get(shift.key) ?? [];
                      const shiftConflicts = conflictsByDateShift.get(`${dateStr}|${shift.key}`) ?? [];
                      const hasShiftConflict = shiftConflicts.length > 0 || shiftEntries.some((entry) => entry.conflictWarning);
                      
                      if (shiftEntries.length === 0 && shiftConflicts.length === 0) return null;

                      return (
                        <div
                          key={shift.key}
                          onClick={() => setEditModal({ open: true, date: dateStr, shiftType: shift.key })}
                          className={cn(
                            "relative pl-2 pr-1 py-1 rounded-md border flex flex-col gap-0.5 cursor-pointer transition-all hover:translate-x-0.5 shadow-sm",
                            shift.colorClass,
                            hasShiftConflict ? "border-rose-400 dark:border-rose-800 ring-1 ring-rose-300 ring-offset-0" : "border-transparent"
                          )}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-60">
                              {shift.short}
                            </span>
                            {hasShiftConflict && <AlertTriangle className="h-2 w-2 text-rose-600" />}
                          </div>
                          
                          {shiftEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between gap-1 overflow-hidden"
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.doctorColor }} />
                                <span className="text-[9px] font-bold truncate leading-tight">{entry.doctorName}</span>
                              </div>
                              {entry.confirmationStatus === 'confirmed' && (
                                <CheckCircle2 className="h-2 w-2 text-teal-600 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Modals remain mostly the same but with minor aesthetic updates to match Teal/Slate */}
      <Dialog open={!!addModal} onOpenChange={(open) => !open && setAddModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Plantão</DialogTitle>
            <p className="text-xs text-muted-foreground">{addModal && formatDisplayDate(addModal.date)}</p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {doctorsQuery.data?.map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name} {d.specialty ? `(${d.specialty})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Turno</Label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o turno" />
                </SelectTrigger>
                <SelectContent>
                  {shiftOptions.map(option => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea 
                placeholder="Opcional..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(null)}>Cancelar</Button>
            <Button 
              onClick={handleAddEntry}
              disabled={addEntryMutation.isPending}
            >
              {addEntryMutation.isPending ? "Salvando..." : "Salvar Plantão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editModal} onOpenChange={(open) => !open && setEditModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Gerenciar Turno
              {editModal && (
                <Badge className={cn("ml-2", shiftOptions.find(s => s.key === editModal.shiftType)?.colorClass)}>
                  {shiftOptions.find(s => s.key === editModal.shiftType)?.label}
                </Badge>
              )}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{editModal && formatDisplayDate(editModal.date)}</p>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {editModalEntries.length > 0 ? (
              <div className="space-y-3">
                {editModalEntries.map(entry => (
                  <div key={entry.id} className="space-y-3 rounded-xl border bg-slate-50 p-3 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm dark:bg-slate-800 border">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{entry.doctorName}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] h-4 py-0">{(doctorMap.get(entry.doctorId) as any)?.specialty || 'Especialista'}</Badge>
                            {entry.isFixed && <Badge className="bg-blue-100 text-blue-700 text-[9px] h-4 py-0">Fixo</Badge>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSwapRequestModal(entry)}
                          className="gap-2"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          Solicitar troca
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={removeEntryMutation.isPending}
                          onClick={() => removeEntryMutation.mutate({ entryId: entry.id, scheduleId: scheduleQuery.data!.id })}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>

                    {(swapRequestsByEntryId.get(entry.id) ?? []).length > 0 && (
                      <div className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Solicitações de troca
                        </p>
                        {(swapRequestsByEntryId.get(entry.id) ?? []).map((request) => {
                          const targetDoctorName = request.targetDoctorId
                            ? doctorMap.get(request.targetDoctorId)?.name ??
                              `Médico ${request.targetDoctorId}`
                            : "Cobertura em aberto";
                          const currentDoctorName =
                            doctorMap.get(request.currentDoctorId)?.name ??
                            entry.doctorName;
                          const canApprove =
                            request.status === "pending" &&
                            isManager &&
                            !!(
                              request.targetDoctorId ||
                              approvalDoctorByRequestId[request.id]
                            );

                          return (
                            <div
                              key={request.id}
                              className="space-y-2 rounded-lg border border-border/50 bg-card p-3"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="text-[9px] uppercase">
                                  {request.requestType === "direct_swap"
                                    ? "Troca direta"
                                    : "Cobertura aberta"}
                                </Badge>
                                <Badge
                                  className={cn(
                                    "text-[9px] uppercase",
                                    request.status === "approved" &&
                                      "bg-emerald-100 text-emerald-700",
                                    request.status === "rejected" &&
                                      "bg-rose-100 text-rose-700",
                                    request.status === "pending" &&
                                      "bg-amber-100 text-amber-700",
                                    request.status === "cancelled" &&
                                      "bg-slate-200 text-slate-700"
                                  )}
                                >
                                  {request.status === "pending" && "Pendente"}
                                  {request.status === "approved" && "Aprovada"}
                                  {request.status === "rejected" && "Rejeitada"}
                                  {request.status === "cancelled" && "Cancelada"}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>
                                  <span className="font-semibold text-foreground">Origem:</span>{" "}
                                  {currentDoctorName}
                                </p>
                                <p>
                                  <span className="font-semibold text-foreground">Destino:</span>{" "}
                                  {targetDoctorName}
                                </p>
                                <p>
                                  <span className="font-semibold text-foreground">Motivo:</span>{" "}
                                  {request.reason}
                                </p>
                              </div>

                              {isManager &&
                                request.status === "pending" &&
                                !request.targetDoctorId && (
                                  <div className="space-y-2">
                                    <Label className="text-[11px]">
                                      Definir substituto para aprovar
                                    </Label>
                                    <Select
                                      value={
                                        approvalDoctorByRequestId[request.id] ?? "none"
                                      }
                                      onValueChange={(value) =>
                                        setApprovalDoctorByRequestId((current) => ({
                                          ...current,
                                          [request.id]: value,
                                        }))
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Escolha o médico substituto" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">
                                          Selecione um médico
                                        </SelectItem>
                                        {doctorsQuery.data
                                          ?.filter(
                                            (doctor) =>
                                              doctor.id !== request.currentDoctorId
                                          )
                                          .map((doctor) => (
                                            <SelectItem
                                              key={doctor.id}
                                              value={String(doctor.id)}
                                            >
                                              {doctor.name}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                              {isManager && request.status === "pending" && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    disabled={
                                      approveSwapRequestMutation.isPending ||
                                      !canApprove
                                    }
                                    onClick={() =>
                                      handleApproveSwapRequest({
                                        id: request.id,
                                        targetDoctorId: request.targetDoctorId,
                                      })
                                    }
                                  >
                                    Aprovar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={rejectSwapRequestMutation.isPending}
                                    onClick={() =>
                                      rejectSwapRequestMutation.mutate({
                                        requestId: request.id,
                                      })
                                    }
                                  >
                                    Rejeitar
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-sm text-muted-foreground">Nenhum plantão escalado.</p>
            )}
            
            {editModalConflicts.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl border border-rose-200 bg-rose-50/30">
                <p className="text-xs font-bold text-rose-800 uppercase tracking-widest">Alertas de Conflito</p>
                {editModalConflicts.map((c, i) => (
                  <p key={i} className="text-xs text-rose-700 flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                    {c.message}
                  </p>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)} className="w-full">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!swapModal}
        onOpenChange={(open) => {
          if (!open) {
            setSwapModal(null);
            setSwapTargetDoctorId("none");
            setSwapReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-teal-600" />
              Solicitar troca de plantão
            </DialogTitle>
            {swapModal && (
              <p className="text-xs text-muted-foreground">
                Plantão atualmente com {swapModal.currentDoctorName}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Médico substituto</Label>
              <Select
                value={swapTargetDoctorId}
                onValueChange={setSwapTargetDoctorId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um médico ou deixe em aberto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Deixar cobertura em aberto</SelectItem>
                  {doctorsQuery.data
                    ?.filter(
                      (doctor) => doctor.id !== swapModal?.currentDoctorId
                    )
                    .map((doctor) => (
                      <SelectItem key={doctor.id} value={String(doctor.id)}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Se você deixar em aberto, o pedido fica pendente até o coordenador
                definir quem assume o plantão.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Motivo da troca</Label>
              <Textarea
                value={swapReason}
                onChange={(event) => setSwapReason(event.target.value)}
                placeholder="Ex.: congresso, consulta, indisponibilidade pontual..."
                className="resize-none h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSwapModal(null);
                setSwapTargetDoctorId("none");
                setSwapReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSwapRequest}
              disabled={createSwapRequestMutation.isPending}
            >
              {createSwapRequestMutation.isPending
                ? "Enviando..."
                : "Enviar solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-teal-600" />
              Importar Planilha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="rounded-2xl border-2 border-dashed border-border/60 bg-slate-50/50 p-8 text-center transition-all hover:bg-slate-50 dark:bg-slate-900/20">
              <input
                type="file"
                id="import-file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleImportFileChange}
                disabled={isReadingImportFile}
              />
              <label
                htmlFor="import-file"
                className="flex cursor-pointer flex-col items-center gap-3"
              >
                <div className="rounded-full bg-teal-100 p-3 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold">
                    {importFileName || "Clique para selecionar a planilha"}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    Suporta arquivos Excel (.xlsx, .xls)
                  </p>
                </div>
              </label>
            </div>

            {importPreview && (
              <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prévia da Importação</p>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {importPreview.monthLabel}/{importPreview.year}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lançamentos</p>
                    <p className="text-lg font-bold">{importPreview.rows.length}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Erros/Avisos</p>
                    <p className={cn("text-lg font-bold", importPreview.errors.length > 0 ? "text-rose-600" : "text-teal-600")}>
                      {importPreview.errors.length}
                    </p>
                  </div>
                </div>
                {importPreview.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-xl bg-orange-50 p-3 dark:bg-orange-950/20">
                    {importPreview.errors.map((err, idx) => (
                      <p
                        key={idx}
                        className="text-[10px] text-orange-800 dark:text-orange-300"
                      >
                        linha {err.rowNumber}: {err.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleImportWorkbookSubmit}
              disabled={!importPreview || importPreview.rows.length === 0 || importWorkbookMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {importWorkbookMutation.isPending ? "Importando..." : "Confirmar Importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
