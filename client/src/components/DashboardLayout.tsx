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
import { getLoginUrl, isOAuthConfigured } from "@/const";
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
import { useIsMobile } from "@/hooks/useMobile";
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
  Settings,
  Stethoscope,
  Sun,
  Users,
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
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: CalendarDays, label: "Calendario", path: "/calendar" },
  { icon: Users, label: "Medicos", path: "/doctors" },
  { icon: ClipboardList, label: "Regras Semanais", path: "/weekly-rules" },
  { icon: Sun, label: "Finais de Semana", path: "/weekend-rules" },
  { icon: AlertTriangle, label: "Excecoes", path: "/exceptions" },
  { icon: BarChart3, label: "Relatorios", path: "/reports" },
  { icon: Settings, label: "Configuracoes", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const localLoginMutation = trpc.auth.localLogin.useMutation({
    onSuccess: async () => {
      setLoginError(null);
      await utils.auth.me.invalidate();
    },
    onError: (error) => {
      setLoginError(error.message);
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
      if (location !== "/onboarding") {
        setLocation("/onboarding");
      }
      return;
    }
    if (activeProfileId) return;
    const defaultProfile =
      profiles.find((profile) => profile.name === "Clínica Padrão") ?? profiles[0];
    if (!defaultProfile) return;
    setActiveProfileId(defaultProfile.id);
  }, [activeProfileId, profiles, profilesQuery.isLoading, profilesQuery.isSuccess, setActiveProfileId, user, location, setLocation]);


  if (loading || (user && profilesQuery.isLoading)) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    const loginUrl = getLoginUrl();
    const oauthConfigured = isOAuthConfigured();

    const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoginError(null);
      try {
        await localLoginMutation.mutateAsync({
          username,
          password,
        });
      } catch {
        // Error state is already handled by the mutation callback.
      }
    };

    return (
      <div className="app-login-screen flex min-h-screen items-center justify-center px-4 py-10 text-foreground">
        <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="app-showcase-card hidden lg:flex rounded-3xl text-white p-10 flex-col justify-end relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <AppBrand className="text-white" />
              <div className="space-y-3">
                <h2 className="text-4xl font-bold leading-tight text-white mb-4">
                  Gestão completa das suas escalas médicas
                </h2>
                <p className="max-w-xl text-base leading-6 text-white/80">
                  Organize plantões, gerencie sua equipe de onde estiver e não dependa mais de planilhas e grupos confusos no WhatsApp. Tudo automatizado para sua paz de espírito.
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
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl rounded-full" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl rounded-full" />
          </div>

          <div className="app-login-card bg-background w-full rounded-[2rem] border p-8 shadow-xl flex flex-col justify-center">
            <div className="mb-8 space-y-5">
              <AppBrand compact />
              <div className="space-y-2 lg:mt-4">
                <h2 className="text-3xl font-bold leading-none text-foreground tracking-tight">
                  Bem-vindo de volta
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Entre com suas credenciais para visualizar sua escala.
                </p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="username">
                  Login
                </label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  placeholder="Seu login"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Senha
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                />
              </div>
              {loginError ? (
                <p className="text-sm text-destructive">{loginError}</p>
              ) : null}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={localLoginMutation.isPending}
              >
                {localLoginMutation.isPending ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            {oauthConfigured && loginUrl ? (
              <div className="mt-6 border-t border-black/10 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    window.location.href = loginUrl;
                  }}
                >
                  Entrar com OAuth
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (!activeProfile) {
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
        activeProfileName={activeProfile.name}
        activeProfileId={activeProfile.id}
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
  const activeMenuItem = menuItems.find((item) => item.path === location);
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
            <div className="flex w-full items-start gap-3 transition-all">
              <button
                onClick={toggleSidebar}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="min-w-0 flex-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex w-full items-start justify-between rounded-xl border border-border/50 bg-accent/20 px-3 py-3 text-left transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <div className="min-w-0">
                          <AppBrand compact hideSubtitle />
                          <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-sidebar-foreground/60">
                            Escala ativa
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                            {activeProfileName}
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
                                  "Escala medica separada"}
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
                          refreshProfiles();
                          setLocation("/settings");
                        }}
                        className="cursor-pointer"
                      >
                        Gerenciar escalas
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item) => {
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

          <SidebarFooter className="p-3">
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

      <SidebarInset className="app-main-shell overflow-hidden bg-background">
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
        <main className="app-main-content flex-1 overflow-auto p-4 md:p-6 lg:p-8 rounded-tl-3xl border-t border-l border-border bg-card shadow-sm m-1 mr-0 mb-0 md:m-2 md:mr-0 md:mb-0">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
