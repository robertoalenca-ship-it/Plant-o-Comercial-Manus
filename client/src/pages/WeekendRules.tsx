import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProfilePresentation } from "@/lib/profilePresentation";
import {
  getProductShiftLabel,
  getProductShiftOption,
  PRODUCT_SHIFT_OPTIONS,
  toLegacyStandardShiftType,
} from "@/lib/productShifts";
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Sun } from "lucide-react";
import { toast } from "sonner";

const DAY_TYPE_LABELS: Record<string, string> = {
  sabado: "Sabado",
  domingo: "Domingo",
  ambos: "Sabado e Domingo",
};

const WEEK_OF_MONTH_LABELS: Record<string, string> = {
  "1": "1o",
  "2": "2o",
  "3": "3o",
  "4": "4o",
  "5": "5o",
};

export default function WeekendRules() {
  const { professionalSingular } = useActiveProfilePresentation();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    doctorId: "",
    dayType: "sabado",
    shiftType: "noite",
    weekOfMonth: "all",
    observacoes: "",
  });

  const rulesQuery = trpc.weekendRules.list.useQuery();
  const doctorsQuery = trpc.doctors.list.useQuery();

  const createMutation = trpc.weekendRules.create.useMutation({
    onSuccess: () => {
      toast.success("Regra de fim de semana criada!");
      setModalOpen(false);
      rulesQuery.refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteMutation = trpc.weekendRules.delete.useMutation({
    onSuccess: () => {
      toast.success("Regra removida!");
      rulesQuery.refetch();
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
      dayType: form.dayType as any,
      shiftType: toLegacyStandardShiftType(form.shiftType),
      weekOfMonth:
        form.weekOfMonth && form.weekOfMonth !== "all"
          ? Number.parseInt(form.weekOfMonth)
          : null,
      observacoes: form.observacoes || undefined,
    });
  }

  const saturdayRules =
    rulesQuery.data?.filter(
      (rule: any) => rule.dayType === "sabado" || rule.dayType === "ambos"
    ) ?? [];
  const sundayRules =
    rulesQuery.data?.filter(
      (rule: any) => rule.dayType === "domingo" || rule.dayType === "ambos"
    ) ?? [];

  const RuleCard = ({ rule }: { rule: NonNullable<typeof rulesQuery.data>[0] }) => {
    const doctor = doctorMap.get(rule.doctorId);

    return (
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: doctor?.cor ?? "#3B82F6" }}
          />
          <span className="text-sm font-medium">
            {doctor?.name ?? `${professionalSingular} ${rule.doctorId}`}
          </span>
          <span
            className={`rounded border px-2 py-0.5 text-xs ${
              getProductShiftOption(rule.shiftType)?.colorClass ?? "shift-noite"
            }`}
          >
            {getProductShiftLabel(rule.shiftType)}
          </span>
          <Badge variant="outline" className="text-xs">
            {DAY_TYPE_LABELS[rule.dayType]}
          </Badge>
          {rule.weekOfMonth && (
            <Badge variant="outline" className="text-xs">
              {WEEK_OF_MONTH_LABELS[String(rule.weekOfMonth)]} FDS
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => deleteMutation.mutate({ id: rule.id })}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finais de Semana</h1>
          <p className="text-sm text-muted-foreground">
            Regras especificas para sabados e domingos
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sun className="h-4 w-4 text-orange-500" />
              Sabados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {saturdayRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma regra de sabado
              </p>
            ) : (
              saturdayRules.map((rule: any) => <RuleCard key={rule.id} rule={rule} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sun className="h-4 w-4 text-red-500" />
              Domingos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sundayRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma regra de domingo
              </p>
            ) : (
              sundayRules.map((rule: any) => <RuleCard key={rule.id} rule={rule} />)
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Regra de Final de Semana</DialogTitle>
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
                <Label>Dia</Label>
                <Select
                  value={form.dayType}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, dayType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sabado">Sabado</SelectItem>
                    <SelectItem value="domingo">Domingo</SelectItem>
                    <SelectItem value="ambos">Sabado e Domingo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Turno</Label>
                <Select
                  value={form.shiftType}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, shiftType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_SHIFT_OPTIONS.map((shift) => (
                      <SelectItem key={shift.key} value={shift.key}>
                        {shift.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Semana do mes (opcional)</Label>
              <Select
                value={form.weekOfMonth}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, weekOfMonth: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os finais de semana" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os finais de semana</SelectItem>
                  <SelectItem value="1">1o FDS</SelectItem>
                  <SelectItem value="2">2o FDS</SelectItem>
                  <SelectItem value="3">3o FDS</SelectItem>
                  <SelectItem value="4">4o FDS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observacoes</Label>
              <Textarea
                value={form.observacoes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    observacoes: event.target.value,
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
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              Criar Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
