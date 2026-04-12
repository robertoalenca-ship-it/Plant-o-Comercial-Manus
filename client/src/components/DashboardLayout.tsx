import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl, getSalesContactUrl } from "@/const";
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
import { useIsMobile } from "@/hooks/useMobile";
import { appPath, STAFF_HOME_PATH, isStaffRoute } from "@/lib/appRoutes";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Plus,
  Settings,
  Shield,
  Stethoscope,
  Sun,
  Users,
  Zap,
} from "lucide-react";
import {
  FormEvent,
  CSSProperties,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import AppBrand from "./AppBrand";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const menuItems = [
  { 
    icon: Shield, 
    label: "Painel Master (SaaS)", 
    path: STAFF_HOME_PATH,
    roles: ['staff', 'admin'] 
  },
  { icon: LayoutDashboard, label: "Dashboard", path: appPath() },
  { icon: CalendarDays, label: "Calendario", path: appPath("/calendar") },
  { icon: Users, label: "Equipe", path: appPath("/doctors") },
  {
    icon: ClipboardList,
    label: "Regras Semanais",
    path: appPath("/weekly-rules"),
  },
  { icon: Sun, label: "Finais de Semana", path: appPath("/weekend-rules") },
  { icon: AlertTriangle, label: "Excecoes", path: appPath("/exceptions") },
  { icon: BarChart3, label: "Relatorios", path: appPath("/reports") },
  { icon: Settings, label: "Configuracoes", path: appPath("/settings") },
  { 
    icon: Users, 
    label: "Equipe da Unidade", 
    path: appPath("/admin"),
    roles: ['staff', 'admin']
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

function normalizeAuthErrorMessage(rawMessage: string) {
  if (!rawMessage) {
    return "Não foi possível concluir a autenticação.";
  }

  try {
    const parsed = JSON.parse(rawMessage);
    const firstIssue = Array.isArray(parsed) ? parsed[0] : null;

    if (firstIssue && typeof firstIssue === "object") {
      const path = Array.isArray(firstIssue.path)
        ? String(firstIssue.path[0] ?? "")
        : "";
      const message =
        typeof firstIssue.message === "string" ? firstIssue.message : rawMessage;

      if (path === "email") {
        return "Informe um e-mail válido.";
      }

      if (path === "password") {
        return "Informe sua senha para continuar.";
      }

      if (path === "name") {
        return "Informe seu nome completo.";
      }

      return message;
    }
  } catch {
    // Preserve non-JSON error messages.
  }

  return rawMessage;
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return savedWidth ? Number.parseInt(savedWidth, 10) : DEFAULT_WIDTH;
  });
  const { activeProfileId, setActiveProfileId } = useScheduleProfile();
  const { loading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      setError(null);
      await utils.auth.me.invalidate();
    },
    onError: (error) => {
      setError(normalizeAuthErrorMessage(error.message));
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      setError(null);
      await utils.auth.me.invalidate();
    },
    onError: (error) => {
      setError(normalizeAuthErrorMessage(error.message));
    },
  });

  const profilesQuery = trpc.scheduleProfiles.list.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const profiles = useMemo(
    () =>
      (profilesQuery.data ?? []).filter(
        (profile) => !/enferm/i.test(profile.name)
      ),
    [profilesQuery.data]
  );
  const activeProfile = useMemo(
    () =>
      profiles.find((profile) => profile.id === activeProfileId) ??
      null,
    [activeProfileId, profiles]
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    if (!activeProfileId) return;
    if (profilesQuery.isLoading) return;
    if (activeProfile) return;
    setActiveProfileId(null);
  }, [
    activeProfile,
    activeProfileId,
    profilesQuery.isLoading,
    setActiveProfileId,
  ]);

  useEffect(() => {
    if (profilesQuery.isLoading) return;
    if (user && profilesQuery.isSuccess && profiles.length === 0) {
      if (user.role === "staff" || user.role === "admin") {
        if (location.startsWith(appPath())) setLocation(STAFF_HOME_PATH);
        return;
      }
      const onboardingPath = appPath("/onboarding");
      if (location !== onboardingPath) {
        setLocation(onboardingPath);
      }
      return;
    }
    if (activeProfileId || user?.role === "staff") return;
    const defaultProfile =
      profiles.find((profile) =>
        [
          "Clínica Padrão",
          "Clinica Padrao",
          "Equipe Padrão",
          "Equipe Padrao",
        ].includes(profile.name)
      ) ?? profiles[0];
    if (!defaultProfile) return;
    setActiveProfileId(defaultProfile.id);
  }, [activeProfileId, profiles, profilesQuery.isLoading, profilesQuery.isSuccess, setActiveProfileId, user, location, setLocation]);


  if (loading || (user && profilesQuery.isLoading)) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      try {
        if (isRegistering) {
          await registerMutation.mutateAsync({
            name,
            email,
            password,
          });
        } else {
          await loginMutation.mutateAsync({
            email,
            password,
          });
        }
      } catch {
        // Error state handled by mutation
      }
    };

    return (
      <div className="app-login-screen flex min-h-screen items-center justify-center px-4 py-10 text-foreground">
        <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="app-showcase-card hidden lg:flex rounded-3xl bg-premium-gradient text-white p-10 flex-col justify-end relative overflow-hidden shadow-xl">
            <div className="relative z-10 space-y-6">
              <AppBrand className="text-white" />
              <div className="space-y-3">
                <h2 className="mb-4 text-4xl font-bold leading-tight text-white">
                  Gestão completa das escalas da sua equipe
                </h2>
                <p className="max-w-xl text-base leading-6 text-white/80">
                  Organize plantões, gerencie sua equipe de onde estiver e não dependa mais de planilhas ou grupos confusos no WhatsApp. Tudo automatizado para a sua operação.
                </p>
              </div>
              <div className="grid gap-3 pt-4 md:grid-cols-3">
                <div className="bg-white/10 backdrop-blur border text-center font-semibold text-xs py-2 px-4 rounded-full border-white/20">
                  Transparente
                </div>
                <div className="bg-white/10 backdrop-blur border text-center font-semibold text-xs py-2 px-4 rounded-full border-white/20">
                  Preciso
                </div>
                <div className="bg-white/10 backdrop-blur border text-center font-semibold text-xs py-2 px-4 rounded-full border-white/20">
                  Rápido
                </div>
              </div>
            </div>
            {/* abstract background elements */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-50" />
          </div>

          <div className="app-login-card bg-background w-full rounded-[2rem] border p-8 shadow-xl flex flex-col justify-center">
            <div className="mb-8 space-y-5">
              <AppBrand compact />
              <div className="space-y-2 lg:mt-4">
                <h2 className="text-3xl font-bold leading-none text-foreground tracking-tight">
                  {isRegistering ? "Crie sua conta" : "Bem-vindo de volta"}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {isRegistering
                    ? "Comece a organizar suas escalas agora mesmo."
                    : "Entre com suas credenciais para visualizar sua escala."}
                </p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {isRegistering && (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="name">
                    Nome completo
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Seu nome"
                    className="h-12 border-slate-200 focus:border-[#14B8A6] focus:ring-[#14B8A6]/20 transition-all font-sans"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  E-mail institucional
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="exemplo@hospital.com"
                  className="h-12 border-slate-200 focus:border-[#14B8A6] focus:ring-[#14B8A6]/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" htmlFor="password">
                    Senha
                  </label>
                  <a href="#" className="text-xs text-[#14B8A6] hover:underline">Esqueci minha senha</a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-12 border-slate-200 focus:border-[#14B8A6] focus:ring-[#14B8A6]/20 transition-all"
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 bg-[#14B8A6] hover:bg-[#0D9488] shadow-md shadow-[#14B8A6]/20 transition-all font-semibold"
                disabled={loginMutation.isPending || registerMutation.isPending}
              >
                {loginMutation.isPending || registerMutation.isPending
                  ? "Processando..."
                  : isRegistering
                    ? "Criar minha conta"
                    : "Entrar no sistema"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError(null);
                }}
                className="text-sm text-[#14B8A6] hover:underline"
              >
                {isRegistering
                  ? "Já tem uma conta? Entre aqui"
                  : "Não tem uma conta? Cadastre-se grátis"}
              </button>
            </div>

            <div className="mt-8 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest">
                  <span className="bg-background px-4 text-muted-foreground font-medium">Ou conecte-se com</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Button variant="outline" className="h-12 border-slate-200 hover:bg-slate-50 transition-colors group" asChild>
                  <a href={getLoginUrl({ type: "signUp" }) ?? getSalesContactUrl() ?? "#"}>
                    <svg className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" aria-hidden="true" focusable="false" role="img" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                    Google
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeProfile && !isStaffRoute(location)) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      className="app-shell"
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent
        activeProfileName={activeProfile?.name ?? ""}
        activeProfileId={activeProfile?.id ?? 0}
        profiles={profiles}
        onSelectProfile={setActiveProfileId}
        refreshProfiles={() => profilesQuery.refetch()}
        setSidebarWidth={setSidebarWidth}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  activeProfileId: number;
  activeProfileName: string;
  children: ReactNode;
  onSelectProfile: (profileId: number | null) => void;
  profiles: Array<{ id: number; name: string; description: string | null }>;
  refreshProfiles: () => void;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  activeProfileId,
  activeProfileName,
  children,
  onSelectProfile,
  profiles,
  refreshProfiles,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const allMenuItems = useMemo(() => {
    const isStaff = isStaffRoute(location);

    return menuItems.filter((item) => {
      const isSaaSItem =
        item.roles?.includes("staff") || item.path === STAFF_HOME_PATH;

      // No modo Master (SaaS), mostrar apenas ferramentas Master
      if (isStaff) {
        return isSaaSItem;
      }

      // No modo Clínico (App), esconder ferramentas Master
      if (isSaaSItem) return false;

      // Só mostra ferramentas operacionais se tiver uma clínica selecionada (activeProfileId)
      return !!activeProfileId || item.path === appPath("/onboarding");
    });
  }, [user?.role, location, activeProfileId]);

  const activeMenuItem = allMenuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="app-sidebar border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="border-b border-white/8 px-2 py-3">
            <div className="flex w-full flex-col gap-3 transition-all">
              <div className="flex w-full items-start gap-3">
                <button
                  onClick={toggleSidebar}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Toggle navigation"
                >
                  <PanelLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex w-full items-start justify-between rounded-xl border border-border/50 bg-accent/20 px-3 py-3 text-left transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <div className="min-w-0">
                            <AppBrand compact hideSubtitle />
                            <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-sidebar-foreground/60">
                              Equipe ativa
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                              {activeProfileName || "Nenhuma selecionada"}
                            </p>
                          </div>
                          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-foreground/65" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        {profiles.map((profile) => (
                          <DropdownMenuItem
                            key={profile.id}
                            onClick={() => onSelectProfile(profile.id)}
                            className="cursor-pointer"
                          >
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {profile.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {profile.description?.trim() ||
                                    "Equipe/setor independente"}
                                </p>
                              </div>
                              {profile.id === activeProfileId ? (
                                <span className="text-xs text-primary">Ativa</span>
                              ) : null}
                            </div>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                          onClick={() => {
                            const canAdd = (user?.maxProfiles ?? 0) > (profiles.length ?? 0);
                            if (canAdd) {
                              setLocation(appPath("/onboarding"));
                            } else {
                              setLocation(appPath("/upgrade"));
                            }
                          }}
                          className="cursor-pointer text-primary bg-primary/5 hover:bg-primary/10 font-semibold"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar nova unidade
                          {user && (
                            <span className="ml-auto text-[10px] bg-primary/10 px-1.5 py-0.5 rounded text-primary/70">
                              {profiles.length}/{user.maxProfiles}
                            </span>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            refreshProfiles();
                            setLocation(appPath("/settings"));
                          }}
                          className="cursor-pointer border-t mt-1"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Gerenciar licenças
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
              
              {!isCollapsed && user?.role === "staff" && isStaffRoute(location) && (
                <div className="mx-2 rounded-lg bg-orange-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 flex items-center shadow-sm border border-orange-500/20">
                  <Shield className="mr-2 h-3.5 w-3.5" />
                  Painel Master SaaS
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {allMenuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 font-normal transition-all"
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 space-y-2">
            <div className="flex items-center justify-between px-1 group-data-[collapsible=icon]:justify-center">
              <ThemeToggle variant="ghost" size="icon" className="h-8 w-8" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group-data-[collapsible=icon]:justify-center flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 shrink-0 border">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="mt-1.5 truncate text-xs text-muted-foreground">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/20 ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="app-main-shell overflow-hidden bg-background flex flex-col">
        {user && !user.isPaid && (
          <div className="bg-amber-500/10 text-amber-600 px-4 py-2 text-sm flex items-center justify-between border-b border-amber-500/20 shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Você está na <strong>Versão de Teste</strong>. Algumas funcionalidades estão limitadas.</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-700"
              onClick={() => setLocation(appPath("/upgrade"))}
            >
              Fazer Upgrade
            </Button>
          </div>
        )}
        {isMobile && (
          <div className="app-mobile-header supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 flex h-14 items-center justify-between border-b px-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex flex-col gap-0.5">
                <span className="tracking-tight text-foreground">
                  {activeMenuItem?.label ?? "Menu"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {activeProfileName}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="app-main-content flex-1 overflow-auto p-4 md:p-6 lg:p-8 rounded-tl-3xl border-t border-l border-border bg-card shadow-sm m-1 mr-0 mb-0 mb-0 md:m-2 md:mr-0 md:mb-0 transition-colors duration-200 dark:bg-card/50 dark:border-border/50">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
