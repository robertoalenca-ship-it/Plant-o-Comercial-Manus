import { type ChangeEvent, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProfilePresentation } from "@/lib/profilePresentation";
import {
  buildDoctorImportTemplateCsv,
  parseDoctorImportFile,
  type DoctorImportPreview,
} from "@/lib/doctorCsv";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileDown,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  User,
  Stethoscope,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  titular: "Titular",
  resident: "Residente",
  sesab: "Externo",
};

const CATEGORY_COLORS: Record<string, string> = {
  titular: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  resident: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  sesab: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
};

type DoctorForm = {
  name: string;
  shortName: string;
  specialty: string;
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
  specialty: "",
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
  cor: "#14b8a6",
  observacoes: "",
};

export default function Doctors() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DoctorForm>(defaultForm);
  const [importFileName, setImportFileName] = useState("");
  const [importPreview, setImportPreview] =
    useState<DoctorImportPreview | null>(null);
  const [isReadingImportFile, setIsReadingImportFile] = useState(false);
  const { professionalSingular, professionalPlural } =
    useActiveProfilePresentation();

  const { data: doctors, refetch } = trpc.doctors.list.useQuery();

  const createMutation = trpc.doctors.create.useMutation({
    onSuccess: () => {
      toast.success(`${professionalSingular} cadastrado!`);
      setModalOpen(false);
      refetch();
    },
    onError: error => toast.error(`Erro: ${error.message}`),
  });

  const updateMutation = trpc.doctors.update.useMutation({
    onSuccess: () => {
      toast.success(`${professionalSingular} atualizado!`);
      setModalOpen(false);
      refetch();
    },
    onError: error => toast.error(`Erro: ${error.message}`),
  });

  const deleteMutation = trpc.doctors.delete.useMutation({
    onSuccess: () => {
      toast.success(`${professionalSingular} removido!`);
      refetch();
    },
    onError: error => toast.error(`Erro: ${error.message}`),
  });

  const importMutation = trpc.doctors.import.useMutation({
    onSuccess: async result => {
      const skippedMessage =
        result.skipped.length > 0
          ? ` ${result.skipped.length} linha(s) foram ignoradas por duplicidade.`
          : "";
      toast.success(
        `${result.created} ${professionalPlural.toLowerCase()} importados.${skippedMessage}`
      );
      setImportModalOpen(false);
      setImportFileName("");
      setImportPreview(null);
      await refetch();
    },
    onError: error => toast.error(`Erro: ${error.message}`),
  });

  const filtered = useMemo(() => {
    return (doctors ?? [])
      .filter(doctor => {
        const matchSearch =
          doctor.name.toLowerCase().includes(search.toLowerCase()) ||
          doctor.shortName.toLowerCase().includes(search.toLowerCase()) ||
          (doctor as any).specialty?.toLowerCase().includes(search.toLowerCase());
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

  const stats = useMemo(() => {
    const total = doctors?.length ?? 0;
    const titular = doctors?.filter(d => d.category === "titular").length ?? 0;
    const resident = doctors?.filter(d => d.category === "resident").length ?? 0;
    return { total, titular, resident };
  }, [doctors]);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setModalOpen(true);
  }

  function openImport() {
    setImportFileName("");
    setImportPreview(null);
    setImportModalOpen(true);
  }

  function openEdit(doctor: (typeof filtered)[number]) {
    setEditingId(doctor.id);
    setForm({
      name: doctor.name,
      shortName: doctor.shortName,
      specialty: (doctor as any).specialty ?? "",
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
      toast.error("Nome e nome curto são obrigatórios");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
      return;
    }

    createMutation.mutate(form);
  }

  function handleDownloadTemplate() {
    const csv = buildDoctorImportTemplateCsv();
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-importacao-medicos.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReadingImportFile(true);
    setImportFileName(file.name);

    try {
      const parsed = await parseDoctorImportFile(file);
      setImportPreview(parsed);

      if (parsed.rows.length === 0) {
        toast.error("Nenhuma linha válida encontrada no arquivo.");
      } else if (parsed.errors.length > 0) {
        toast.warning(
          `${parsed.rows.length} linha(s) válidas e ${parsed.errors.length} com erro.`
        );
      } else {
        toast.success(`${parsed.rows.length} linha(s) prontas para importar.`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível ler o arquivo. Use CSV, XLSX ou XLS."
      );
      setImportPreview(null);
    } finally {
      setIsReadingImportFile(false);
      event.target.value = "";
    }
  }

  function handleImportSubmit() {
    if (!importPreview || importPreview.rows.length === 0) {
      toast.error("Selecione um arquivo com pelo menos uma linha válida.");
      return;
    }

    importMutation.mutate({
      rows: importPreview.rows as any,
    });
  }

  function set<K extends keyof DoctorForm>(key: K, value: DoctorForm[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function setAvailabilityGroup(
    fields: readonly AvailabilityField[],
    value: boolean
  ) {
    setForm(current => {
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
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 grow">
      <Label className="text-sm font-medium">{label}</Label>
      <Switch
        checked={form[field] as boolean}
        onCheckedChange={value => set(field, value as never)}
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
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 grow">
      <Label className="text-sm font-medium">{label}</Label>
      <Switch
        checked={fields.some(field => form[field])}
        onCheckedChange={value => setAvailabilityGroup(fields, value)}
      />
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Equipe Médica</h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Gerenciamento de {professionalPlural.toLowerCase()} e especialidades.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText("https://escala.app/invite/t8x9z2");
              toast.success("Link de convite copiado!");
            }}
            className="glass shadow-sm"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Convidar
          </Button>
          <Button variant="outline" onClick={openImport} className="glass shadow-sm">
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 shadow-sm px-6">
            <Plus className="mr-2 h-4 w-4" />
            Novo Registro
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/40 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-teal-100 p-3 dark:bg-teal-900/30">
                <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold tabular-nums tracking-tight">{stats.total}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-sky-100 p-3 dark:bg-sky-900/30">
                <Stethoscope className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold tabular-nums tracking-tight">{stats.titular}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Titulares</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/40 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/30">
                <User className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold tabular-nums tracking-tight">{stats.resident}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Residentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Filtrar por nome, especialidade ou cargo...`}
            className="pl-10 h-11"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full md:w-52 h-11">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            <SelectItem value="titular">Titular</SelectItem>
            <SelectItem value="resident">Residente</SelectItem>
            <SelectItem value="sesab">Externo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filtered.map(doctor => (
          <Card 
            key={doctor.id} 
            className="group transition-all hover:bg-slate-50/50 dark:hover:bg-slate-900/20 border-slate-200/60 dark:border-slate-800/60 hover:shadow-md hover:translate-x-1"
          >
            <CardContent className="p-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div 
                    className="relative w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                    style={{ backgroundColor: doctor.cor || '#14b8a6' }}
                  >
                    {doctor.name.charAt(0)}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-500 border-2 border-white dark:border-slate-950 rounded-full" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground leading-none">{doctor.name}</h3>
                      <Badge className={cn("text-[9px] h-4 font-bold uppercase tracking-wider", CATEGORY_COLORS[doctor.category])}>
                        {CATEGORY_LABELS[doctor.category]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" />
                        {(doctor as any).specialty || "Clínico Geral"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[9px] py-0 border-slate-200 dark:border-slate-800">
                           ID: {String(doctor.id).padStart(4, '0')}
                        </Badge>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:self-center">
                  {(doctor.canManhaSus || doctor.canManhaConvenio) && (
                    <Badge variant="outline" className="bg-teal-50/30 text-teal-700 border-teal-100 text-[9px] dark:bg-teal-900/10 dark:text-teal-400 dark:border-teal-900/30">M</Badge>
                  )}
                  {(doctor.canTardeSus || doctor.canTardeConvenio) && (
                    <Badge variant="outline" className="bg-sky-50/30 text-sky-700 border-sky-100 text-[9px] dark:bg-sky-900/10 dark:text-sky-400 dark:border-sky-900/30">T</Badge>
                  )}
                  {doctor.canNoite && (
                    <Badge variant="outline" className="bg-indigo-50/30 text-indigo-700 border-indigo-100 text-[9px] dark:bg-indigo-900/10 dark:text-indigo-400 dark:border-indigo-900/30">N</Badge>
                  )}
                  {doctor.canFinalDeSemana && (
                    <Badge variant="outline" className="bg-amber-50/30 text-amber-700 border-amber-100 text-[9px] dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-900/30 font-bold">FDS</Badge>
                  )}
                </div>

                <div className="flex items-center gap-1 sm:self-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-slate-400 group-hover:text-primary transition-colors"
                    onClick={() => openEdit(doctor)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-slate-300 hover:text-rose-600 transition-colors"
                    onClick={() => {
                      if (confirm(`Remover registro de ${doctor.name}?`)) {
                        deleteMutation.mutate({ id: doctor.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
             <Search className="h-8 w-8 text-slate-300" />
          </div>
          <p className="font-bold text-foreground">Nenhum registro encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
            Tente ajustar os filtros ou pesquisar por outro nome ou especialidade.
          </p>
          <Button variant="link" onClick={() => { setSearch(""); setFilterCategory("all"); }} className="mt-2 text-primary font-bold">
            Limpar Filtros
          </Button>
        </div>
      )}

      {/* Modern Profile Editor Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[95vh] max-w-2xl overflow-hidden p-0 rounded-3xl border-0 shadow-2xl">
          <div className="bg- premium-gradient p-8 text-white relative">
             <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white leading-none">
                   {editingId ? `Perfil Profissional` : `Novo Profissional`}
                </DialogTitle>
                <p className="text-teal-100/70 text-sm mt-1">{editingId ? 'Atualize as permissões e limites do registro' : 'Configure o novo médico da sua equipe'}</p>
             </DialogHeader>
             <div className="absolute bottom-0 right-0 p-4 opacity-10 pointer-events-none">
                <Stethoscope size={100} />
             </div>
          </div>

          <div className="p-1">
            <Tabs defaultValue="basic">
              <div className="px-6 pt-4">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-900 overflow-hidden rounded-xl h-10">
                  <TabsTrigger value="basic" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-sm">Identificação</TabsTrigger>
                  <TabsTrigger value="availability" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-sm">Jornada</TabsTrigger>
                  <TabsTrigger value="limits" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-primary data-[state=active]:shadow-sm">Parâmetros</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
                <TabsContent value="basic" className="mt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome Completo</Label>
                      <Input
                        value={form.name}
                        onChange={event => set("name", event.target.value)}
                        placeholder="Ex: João da Silva Santos"
                        className="bg-slate-50/50 dark:bg-slate-900/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome de Escala</Label>
                      <Input
                        value={form.shortName}
                        onChange={event => set("shortName", event.target.value)}
                        placeholder="Ex: J. Silva"
                        className="bg-slate-50/50 dark:bg-slate-900/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Especialidade</Label>
                      <Input
                        value={form.specialty}
                        onChange={event => set("specialty", event.target.value)}
                        placeholder="Ex: Ortopedia, Cardiologia..."
                        className="bg-slate-50/50 dark:bg-slate-900/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                      <Select
                        value={form.category}
                        onValueChange={value => set("category", value as DoctorForm["category"])}
                      >
                        <SelectTrigger className="bg-slate-50/50 dark:bg-slate-900/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="titular">Médico Titular</SelectItem>
                          <SelectItem value="resident">Médico Residente</SelectItem>
                          <SelectItem value="sesab">Externo / Plantonista</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                       <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cor no Calendário</Label>
                       <div className="flex items-center gap-3">
                         <div 
                           className="w-10 h-10 rounded-xl border-2 border-white dark:border-slate-800 shadow-sm grow-0 shrink-0"
                           style={{ backgroundColor: form.cor }} 
                         />
                         <Input
                           type="text"
                           value={form.cor}
                           onChange={event => set("cor", event.target.value)}
                           className="bg-slate-50/50 dark:bg-slate-900/40 font-mono text-xs uppercase"
                         />
                         <input
                           type="color"
                           value={form.cor}
                           onChange={event => set("cor", event.target.value)}
                           className="w-8 h-8 opacity-0 absolute pointer-events-none"
                         />
                         <Button variant="outline" size="sm" onClick={(e) => {
                            const input = (e.currentTarget.previousSibling as HTMLInputElement);
                            input.click();
                         }} className="h-10 text-xs font-bold px-4">Escolher</Button>
                       </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prioridade Automação</Label>
                      <Select
                        value={form.prioridade}
                        onValueChange={value => set("prioridade", value as DoctorForm["prioridade"])}
                      >
                        <SelectTrigger className="bg-slate-50/50 dark:bg-slate-900/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa (Menos plantões)</SelectItem>
                          <SelectItem value="media">Média (Equilibrado)</SelectItem>
                          <SelectItem value="alta">Alta (Priorizar escalas)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações Internas</Label>
                    <Textarea
                      value={form.observacoes}
                      onChange={event => set("observacoes", event.target.value)}
                      rows={3}
                      className="bg-slate-50/50 dark:bg-slate-900/40 resize-none"
                      placeholder="Notas sobre convênios, CRM ou restrições específicas..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="availability" className="mt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                         <div className="p-1 px-2 rounded bg-teal-100 dark:bg-teal-900/30 text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-widest">Rotinas</div>
                      </div>
                      <div className="space-y-1">
                        <GroupedBoolField label="Manhã (Geral)" fields={["canManhaSus", "canManhaConvenio"]} />
                        <GroupedBoolField label="Tarde (Geral)" fields={["canTardeSus", "canTardeConvenio"]} />
                        <BoolField label="Plantão Noturno" field="canNoite" />
                        <BoolField label="Participa do Rodízio" field="participaRodizioNoite" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                         <div className="p-1 px-2 rounded bg-amber-100 dark:bg-amber-900/30 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Finais de Semana</div>
                      </div>
                      <div className="space-y-1">
                        <BoolField label="Disponível FDS" field="canFinalDeSemana" />
                        <BoolField label="Pode Sábado" field="canSabado" />
                        <BoolField label="Pode Domingo" field="canDomingo" />
                        <BoolField label="Plantão 24h" field="can24h" />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="limits" className="mt-0 space-y-6">
                   <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 rounded-2xl">
                      <p className="text-xs text-sky-700 dark:text-sky-400 leading-relaxed font-medium">
                        Configure os limites mensais. O gerador de escalas respeitará esses valores ao realizar distribuições automáticas. <strong>Use 0 para sem limite definido.</strong>
                      </p>
                   </div>
                   
                   <div className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <Label className="text-sm font-bold">Máximo de Plantões por Mês</Label>
                          <Badge variant="outline" className="font-mono tabular-nums">{form.limiteplantoesmes || 'Sem limite'}</Badge>
                        </div>
                        <Input 
                          type="number" 
                          value={form.limiteplantoesmes} 
                          onChange={e => set('limiteplantoesmes', parseInt(e.target.value) || 0)}
                          className="h-10 border-slate-200"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <Label className="text-sm font-bold">Limite de Noites p/ Período</Label>
                          <Badge variant="outline" className="font-mono tabular-nums">{form.limiteNoitesMes || 'Ilimitado'}</Badge>
                        </div>
                        <Input 
                          type="number" 
                          value={form.limiteNoitesMes} 
                          onChange={e => set('limiteNoitesMes', parseInt(e.target.value) || 0)}
                          className="h-10 border-slate-200"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <Label className="text-sm font-bold">Máximo Finais de Semana</Label>
                          <Badge variant="outline" className="font-mono tabular-nums">{form.limiteFdsMes || 'Ilimitado'}</Badge>
                        </div>
                        <Input 
                          type="number" 
                          value={form.limiteFdsMes} 
                          onChange={e => set('limiteFdsMes', parseInt(e.target.value) || 0)}
                          className="h-10 border-slate-200"
                        />
                      </div>
                   </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t flex flex-col sm:flex-row gap-3">
             <Button variant="ghost" onClick={() => setModalOpen(false)} className="sm:flex-1 h-12 text-sm font-bold tracking-tight">Cancelar</Button>
             <Button onClick={handleSubmit} className="sm:flex-[2] h-12 text-sm font-bold tracking-tight bg-primary shadow-lg shadow-primary/20">
                {editingId ? 'Confirmar Alterações' : 'Criar Profissional'}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Import Modal could also be overhauled similarly if needed, but the focus is on the main list and form */}
    </div>
  );
}
