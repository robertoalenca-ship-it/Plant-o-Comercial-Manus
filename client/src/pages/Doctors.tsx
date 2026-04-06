import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProfilePresentation } from "@/lib/profilePresentation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Pencil, Plus, Search, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  titular: "Titular",
  resident: "Residente",
  sesab: "SESAB",
};

const CATEGORY_COLORS: Record<string, string> = {
  titular: "bg-blue-100 text-blue-800",
  resident: "bg-green-100 text-green-800",
  sesab: "bg-purple-100 text-purple-800",
};

type DoctorForm = {
  name: string;
  shortName: string;
  category: "titular" | "resident" | "sesab";
  hasSus: boolean;
  hasConvenio: boolean;
  canManhaSus: boolean;
  canManhaConvenio: boolean;
  canTardeSus: boolean;
  canTardeConvenio: boolean;
  canNoite: boolean;
  canFinalDeSemana: boolean;
  canSabado: boolean;
  canDomingo: boolean;
  can24h: boolean;
  participaRodizioNoite: boolean;
  limiteplantoesmes: number;
  limiteNoitesMes: number;
  limiteFdsMes: number;
  prioridade: "baixa" | "media" | "alta";
  cor: string;
  observacoes: string;
};

type AvailabilityField =
  | "canManhaSus"
  | "canManhaConvenio"
  | "canTardeSus"
  | "canTardeConvenio"
  | "canNoite";

const defaultForm: DoctorForm = {
  name: "",
  shortName: "",
  category: "titular",
  hasSus: true,
  hasConvenio: true,
  canManhaSus: true,
  canManhaConvenio: true,
  canTardeSus: true,
  canTardeConvenio: true,
  canNoite: true,
  canFinalDeSemana: true,
  canSabado: true,
  canDomingo: true,
  can24h: false,
  participaRodizioNoite: false,
  limiteplantoesmes: 0,
  limiteNoitesMes: 0,
  limiteFdsMes: 0,
  prioridade: "media",
  cor: "#3B82F6",
  observacoes: "",
};

export default function Doctors() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DoctorForm>(defaultForm);
  const { professionalSingular, professionalPlural } =
    useActiveProfilePresentation();

  const { data: doctors, refetch } = trpc.doctors.list.useQuery();

  const createMutation = trpc.doctors.create.useMutation({
    onSuccess: () => {
      toast.success(`${professionalSingular} cadastrado!`);
      setModalOpen(false);
      refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const updateMutation = trpc.doctors.update.useMutation({
    onSuccess: () => {
      toast.success(`${professionalSingular} atualizado!`);
      setModalOpen(false);
      refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteMutation = trpc.doctors.delete.useMutation({
    onSuccess: () => {
      toast.success(`${professionalSingular} removido!`);
      refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const seedMutation = trpc.doctors.seed.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const filtered = useMemo(() => {
    return (doctors ?? [])
      .filter((doctor) => {
        const matchSearch =
          doctor.name.toLowerCase().includes(search.toLowerCase()) ||
          doctor.shortName.toLowerCase().includes(search.toLowerCase());
        const matchCategory =
          filterCategory === "all" || doctor.category === filterCategory;

        return matchSearch && matchCategory;
      })
      .sort((left, right) =>
        left.name.localeCompare(right.name, "pt-BR", {
          sensitivity: "base",
        })
      );
  }, [doctors, filterCategory, search]);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setModalOpen(true);
  }

  function openEdit(doctor: (typeof filtered)[number]) {
    setEditingId(doctor.id);
    setForm({
      name: doctor.name,
      shortName: doctor.shortName,
      category: doctor.category as DoctorForm["category"],
      hasSus: doctor.hasSus,
      hasConvenio: doctor.hasConvenio,
      canManhaSus: doctor.canManhaSus,
      canManhaConvenio: doctor.canManhaConvenio,
      canTardeSus: doctor.canTardeSus,
      canTardeConvenio: doctor.canTardeConvenio,
      canNoite: doctor.canNoite,
      canFinalDeSemana: doctor.canFinalDeSemana,
      canSabado: doctor.canSabado,
      canDomingo: doctor.canDomingo,
      can24h: doctor.can24h,
      participaRodizioNoite: doctor.participaRodizioNoite,
      limiteplantoesmes: doctor.limiteplantoesmes ?? 0,
      limiteNoitesMes: doctor.limiteNoitesMes ?? 0,
      limiteFdsMes: doctor.limiteFdsMes ?? 0,
      prioridade: doctor.prioridade as DoctorForm["prioridade"],
      cor: doctor.cor,
      observacoes: doctor.observacoes ?? "",
    });
    setModalOpen(true);
  }

  function handleSubmit() {
    if (!form.name || !form.shortName) {
      toast.error("Nome e nome curto sao obrigatorios");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
      return;
    }

    createMutation.mutate(form);
  }

  function set<K extends keyof DoctorForm>(key: K, value: DoctorForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setAvailabilityGroup(
    fields: readonly AvailabilityField[],
    value: boolean
  ) {
    setForm((current) => {
      const next = { ...current };
      for (const field of fields) {
        next[field] = value;
      }
      return next;
    });
  }

  const BoolField = ({
    label,
    field,
  }: {
    label: string;
    field: keyof DoctorForm;
  }) => (
    <div className="flex items-center justify-between py-1">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch
        checked={form[field] as boolean}
        onCheckedChange={(value) => set(field, value as never)}
      />
    </div>
  );

  const GroupedBoolField = ({
    fields,
    label,
  }: {
    fields: readonly AvailabilityField[];
    label: string;
  }) => (
    <div className="flex items-center justify-between py-1">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch
        checked={fields.some((field) => form[field])}
        onCheckedChange={(value) => setAvailabilityGroup(fields, value)}
      />
    </div>
  );

  function renderCard(doctor: (typeof filtered)[number]) {
    return (
      <Card key={doctor.id} className="transition-shadow hover:shadow-sm">
        <CardContent className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: doctor.cor }}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{doctor.name}</span>
                  <Badge className={`text-xs ${CATEGORY_COLORS[doctor.category]}`}>
                    {CATEGORY_LABELS[doctor.category]}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(doctor.canManhaSus || doctor.canManhaConvenio) && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                      Manha
                    </span>
                  )}
                  {(doctor.canTardeSus || doctor.canTardeConvenio) && (
                    <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700">
                      Tarde
                    </span>
                  )}
                  {doctor.canNoite && (
                    <span className="rounded bg-purple-50 px-1.5 py-0.5 text-xs text-purple-700">
                      Noite
                    </span>
                  )}
                  {doctor.participaRodizioNoite && (
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700">
                      Rodizio
                    </span>
                  )}
                  {doctor.canFinalDeSemana && (
                    <span className="rounded bg-orange-50 px-1.5 py-0.5 text-xs text-orange-700">
                      FDS
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEdit(doctor)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate({ id: doctor.id })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{professionalPlural}</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} {professionalPlural.toLowerCase()} cadastrados
          </p>
        </div>
        <div className="flex gap-2">
          {(!doctors || doctors.length === 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Users className="mr-2 h-4 w-4" />
              Pre-cadastrar 22 medicos
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText("https://escala.app/invite/t8x9z2");
              toast.success("Link de convite copiado para a area de transferencia!");
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Convidar por Link
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo {professionalSingular}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Buscar ${professionalSingular.toLowerCase()}...`}
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            <SelectItem value="titular">Titular</SelectItem>
            <SelectItem value="resident">Residente</SelectItem>
            <SelectItem value="sesab">SESAB</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">{filtered.map(renderCard)}</div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <UserPlus className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>Nenhum {professionalSingular.toLowerCase()} encontrado.</p>
          {doctors?.length === 0 && (
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => seedMutation.mutate()}
            >
              Pre-cadastrar medicos
            </Button>
          )}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? `Editar ${professionalSingular}`
                : `Novo ${professionalSingular}`}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Dados Basicos</TabsTrigger>
              <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
              <TabsTrigger value="limits">Limites</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={form.name}
                    onChange={(event) => set("name", event.target.value)}
                    placeholder="Ex: Joao Silva"
                  />
                </div>
                <div>
                  <Label>Nome Curto *</Label>
                  <Input
                    value={form.shortName}
                    onChange={(event) => set("shortName", event.target.value)}
                    placeholder="Ex: J. Silva"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={form.category}
                    onValueChange={(value) =>
                      set("category", value as DoctorForm["category"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="titular">Titular</SelectItem>
                      <SelectItem value="resident">Residente</SelectItem>
                      <SelectItem value="sesab">SESAB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select
                    value={form.prioridade}
                    onValueChange={(value) =>
                      set("prioridade", value as DoctorForm["prioridade"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cor de Identificacao</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.cor}
                      onChange={(event) => set("cor", event.target.value)}
                      className="h-9 w-16 cursor-pointer rounded border"
                    />
                    <Input
                      value={form.cor}
                      onChange={(event) => set("cor", event.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label>Observacoes</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={(event) => set("observacoes", event.target.value)}
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="availability" className="mt-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="mb-3 text-sm font-medium">Turnos Permitidos</p>
                  <GroupedBoolField
                    label="Manha"
                    fields={["canManhaSus", "canManhaConvenio"]}
                  />
                  <GroupedBoolField
                    label="Tarde"
                    fields={["canTardeSus", "canTardeConvenio"]}
                  />
                  <BoolField label="Noite" field="canNoite" />
                </div>
                <div>
                  <p className="mb-3 text-sm font-medium">Final de Semana</p>
                  <BoolField label="Pode fazer FDS" field="canFinalDeSemana" />
                  <BoolField label="Pode fazer Sabado" field="canSabado" />
                  <BoolField label="Pode fazer Domingo" field="canDomingo" />
                </div>
                <div>
                  <p className="mb-3 text-sm font-medium">Rodizio</p>
                  <BoolField
                    label="Participa rodizio noite"
                    field="participaRodizioNoite"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Limite plantoes/mes</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.limiteplantoesmes}
                    onChange={(event) =>
                      set(
                        "limiteplantoesmes",
                        Number.parseInt(event.target.value) || 0
                      )
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    0 = sem limite
                  </p>
                </div>
                <div>
                  <Label>Limite noites/mes</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.limiteNoitesMes}
                    onChange={(event) =>
                      set(
                        "limiteNoitesMes",
                        Number.parseInt(event.target.value) || 0
                      )
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    0 = sem limite
                  </p>
                </div>
                <div>
                  <Label>Limite FDS/mes</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.limiteFdsMes}
                    onChange={(event) =>
                      set(
                        "limiteFdsMes",
                        Number.parseInt(event.target.value) || 0
                      )
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    0 = sem limite
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Salvar Alteracoes" : `Cadastrar ${professionalSingular}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
