import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProfilePresentation } from "@/lib/profilePresentation";
import { formatProfessionalOptionLabel } from "@/lib/professionalMetadata";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Calendar, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  block: "Bloqueio",
  force_shift: "Forcar turno",
  replace: "Substituicao",
  swap: "Troca",
};

const EXCEPTION_TYPE_COLORS: Record<string, string> = {
  block: "bg-red-100 text-red-800",
  force_shift: "bg-blue-100 text-blue-800",
  replace: "bg-yellow-100 text-yellow-800",
  swap: "bg-purple-100 text-purple-800",
};

const RECURRENCE_LABELS: Record<string, string> = {
  annual: "Anual",
  monthly: "Mensal",
  once: "Pontual",
  recurring: "Recorrente",
};

const MONTH_NAMES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export default function Exceptions() {
  const { professionalSingular } = useActiveProfilePresentation();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    doctorId: "",
    exceptionType: "block",
    recurrenceType: "once",
    specificDate: "",
    month: "",
    dayOfMonth: "",
    reason: "",
    shiftType: "",
    replaceDoctorId: "",
  });

  const exceptionsQuery = trpc.exceptions.list.useQuery();
  const doctorsQuery = trpc.doctors.list.useQuery();
  const currentDate = new Date();
  const unavailabilityQuery = trpc.unavailabilities.listForMonth.useQuery({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
  });
  const [unavailabilityForm, setUnavailabilityForm] = useState({
    doctorId: "",
    unavailableDate: "",
    reason: "",
  });

  const createMutation = trpc.exceptions.create.useMutation({
    onSuccess: () => {
      toast.success("Excecao criada!");
      setModalOpen(false);
      exceptionsQuery.refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteMutation = trpc.exceptions.delete.useMutation({
    onSuccess: () => {
      toast.success("Excecao removida!");
      exceptionsQuery.refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const createUnavailabilityMutation = trpc.unavailabilities.create.useMutation({
    onSuccess: () => {
      toast.success("Indisponibilidade registrada!");
      unavailabilityQuery.refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteUnavailabilityMutation = trpc.unavailabilities.delete.useMutation({
    onSuccess: () => {
      toast.success("Indisponibilidade removida!");
      unavailabilityQuery.refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const doctorMap = new Map(
    (doctorsQuery.data ?? []).map((doctor) => [doctor.id, doctor])
  );

  function handleSubmit() {
    if (!form.doctorId) {
      toast.error(`Selecione um ${professionalSingular.toLowerCase()}`);
      return;
    }

    createMutation.mutate({
      doctorId: Number.parseInt(form.doctorId),
      exceptionType: form.exceptionType as any,
      recurrenceType: form.recurrenceType as any,
      specificDate: form.specificDate || null,
      month: form.month ? Number.parseInt(form.month) : null,
      dayOfMonth: form.dayOfMonth ? Number.parseInt(form.dayOfMonth) : null,
      shiftType: (form.shiftType as any) || null,
      replaceDoctorId: form.replaceDoctorId
        ? Number.parseInt(form.replaceDoctorId)
        : null,
      reason: form.reason || undefined,
    });
  }

  function handleCreateUnavailability() {
    if (!unavailabilityForm.doctorId || !unavailabilityForm.unavailableDate) {
      toast.error("Preencha profissional e data");
      return;
    }

    createUnavailabilityMutation.mutate({
      doctorId: Number.parseInt(unavailabilityForm.doctorId),
      unavailableDate: unavailabilityForm.unavailableDate,
      reason: unavailabilityForm.reason || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Excecoes</h1>
          <p className="text-sm text-muted-foreground">
            Bloqueios, substituicoes e indisponibilidades
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Excecao
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Excecoes Cadastradas ({exceptionsQuery.data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {exceptionsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma excecao cadastrada
            </p>
          )}
          {exceptionsQuery.data?.map((exception) => {
            const doctor = doctorMap.get(exception.doctorId);

            return (
              <div
                key={exception.id}
                className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: doctor?.cor ?? "#3B82F6" }}
                  />
                  <span className="text-sm font-medium">
                    {doctor?.name ?? `${professionalSingular} ${exception.doctorId}`}
                  </span>
                  <Badge
                    className={`text-xs ${EXCEPTION_TYPE_COLORS[exception.exceptionType]}`}
                  >
                    {EXCEPTION_TYPE_LABELS[exception.exceptionType]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {RECURRENCE_LABELS[exception.recurrenceType]}
                  </Badge>
                  {exception.specificDate && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(
                        exception.specificDate as unknown as string
                      ).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  {exception.month && (
                    <span className="text-xs text-muted-foreground">
                      {MONTH_NAMES[exception.month - 1]}
                    </span>
                  )}
                  {exception.reason && (
                    <span className="max-w-[150px] truncate text-xs text-muted-foreground">
                      {exception.reason}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate({ id: exception.id })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-blue-500" />
            Indisponibilidades por Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">{professionalSingular}</Label>
              <Select
                value={unavailabilityForm.doctorId}
                onValueChange={(value) =>
                  setUnavailabilityForm((current) => ({
                    ...current,
                    doctorId: value,
                  }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue
                    placeholder={professionalSingular}
                  />
                </SelectTrigger>
                <SelectContent>
                  {doctorsQuery.data?.map((doctor) => (
                    <SelectItem key={doctor.id} value={String(doctor.id)}>
                      {formatProfessionalOptionLabel(doctor)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={unavailabilityForm.unavailableDate}
                onChange={(event) =>
                  setUnavailabilityForm((current) => ({
                    ...current,
                    unavailableDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                className="h-8 w-full"
                onClick={handleCreateUnavailability}
              >
                Registrar
              </Button>
            </div>
          </div>

          <div className="max-h-48 space-y-1 overflow-y-auto">
            {unavailabilityQuery.data?.map((item) => {
              const doctor = doctorMap.get(item.doctorId);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b py-1 text-sm last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: doctor?.cor ?? "#3B82F6" }}
                    />
                    <span>{doctor?.shortName}</span>
                    <span className="text-muted-foreground">
                      {new Date(
                        item.unavailableDate as unknown as string
                      ).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() =>
                      deleteUnavailabilityMutation.mutate({ id: item.id })
                    }
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
            {(!unavailabilityQuery.data ||
              unavailabilityQuery.data.length === 0) && (
              <p className="text-xs text-muted-foreground">
                Nenhuma indisponibilidade registrada para este mes
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Excecao</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{professionalSingular}</Label>
              <Select
                value={form.doctorId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, doctorId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={`Selecionar ${professionalSingular.toLowerCase()}`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {doctorsQuery.data?.map((doctor) => (
                    <SelectItem key={doctor.id} value={String(doctor.id)}>
                      {formatProfessionalOptionLabel(doctor)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Excecao</Label>
                <Select
                  value={form.exceptionType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      exceptionType: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXCEPTION_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Recorrencia</Label>
                <Select
                  value={form.recurrenceType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      recurrenceType: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RECURRENCE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.recurrenceType === "once" && (
              <div>
                <Label>Data Especifica</Label>
                <Input
                  type="date"
                  value={form.specificDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      specificDate: event.target.value,
                    }))
                  }
                />
              </div>
            )}

            {(form.recurrenceType === "monthly" ||
              form.recurrenceType === "annual") && (
              <div className="grid grid-cols-2 gap-4">
                {form.recurrenceType === "annual" && (
                  <div>
                    <Label>Mes</Label>
                    <Select
                      value={form.month}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, month: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Mes" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((monthName, index) => (
                          <SelectItem key={monthName} value={String(index + 1)}>
                            {monthName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Dia do mes</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.dayOfMonth}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        dayOfMonth: event.target.value,
                      }))
                    }
                    placeholder="Ex: 15"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Motivo</Label>
              <Textarea
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              Criar Excecao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
