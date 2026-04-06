import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
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
  const [profileForm, setProfileForm] = useState({
    name: "",
    description: "",
  });
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "viewer",
  });
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
      toast.success("Nova escala medica criada.");
      setProfileForm({ name: "", description: "" });
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

  // applyBaselineMutation removed

  const createManagedUserMutation = trpc.adminUsers.create.useMutation({
    onSuccess: async () => {
      toast.success("Usuario criado com sucesso.");
      setUserForm({
        name: "",
        email: "",
        username: "",
        password: "",
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
          Gerenciamento de Multi-Tenancy (Multi-Clínicas), Feriados e Status de Mensal.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-emerald-500" />
            Escalas medicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            Cada escala medica fica separada, com seus proprios medicos,
            regras, excecoes e meses gerados.
          </div>

          <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              {profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma escala medica cadastrada.
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
                        <span className="font-medium">{profile.name}</span>
                        {isActive ? (
                          <Badge className="bg-green-100 text-green-800">
                            Escala ativa
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {profile.description?.trim() ||
                          "Escala medica separada para outra especialidade, equipe ou unidade."}
                      </p>
                    </div>
                    <Button
                      variant={isActive ? "secondary" : "outline"}
                      size="sm"
                      disabled={isActive}
                      onClick={() => setActiveProfileId(profile.id)}
                    >
                      {isActive ? "Em uso" : "Usar esta escala"}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border p-3">
              <p className="font-medium">Criar nova escala medica</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Exemplo: Clinica Medica, Pediatria, UTI ou Cirurgia.
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input
                    className="mt-1 h-9"
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ex: Clinica Medica"
                  />
                </div>
                <div>
                  <Label className="text-xs">Descricao</Label>
                  <Input
                    className="mt-1 h-9"
                    value={profileForm.description}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Opcional"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!profileForm.name.trim()) {
                      toast.error("Informe o nome da nova escala.");
                      return;
                    }

                    createProfileMutation.mutate({
                      name: profileForm.name.trim(),
                      description: profileForm.description.trim() || undefined,
                    });
                  }}
                  disabled={createProfileMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createProfileMutation.isPending
                    ? "Criando..."
                    : "Criar escala"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {activeProfile?.name ?? "Clinica Selecionada"}
                </span>
                <Badge className="bg-green-100 text-green-800">
                  Escala ativa
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeProfile?.description?.trim() ||
                  "Perfil medico atualmente usado para gerar e editar a escala."}
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
              Cadastre logins adicionais para o sistema. Cada usuario pode entrar
              com seu proprio login e senha.
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
                    key={`${managedUser.userId}-${managedUser.username}`}
                    className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {managedUser.name || managedUser.username}
                        </span>
                        <Badge variant="outline">@{managedUser.username}</Badge>
                        <Badge className="bg-blue-100 text-blue-800">
                          {userRoleOptions.find(
                            (option) => option.value === managedUser.role
                          )?.label ?? managedUser.role}
                        </Badge>
                        <Badge
                          className={
                            managedUser.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {managedUser.active ? "Ativo" : "Inativo"}
                        </Badge>
                        {managedUser.isBuiltIn ? (
                          <Badge className="bg-amber-100 text-amber-800">
                            Padrao
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {managedUser.email || "Sem e-mail informado"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!managedUser.isBuiltIn ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={
                            deleteManagedUserMutation.isPending ||
                            setManagedUserActiveMutation.isPending
                          }
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Excluir o usuario ${managedUser.username}? Esta acao remove tambem a credencial local.`
                            );

                            if (!confirmed) return;

                            deleteManagedUserMutation.mutate({
                              userId: managedUser.userId,
                            });
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Apagar
                        </Button>
                      ) : null}
                      <Button
                        variant={managedUser.active ? "outline" : "secondary"}
                        size="sm"
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

              <div className="rounded-lg border p-3">
                <p className="font-medium">Adicionar usuario</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crie novos acessos para secretaria, coordenacao ou apenas consulta.
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input
                      className="mt-1 h-9"
                      value={userForm.name}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Nome do usuario"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">E-mail</Label>
                    <Input
                      className="mt-1 h-9"
                      value={userForm.email}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Login</Label>
                    <Input
                      className="mt-1 h-9"
                      value={userForm.username}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          username: event.target.value,
                        }))
                      }
                      placeholder="Ex: secretaria.ortopedia"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Senha</Label>
                    <Input
                      type="password"
                      className="mt-1 h-9"
                      value={userForm.password}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Minimo 6 caracteres"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Papel</Label>
                    <Select
                      value={userForm.role}
                      onValueChange={(value) =>
                        setUserForm((current) => ({
                          ...current,
                          role: value,
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1 h-9">
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
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (!userForm.name.trim()) {
                        toast.error("Informe o nome do usuario.");
                        return;
                      }

                      if (!userForm.username.trim()) {
                        toast.error("Informe o login do usuario.");
                        return;
                      }

                      if (userForm.password.trim().length < 6) {
                        toast.error("A senha deve ter pelo menos 6 caracteres.");
                        return;
                      }

                      createManagedUserMutation.mutate({
                        name: userForm.name.trim(),
                        email: userForm.email.trim(),
                        username: userForm.username.trim(),
                        password: userForm.password,
                        role: userForm.role as
                          | "admin"
                          | "coordinator"
                          | "viewer"
                          | "user",
                      });
                    }}
                    disabled={createManagedUserMutation.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {createManagedUserMutation.isPending
                      ? "Criando usuario..."
                      : "Criar usuario"}
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
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">Modo de cor</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Alterne entre o tema claro e escuro conforme sua preferencia.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {theme === "light" ? "Modo claro" : "Modo escuro"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className="gap-2"
                >
                  {theme === "light" ? (
                    <>
                      <Moon className="h-4 w-4" />
                      Ativar modo escuro
                    </>
                  ) : (
                    <>
                      <Sun className="h-4 w-4" />
                      Ativar modo claro
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Sobre o sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            <strong>Escala Inteligente - B2B SaaS</strong>
          </p>
          <p>
            Plataforma corporativa de gestão de escalas médicas. Plano atual: Premium Trial.
          </p>
          <p className="mt-2">Funcionalidades principais:</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li>Importacao de base ortopedica abril/maio 2026</li>
            <li>Feriados, excecoes e validacao de conflitos</li>
            <li>Gestao multi-perfil (Multi-tenant)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            Assinatura e Faturamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-orange-900">
                Plano Atual: Premium (Avaliação Gratuita)
              </p>
              <p className="mt-1 text-sm text-orange-800">
                Seu período de testes de 14 dias se encerra em breve. Assine agora para evitar bloqueios na geração de escalas.
              </p>
            </div>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => toast.success("Checkout redirecionando em breve...")}
            >
              Fazer Upgrade
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div className="rounded-lg border p-3">
              <span className="text-muted-foreground block mb-1">Próxima Fatura</span>
              <strong className="text-lg">R$ 499,00 / mês</strong>
              <div className="text-xs text-muted-foreground mt-1">Até 60 médicos gerenciados</div>
            </div>
            <div className="rounded-lg border p-3">
              <span className="text-muted-foreground block mb-1">Médicos Cadastrados</span>
              <strong className="text-lg">Uso Ilimitado</strong>
              <div className="text-xs text-muted-foreground mt-1">No plano Premium</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
