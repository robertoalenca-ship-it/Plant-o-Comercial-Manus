import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProfilePresentation } from "@/lib/profilePresentation";
import {
  getProductShiftKey,
  getProductShiftLabel,
  toLegacyStandardShiftType,
} from "@/lib/productShifts";
import { exportScheduleCalendarAsPdf } from "@/lib/schedulePdf";
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
  Plus,
  CheckCircle2,
  FileDown,
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
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [autoSelectedReferenceMonth, setAutoSelectedReferenceMonth] =
    useState(false);
  const [filterDoctor, setFilterDoctor] = useState<string>("all");
  const [filterShift, setFilterShift] = useState<string>("all");
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

  const days = useMemo(() => getDaysInMonth(year, month), [month, year]);
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const doctorMap = useMemo(
    () =>
      new Map((doctorsQuery.data ?? []).map((doctor) => [doctor.id, doctor])),
    [doctorsQuery.data]
  );

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

      if (!map.has(dateStr)) map.set(dateStr, new Map());
      const dayMap = map.get(dateStr)!;
      if (!dayMap.has(publicShiftType)) dayMap.set(publicShiftType, []);

      const doctor = doctorMap.get(entry.doctorId);
      if (filterDoctor !== "all" && entry.doctorId !== Number.parseInt(filterDoctor)) {
        continue;
      }
      if (filterShift !== "all" && publicShiftType !== filterShift) continue;

      dayMap.get(publicShiftType)!.push({
        id: entry.id,
        doctorId: entry.doctorId,
        doctorName:
          doctor?.shortName ?? `${professionalSingular} ${entry.doctorId}`,
        doctorColor: doctor?.cor ?? "#3B82F6",
        isFixed: entry.isFixed,
        conflictWarning: entry.conflictWarning,
      });
    }

    return map;
  }, [
    doctorMap,
    doctorsQuery.data,
    filterDoctor,
    filterShift,
    professionalSingular,
    scheduleQuery.data?.entries,
  ]);

  const conflictDates = useMemo(() => {
    const set = new Set<string>();
    validationQuery.data?.conflicts?.forEach((conflict) => set.add(conflict.date));
    return set;
  }, [validationQuery.data]);

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

  function handleAddEntry() {
    if (
      !scheduleQuery.data?.id ||
      !selectedDoctorId ||
      !selectedShift ||
      !addModal
    ) {
      return;
    }

    addEntryMutation.mutate({
      scheduleId: scheduleQuery.data.id,
      doctorId: Number.parseInt(selectedDoctorId),
      entryDate: addModal.date,
      shiftType: toLegacyStandardShiftType(selectedShift),
      notes,
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="min-w-[180px] text-center text-xl font-bold">
            {MONTH_NAMES[month - 1]} {year}
          </h1>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={filterDoctor} onValueChange={setFilterDoctor}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue
                placeholder={`Filtrar ${professionalSingular.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{`Todos os ${professionalPluralLower}`}</SelectItem>
              {doctorsQuery.data?.map((doctor) => (
                <SelectItem key={doctor.id} value={String(doctor.id)}>
                  {doctor.shortName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterShift} onValueChange={setFilterShift}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Filtrar turno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os turnos</SelectItem>
              {shiftOptions.map((shift) => (
                <SelectItem key={shift.key} value={shift.key}>
                  {shift.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={!scheduleQuery.data?.entries?.length}
          >
            <FileDown className="mr-1 h-3 w-3" />
            Exportar Calendario
          </Button>

          <Button
            size="sm"
            onClick={() => generateMutation.mutate({ year, month })}
            disabled={generateMutation.isPending}
          >
            <Zap className="mr-1 h-3 w-3" />
            {generateMutation.isPending ? "Gerando..." : "Gerar Escala"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {shiftOptions.map((shift) => (
          <span
            key={shift.key}
            className={`rounded border px-2 py-0.5 text-xs ${shift.colorClass}`}
          >
            {shift.label}
          </span>
        ))}
        {validationQuery.data && (
          <span className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
            <AlertTriangle className="h-3 w-3" />
            {validationQuery.data.conflicts.length} conflito(s)
          </span>
        )}
      </div>

      {validationQuery.data && (
        <Card
          className={
            validationQuery.data.conflicts.length > 0
              ? "border-red-200"
              : "border-green-200"
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {validationQuery.data.conflicts.length > 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Conflitos Detectados
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Nenhum conflito encontrado
                </>
              )}
            </CardTitle>
          </CardHeader>
          {validationQuery.data.conflicts.length > 0 && (
            <CardContent className="pt-0">
              <div className="max-h-60 overflow-y-auto pr-3">
                <div className="space-y-2">
                  {sortedConflicts.map((conflict, index) => {
                    const conflictShiftKey = getProductShiftKey(conflict.shiftType);
                    const shift = shiftOptions.find(
                      (item) => item.key === conflictShiftKey
                    );
                    const isFocused =
                      focusedConflictKey === `${conflict.date}|${conflictShiftKey}`;

                    return (
                      <button
                        key={`${conflict.date}-${conflict.shiftType}-${conflict.doctorId}-${index}`}
                        type="button"
                        onClick={() =>
                          focusConflict(
                            conflict.date,
                            conflictShiftKey ?? conflict.shiftType
                          )
                        }
                        className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/60 ${
                          isFocused
                            ? "border-red-400 bg-red-50"
                            : "border-red-200 bg-red-50/60"
                        }`}
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-red-200 bg-white text-red-700"
                          >
                            {formatDisplayDate(conflict.date)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-red-200 bg-white text-red-700"
                          >
                            {shift?.label ?? getProductShiftLabel(conflict.shiftType)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-red-200 bg-white text-red-700"
                          >
                            {CONFLICT_TYPE_LABELS[conflict.type] ?? conflict.type}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-red-900">
                          {conflict.message}
                        </p>
                        <p className="mt-1 text-xs text-red-700">
                          {describeConflictDoctor(conflict.doctorId)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardContent className="p-3">
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DAY_NAMES.map((dayName) => (
              <div
                key={dayName}
                className={`py-1 text-center text-xs font-semibold ${
                  dayName === "Dom" || dayName === "Sab"
                    ? "text-orange-600"
                    : "text-muted-foreground"
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[100px]" />
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
                  className={`min-h-[100px] rounded-lg border p-1 text-xs transition-colors ${
                    hasConflict
                      ? "border-red-300 bg-red-50/80"
                      : isWeekend
                        ? "border-orange-100 bg-orange-50/50"
                        : "border-gray-100 bg-white"
                  } ${isToday ? "ring-2 ring-primary ring-offset-1" : ""} ${
                    focusedConflictKey?.startsWith(`${dateStr}|`)
                      ? "ring-2 ring-red-400 ring-offset-1"
                      : ""
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : isWeekend
                            ? "text-orange-700"
                            : "text-foreground"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <div className="flex gap-0.5">
                      {hasConflict && (
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      )}
                      <button
                        onClick={() => {
                          setAddModal({ open: true, date: dateStr });
                          setSelectedDoctorId("");
                          setSelectedShift("");
                          setNotes("");
                        }}
                        className="text-muted-foreground transition-colors hover:text-primary"
                        title="Adicionar plantao"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    {shiftOptions.map((shift) => {
                      const shiftEntries = dayEntries?.get(shift.key) ?? [];
                      const shiftConflicts =
                        conflictsByDateShift.get(`${dateStr}|${shift.key}`) ?? [];
                      const hasShiftConflict =
                        shiftConflicts.length > 0 ||
                        shiftEntries.some((entry) => entry.conflictWarning);
                      const isFocusedConflict =
                        focusedConflictKey === `${dateStr}|${shift.key}`;

                      if (
                        shiftEntries.length === 0 &&
                        shiftConflicts.length === 0
                      ) {
                        return null;
                      }

                      return (
                        <div
                          key={shift.key}
                          className={`cursor-pointer rounded border px-1 py-0.5 hover:opacity-80 ${shift.colorClass} ${
                            hasShiftConflict ? "border-red-400 ring-1 ring-red-300" : ""
                          } ${isFocusedConflict ? "ring-2 ring-red-500" : ""}`}
                          title={shiftConflicts
                            .map((conflict) => conflict.message)
                            .join(" | ")}
                          onClick={() =>
                            setEditModal({
                              open: true,
                              date: dateStr,
                              shiftType: shift.key,
                            })
                          }
                        >
                          <div className="mb-0.5 flex items-center justify-between gap-1">
                            <div className="text-[9px] font-medium leading-none">
                              {shift.short}
                            </div>
                            {hasShiftConflict && (
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-red-600">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {shiftConflicts.length ||
                                  shiftEntries.filter(
                                    (entry) => entry.conflictWarning
                                  ).length}
                              </span>
                            )}
                          </div>

                          {shiftEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center gap-0.5 leading-none"
                              style={{ fontSize: "9px" }}
                            >
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: entry.doctorColor }}
                              />
                              <span className="truncate">{entry.doctorName}</span>
                              {entry.conflictWarning && (
                                <AlertTriangle className="h-2 w-2 shrink-0 text-red-500" />
                              )}
                            </div>
                          ))}

                          {shiftEntries.length === 0 && (
                            <div
                              className="font-medium leading-none text-red-700"
                              style={{ fontSize: "9px" }}
                            >
                              Sem cobertura
                            </div>
                          )}
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

      {addModal?.open && (
        <Dialog open onOpenChange={() => setAddModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Plantao - {addModal.date}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{professionalSingular}</Label>
                <Select
                  value={selectedDoctorId}
                  onValueChange={setSelectedDoctorId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={`Selecionar ${professionalSingular.toLowerCase()}`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {doctorsQuery.data?.map((doctor) => (
                      <SelectItem key={doctor.id} value={String(doctor.id)}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Turno</Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar turno" />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftOptions.map((shift) => (
                      <SelectItem key={shift.key} value={shift.key}>
                        {shift.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observacoes (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddModal(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAddEntry}
                disabled={
                  !selectedDoctorId ||
                  !selectedShift ||
                  addEntryMutation.isPending
                }
              >
                {addEntryMutation.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {editModal?.open && (
        <Dialog open onOpenChange={() => setEditModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Plantao - {editModal.date}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Turno:{" "}
                <strong>
                  {shiftOptions.find((shift) => shift.key === editModal.shiftType)
                    ?.label}
                </strong>
              </p>

              {editModalConflicts.length > 0 && (
                <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    Conflitos neste turno
                  </div>
                  {editModalConflicts.map((conflict, index) => (
                    <p
                      key={`${conflict.date}-${conflict.shiftType}-${index}`}
                      className="text-sm text-red-700"
                    >
                      {conflict.message}
                    </p>
                  ))}
                </div>
              )}

              {editModalEntries.length > 0 ? (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">Lancamentos neste turno</p>
                  <div className="space-y-2">
                    {editModalEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg border bg-muted/40 p-2"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.doctorColor }}
                          />
                          <span>{entry.doctorName}</span>
                        </div>
                        {scheduleQuery.data?.id && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const scheduleId = scheduleQuery.data?.id;
                              if (!scheduleId) return;
                              removeEntryMutation.mutate({
                                entryId: entry.id,
                                scheduleId,
                              });
                            }}
                            disabled={removeEntryMutation.isPending}
                          >
                            Remover
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModal(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {scheduleQuery.isLoading && (
        <div className="py-8 text-center text-muted-foreground">
          Carregando escala...
        </div>
      )}

      {!scheduleQuery.isLoading && !scheduleQuery.data && (
        <div className="py-8 text-center text-muted-foreground">
          <p>Nenhuma escala gerada para este mes.</p>
          <Button
            className="mt-3"
            onClick={() => generateMutation.mutate({ year, month })}
          >
            <Zap className="mr-2 h-4 w-4" />
            Gerar Escala
          </Button>
        </div>
      )}
    </div>
  );
}
