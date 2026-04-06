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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
];

const WEEK_DAYS = [1, 2, 3, 4, 5];

export default function WeeklyRules() {
  const { professionalSingular, professionalPlural } =
    useActiveProfilePresentation();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    doctorId: "",
    dayOfWeek: "1",
    shiftType: "manha",
    weekAlternation: "all",
    participaRodizioNoite: false,
    noiteFixa: false,
    observacoes: "",
  });

  const rulesQuery = trpc.weeklyRules.list.useQuery();
  const doctorsQuery = trpc.doctors.list.useQuery();

  const createMutation = trpc.weeklyRules.create.useMutation({
    onSuccess: () => {
      toast.success("Regra criada!");
      setModalOpen(false);
      rulesQuery.refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteMutation = trpc.weeklyRules.delete.useMutation({
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
      dayOfWeek: Number.parseInt(form.dayOfWeek),
      shiftType: toLegacyStandardShiftType(form.shiftType),
      weekAlternation: form.weekAlternation as any,
      participaRodizioNoite: form.participaRodizioNoite,
      noiteFixa: form.noiteFixa,
      observacoes: form.observacoes || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Regras Semanais</h1>
          <p className="text-sm text-muted-foreground">
            {professionalPlural} fixos por dia da semana e turno
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      <div className="grid gap-4">
        {WEEK_DAYS.map((dayOfWeek) => {
          const dayRules =
            rulesQuery.data?.filter((rule: any) => rule.dayOfWeek === dayOfWeek) ??
            [];

          return (
            <Card key={dayOfWeek}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {DAY_NAMES[dayOfWeek]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dayRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma regra configurada
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayRules.map((rule: any) => {
                      const doctor = doctorMap.get(rule.doctorId);

                      return (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: doctor?.cor ?? "#3B82F6",
                              }}
                            />
                            <span className="text-sm font-medium">
                              {doctor?.name ??
                                `${professionalSingular} ${rule.doctorId}`}
                            </span>
                            <span
                              className={`rounded border px-2 py-0.5 text-xs ${
                                getProductShiftOption(rule.shiftType)?.colorClass ??
                                "shift-noite"
                              }`}
                            >
                              {getProductShiftLabel(rule.shiftType)}
                            </span>
                            {rule.weekAlternation !== "all" && (
                              <Badge variant="outline" className="text-xs">
                                {rule.weekAlternation === "odd"
                                  ? "1a e 3a"
                                  : "2a e 4a"}
                              </Badge>
                            )}
                            {rule.participaRodizioNoite && (
                              <Badge className="bg-purple-100 text-xs text-purple-800">
                                Rodizio noite
                              </Badge>
                            )}
                            {rule.noiteFixa && (
                              <Badge className="bg-indigo-100 text-xs text-indigo-800">
                                Noite fixa
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
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Regra Semanal</DialogTitle>
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
                <Label>Dia da Semana</Label>
                <Select
                  value={form.dayOfWeek}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, dayOfWeek: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEK_DAYS.map((dayOfWeek) => (
                      <SelectItem key={dayOfWeek} value={String(dayOfWeek)}>
                        {DAY_NAMES[dayOfWeek]}
                      </SelectItem>
                    ))}
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
              <Label>Alternancia</Label>
              <Select
                value={form.weekAlternation}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    weekAlternation: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda semana</SelectItem>
                  <SelectItem value="odd">1a e 3a semana</SelectItem>
                  <SelectItem value="even">2a e 4a semana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Participa do rodizio de noites</Label>
                <Switch
                  checked={form.participaRodizioNoite}
                  onCheckedChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      participaRodizioNoite: value,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Noite fixa</Label>
                <Switch
                  checked={form.noiteFixa}
                  onCheckedChange={(value) =>
                    setForm((current) => ({ ...current, noiteFixa: value }))
                  }
                />
              </div>
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
