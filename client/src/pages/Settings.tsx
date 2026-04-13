import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
import {
  buildScheduleProfilePayload,
  emptyScheduleProfileDraft,
  TEAM_SIZE_OPTIONS,
  type TeamSizeOption,
} from "@/lib/scheduleProfileDraft";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle2,
  Moon,
  Plus,
  Settings as SettingsIcon,
  Stethoscope,
  Sun,
  Trash2,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

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

export default function Settings() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [profileForm, setProfileForm] = useState(emptyScheduleProfileDraft);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "viewer" as "admin" | "coordinator" | "viewer" | "user",
  });
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    holidayDate: "",
    isNational: true,
    recurrenceType: "annual",
  });

  const { activeProfileId, setActiveProfileId } = useScheduleProfile();
  const { user } = useAuth();
  const { theme, toggleTheme, switchable } = useTheme();

  const { data: holidays, refetch: refetchHolidays } = trpc.holidays.list.useQuery();
  const { data: schedule, refetch: refetchSchedule } =
    trpc.schedules.getByMonth.useQuery({ year, month });
  const profilesQuery = trpc.scheduleProfiles.list.useQuery();
  const profiles = (profilesQuery.data ?? []).filter(
    (profile) => !/enferm/i.test(profile.name)
  );
  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? null;
  const adminUsersQuery = trpc.adminUsers.list.useQuery(undefined, {
    enabled: user?.role === "admin",
    retry: false,
    refetchOnWindowFocus: false,
  });
  const managedUsers = adminUsersQuery.data ?? [];

  const createProfileMutation = trpc.scheduleProfiles.create.useMutation({
    onSuccess: async (createdProfile) => {
      toast.success("Nova equipe criada.");
      setProfileForm(emptyScheduleProfileDraft);
      await profilesQuery.refetch();
      setActiveProfileId(createdProfile?.id ?? null);
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const createHolidayMutation = trpc.holidays.create.useMutation({
    onSuccess: () => {
      toast.success("Feriado cadastrado.");
      refetchHolidays();
      setHolidayForm({
        name: "",
        holidayDate: "",
        isNational: true,
        recurrenceType: "annual",
      });
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteHolidayMutation = trpc.holidays.delete.useMutation({
    onSuccess: () => {
      toast.success("Feriado removido.");
      refetchHolidays();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const updateStatusMutation = trpc.schedules.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado.");
      refetchSchedule();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteScheduleMutation = trpc.schedules.deleteMonth.useMutation({
    onSuccess: () => {
      toast.success("Escala do mês apagada.");
      refetchSchedule();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const inviteUserMutation = trpc.adminUsers.invite.useMutation({
    onSuccess: async (data) => {
      toast.success("Convite gerado com sucesso!");
      setLastInviteLink(`${window.location.origin}${data.inviteLink}`);
      setUserForm({
        name: "",
        email: "",
        role: "viewer",
      });
      await adminUsersQuery.refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const setManagedUserActiveMutation = trpc.adminUsers.setActive.useMutation({
    onSuccess: async () => {
      toast.success("Usuario atualizado.");
      await adminUsersQuery.refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const deleteManagedUserMutation = trpc.adminUsers.delete.useMutation({
    onSuccess: async () => {
      toast.success("Usuario excluido.");
      await adminUsersQuery.refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const statusOptions = [
    { value: "draft", label: "Rascunho", color: "bg-yellow-100 text-yellow-800" },
    {
      value: "preliminary",
      label: "Preliminar",
      color: "bg-blue-100 text-blue-800",
    },
    { value: "approved", label: "Aprovada", color: "bg-green-100 text-green-800" },
    { value: "locked", label: "Bloqueada", color: "bg-gray-100 text-gray-800" },
  ];

  const userRoleOptions = [
    { value: "admin", label: "Administrador" },
    { value: "coordinator", label: "Coordenador" },
    { value: "viewer", label: "Visualizador" },
    { value: "user", label: "Usuario" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Configuracoes</h1>
        <p className="text-sm text-muted-foreground">
          Gerenciamento de equipes/setores, feriados e fechamento mensal.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-emerald-500" />
            Equipes e setores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            Cada equipe ou setor fica separado, com seus proprios medicos,
            regras, excecoes e meses gerados.
          </div>

          <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              {profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma equipe cadastrada.
                </p>
              ) : null}
              {profiles.map((profile) => {
                const isActive = profile.id === activeProfileId;

                return (
                  <div
                    key={profile.id}
                    className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{profile.name}</span>
                        {isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            Equipe ativa
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5" />
                        {profile.description?.trim() || "Equipe/setor independente"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isActive ? "secondary" : "outline"}
                        size="sm"
                        disabled={isActive}
                        onClick={() => setActiveProfileId(profile.id)}
                        className="h-8 shadow-sm"
                      >
                        {isActive ? "Em uso" : "Usar esta equipe"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border p-3">
              <p className="font-medium">Criar nova equipe</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Venda por escala/setor: crie um ambiente novo sempre que houver
                uma nova equipe operacional.
              </p>
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-xs">Equipe/setor</Label>
                    <Input
                      className="mt-1 h-9"
                      value={profileForm.teamName}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          teamName: event.target.value,
                        }))
                      }
                      placeholder="Ex: UTI Adulto"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hospital/unidade</Label>
                    <Input
                      className="mt-1 h-9"
                      value={profileForm.organizationName}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          organizationName: event.target.value,
                        }))
                      }
                      placeholder="Ex: Hospital Sao Jose"
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-xs">Faixa de medicos</Label>
                    <Select
                      value={profileForm.teamSize}
                      onValueChange={(value) =>
                        setProfileForm((current) => ({
                          ...current,
                          teamSize: value as TeamSizeOption,
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue placeholder="Selecione a faixa" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEAM_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Especialidade</Label>
                    <Input
                      className="mt-1 h-9"
                      value={profileForm.specialty}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          specialty: event.target.value,
                        }))
                      }
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  Modelo padrao do produto: <strong>Manha, Tarde e Noite</strong>.
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!profileForm.teamName.trim()) {
                      toast.error("Informe o nome da equipe.");
                      return;
                    }

                    if (!profileForm.organizationName.trim()) {
                      toast.error("Informe o hospital ou unidade.");
                      return;
                    }

                    if (!profileForm.teamSize) {
                      toast.error("Selecione a faixa de medicos.");
                      return;
                    }

                    createProfileMutation.mutate(
                      buildScheduleProfilePayload(profileForm)
                    );
                  }}
                  disabled={createProfileMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createProfileMutation.isPending
                    ? "Criando..."
                    : "Criar equipe"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {activeProfile?.name ?? "Equipe selecionada"}
                </span>
                <Badge className="bg-green-100 text-green-800">
                  Equipe ativa
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeProfile?.description?.trim() ||
                  "Equipe/setor atualmente usado para gerar e editar a escala."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => profilesQuery.refetch()}
              disabled={profilesQuery.isFetching}
            >
              {profilesQuery.isFetching ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {user?.role === "admin" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Usuarios do sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              Cadastre logins adicionais para o sistema via convite manual.
            </div>

            <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3">
                {managedUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum usuario cadastrado ainda.
                  </p>
                ) : null}
                {managedUsers.map((managedUser) => (
                  <div
                    key={`${managedUser.userId}-${managedUser.email}`}
                    className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {managedUser.name || managedUser.email}
                        </span>
                        <Badge variant="outline" className="lowercase">{managedUser.email}</Badge>
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] h-5">
                          {userRoleOptions.find(
                            (option) => option.value === managedUser.role
                          )?.label ?? managedUser.role}
                        </Badge>
                        <Badge
                          className={
                            managedUser.active
                              ? "bg-green-100 text-green-800 text-[10px] h-5"
                              : "bg-gray-100 text-gray-800 text-[10px] h-5"
                          }
                        >
                          {managedUser.active ? "Ativo" : "Inativo"}
                        </Badge>
                        {!managedUser.isEmailVerified && (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px] h-5">
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!managedUser.isBuiltIn ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 px-3"
                          disabled={
                            deleteManagedUserMutation.isPending ||
                            setManagedUserActiveMutation.isPending
                          }
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Excluir o usuario ${managedUser.email}?`
                            );

                            if (!confirmed) return;

                            deleteManagedUserMutation.mutate({
                              userId: managedUser.userId,
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      <Button
                        variant={managedUser.active ? "outline" : "secondary"}
                        size="sm"
                        className="h-8 text-xs"
                        disabled={
                          managedUser.isBuiltIn ||
                          setManagedUserActiveMutation.isPending ||
                          deleteManagedUserMutation.isPending
                        }
                        onClick={() =>
                          setManagedUserActiveMutation.mutate({
                            userId: managedUser.userId,
                            active: !managedUser.active,
                          })
                        }
                      >
                        {managedUser.active ? "Desativar" : "Reativar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border p-3 bg-teal-50/30 border-teal-100/50">
                <p className="font-semibold text-teal-900 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Convidar novo profissional
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  O sistema gerará um link único para que o profissional defina sua própria senha.
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-slate-400">Nome Completo</Label>
                    <Input
                      className="mt-1 h-9 border-slate-200 focus:border-teal-500"
                      value={userForm.name}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Ex: Dr. Roberto Alencar"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-slate-400">E-mail de Acesso</Label>
                    <Input
                      className="mt-1 h-9 border-slate-200 focus:border-teal-500"
                      value={userForm.email}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="exemplo@hospital.com"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-slate-400">Permissão</Label>
                    <Select
                      value={userForm.role}
                      onValueChange={(value) =>
                        setUserForm((current) => ({
                          ...current,
                          role: value as any,
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1 h-9 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {lastInviteLink && (
                    <div className="p-3 bg-white border border-teal-200 rounded-lg space-y-2 animate-in slide-in-from-top-2 duration-300">
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Link de Convite Gerado:</p>
                      <div className="flex gap-2">
                        <Input value={lastInviteLink} readOnly className="h-8 text-xs bg-slate-50" />
                        <Button 
                          size="sm" 
                          className="h-8 text-[10px] whitespace-nowrap bg-teal-600 hover:bg-teal-700"
                          onClick={() => {
                            navigator.clipboard.writeText(lastInviteLink);
                            toast.success("Link copiado!");
                          }}
                        >
                          Copiar Link
                        </Button>
                      </div>
                      <p className="text-[10px] text-slate-400 italic leading-tight">Envie este link via WhatsApp para o médico.</p>
                    </div>
                  )}

                  <Button
                    className="w-full bg-[#14B8A6] hover:bg-[#0D9488] shadow-md shadow-[#14B8A6]/20 transition-all font-semibold h-10"
                    onClick={() => {
                      if (!userForm.name.trim()) {
                        toast.error("Informe o nome.");
                        return;
                      }
                      if (!userForm.email.trim()) {
                        toast.error("Informe o e-mail.");
                        return;
                      }

                      inviteUserMutation.mutate({
                        name: userForm.name.trim(),
                        email: userForm.email.trim(),
                        role: userForm.role,
                      });
                    }}
                    disabled={inviteUserMutation.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {inviteUserMutation.isPending
                      ? "Gerando Convite..."
                      : "Gerar Link de Convite"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      
      {schedule ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Status da escala - {MONTH_NAMES[month - 1]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={schedule.status === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      scheduleId: schedule.id,
                      status: option.value as
                        | "draft"
                        | "preliminary"
                        | "approved"
                        | "locked",
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Status atual:{" "}
              <Badge
                className={
                  statusOptions.find((option) => option.value === schedule.status)
                    ?.color ?? ""
                }
              >
                {statusOptions.find((option) => option.value === schedule.status)
                  ?.label ?? schedule.status}
              </Badge>
            </p>
            <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-foreground">
                Apagar escala mensal
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Remove a escala de {MONTH_NAMES[month - 1]} {year} e todos os
                plantões desse mês. Esta ação não desfaz sozinha.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                disabled={deleteScheduleMutation.isPending}
                onClick={() => {
                  const confirmed = window.confirm(
                    `Apagar a escala de ${MONTH_NAMES[month - 1]} ${year}? Todos os plantões desse mês serão removidos.`
                  );

                  if (!confirmed) return;

                  deleteScheduleMutation.mutate({
                    scheduleId: schedule.id,
                  });
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteScheduleMutation.isPending
                  ? "Apagando..."
                  : "Apagar escala do mês"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-rose-500" />
            Feriados ({holidays?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Nome do feriado</Label>
              <Input
                className="h-8 text-xs"
                value={holidayForm.name}
                onChange={(event) =>
                  setHolidayForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Ex: Natal"
              />
            </div>
            <div>
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={holidayForm.holidayDate}
                onChange={(event) =>
                  setHolidayForm((current) => ({
                    ...current,
                    holidayDate: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Recorrencia</Label>
              <Select
                value={holidayForm.recurrenceType}
                onValueChange={(value) =>
                  setHolidayForm((current) => ({
                    ...current,
                    recurrenceType: value,
                  }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Anual</SelectItem>
                  <SelectItem value="once">Uma vez</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                className="h-8 w-full"
                onClick={() => {
                  if (!holidayForm.name || !holidayForm.holidayDate) {
                    toast.error("Preencha nome e data.");
                    return;
                  }

                  createHolidayMutation.mutate({
                    name: holidayForm.name,
                    holidayDate: holidayForm.holidayDate,
                    isNational: holidayForm.isNational,
                    recurrenceType: holidayForm.recurrenceType as "annual" | "once",
                  });
                }}
                disabled={createHolidayMutation.isPending}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {holidays?.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum feriado cadastrado.
              </p>
            ) : null}
            {holidays?.map((holiday: any) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between border-b py-1.5 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{holiday.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(
                      holiday.holidayDate as unknown as string
                    ).toLocaleDateString("pt-BR")}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {holiday.recurrenceType === "annual" ? "Anual" : "Uma vez"}
                  </Badge>
                  {holiday.isNational ? (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      Nacional
                    </Badge>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => deleteHolidayMutation.mutate({ id: holiday.id })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {switchable && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {theme === "light" ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-400" />
              )}
              Aparencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              Alternar para tema {theme === "light" ? "Escuro" : "Claro"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
