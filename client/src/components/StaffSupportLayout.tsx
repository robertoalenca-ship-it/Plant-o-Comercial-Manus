import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
import { useIsMobile } from "@/hooks/useMobile";
import {
  STAFF_HOME_PATH,
  supportPath,
} from "@/lib/appRoutes";
import {
  disableSupportMode,
  enableSupportMode,
} from "@/lib/supportAccess";
import { trpc } from "@/lib/trpc";
import {
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Settings,
  Shield,
  Undo2,
  Users,
} from "lucide-react";
import {
  CSSProperties,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "wouter";
import AppBrand from "./AppBrand";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { ThemeToggle } from "./ThemeToggle";

const staffSupportMenuItems = [
  {
    icon: LayoutDashboard,
    label: "Resumo da Unidade",
    path: supportPath(),
  },
  {
    icon: CalendarDays,
    label: "Calendario da Unidade",
    path: supportPath("/calendar"),
  },
  {
    icon: Users,
    label: "Equipe da Unidade",
    path: supportPath("/admin"),
  },
  {
    icon: Settings,
    label: "Configuracoes da Unidade",
    path: supportPath("/settings"),
  },
];

const SIDEBAR_WIDTH_KEY = "staff-support-sidebar-width";
const DEFAULT_WIDTH = 280;

export default function StaffSupportLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return savedWidth ? Number.parseInt(savedWidth, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const profilesQuery = trpc.scheduleProfiles.list.useQuery(undefined, {
    enabled: user?.role === "staff",
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  if (loading || profilesQuery.isLoading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user || user.role !== "staff") {
    return <div className="flex h-screen items-center justify-center">Acesso negado.</div>;
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
      <StaffSupportLayoutContent
        profiles={profilesQuery.data ?? []}
        refreshProfiles={() => profilesQuery.refetch()}
      >
        {children}
      </StaffSupportLayoutContent>
    </SidebarProvider>
  );
}

function StaffSupportLayoutContent({
  children,
  profiles,
  refreshProfiles,
}: {
  children: ReactNode;
  profiles: Array<{ id: number; name: string; description: string | null }>;
  refreshProfiles: () => void;
}) {
  const { user, logout } = useAuth();
  const { activeProfileId, setActiveProfileId } = useScheduleProfile();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
    [activeProfileId, profiles]
  );

  const activeMenuItem = useMemo(
    () => staffSupportMenuItems.find((item) => item.path === location) ?? null,
    [location]
  );

  useEffect(() => {
    if (!activeProfileId || activeProfile) {
      return;
    }

    if (profiles.length === 0) {
      setActiveProfileId(null);
      disableSupportMode();
      setLocation(STAFF_HOME_PATH);
      return;
    }

    const fallbackProfile = profiles[0];
    setActiveProfileId(fallbackProfile.id);
    enableSupportMode(fallbackProfile.id);
  }, [
    activeProfile,
    activeProfileId,
    profiles,
    setActiveProfileId,
    setLocation,
  ]);

  const leaveSupportMode = () => {
    disableSupportMode();
    setActiveProfileId(null);
    setLocation(STAFF_HOME_PATH);
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="app-sidebar border-r-0">
          <SidebarHeader className="border-b border-white/8 px-2 py-3">
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
                      <button className="flex w-full items-start justify-between rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-3 text-left transition-colors hover:bg-orange-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <div className="min-w-0">
                          <AppBrand compact hideSubtitle />
                          <div className="mt-3 flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 w-fit">
                            <Shield className="h-3 w-3" />
                            Suporte SaaS
                          </div>
                          <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-sidebar-foreground/60">
                            Unidade em atendimento
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                            {activeProfile?.name || "Selecione uma unidade"}
                          </p>
                        </div>
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-foreground/65" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium text-foreground">
                          Escolha a unidade atendida
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Troque de clinica sem voltar ao operacional comum.
                        </p>
                      </div>
                      {profiles.map((profile) => (
                        <DropdownMenuItem
                          key={profile.id}
                          onClick={() => {
                            setActiveProfileId(profile.id);
                            enableSupportMode(profile.id);
                            refreshProfiles();
                            setLocation(supportPath());
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {profile.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {profile.description?.trim() || "Sem descricao"}
                              </p>
                            </div>
                            {profile.id === activeProfileId ? (
                              <span className="text-xs text-primary">Ativa</span>
                            ) : null}
                          </div>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        onClick={leaveSupportMode}
                        className="cursor-pointer border-t mt-1"
                      >
                        <Undo2 className="mr-2 h-4 w-4" />
                        Voltar ao painel master
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <div className="px-2 pt-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={leaveSupportMode}
              >
                <Shield className="mr-2 h-4 w-4" />
                Painel Master (SaaS)
              </Button>
              <p className="px-2 pt-3 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Ferramentas permitidas
              </p>
            </div>
            <SidebarMenu className="px-2 py-1">
              {staffSupportMenuItems.map((item) => {
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
                <button className="group-data-[collapsible=icon]:justify-center flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-accent/50">
                  <Avatar className="h-9 w-9 shrink-0 border">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase() || "M"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-none">
                      {user?.name || "Master"}
                    </p>
                    <p className="mt-1.5 truncate text-xs text-muted-foreground">
                      Administrador SaaS em suporte
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
      </div>

      <SidebarInset className="app-main-shell overflow-hidden bg-background flex flex-col">
        <div className="bg-sky-500/10 text-sky-700 px-4 py-2 text-sm flex items-center justify-between border-b border-sky-500/20 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>
              Modo suporte ativo em <strong>{activeProfile?.name || "unidade nao definida"}</strong>.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-800"
            onClick={leaveSupportMode}
          >
            <Undo2 className="h-3.5 w-3.5 mr-1" />
            Voltar ao painel master
          </Button>
        </div>
        {isMobile && (
          <div className="app-mobile-header supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 flex h-14 items-center justify-between border-b px-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex flex-col gap-0.5">
                <span className="tracking-tight text-foreground">
                  {activeMenuItem?.label ?? "Suporte"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {activeProfile?.name || "Sem unidade"}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="app-main-content flex-1 overflow-auto p-4 md:p-6 lg:p-8 rounded-tl-3xl border-t border-l border-border bg-card shadow-sm m-1 mr-0 mb-0 md:m-2 md:mr-0 md:mb-0 transition-colors duration-200 dark:bg-card/50 dark:border-border/50">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </SidebarInset>
    </>
  );
}
