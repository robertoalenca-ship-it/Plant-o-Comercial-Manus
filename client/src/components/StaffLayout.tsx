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
  useSidebar,
} from "@/components/ui/sidebar";
import { STAFF_HOME_PATH } from "@/lib/appRoutes";
import { Activity, Hospital, LogOut, PanelLeft, Shield } from "lucide-react";
import { CSSProperties, ReactNode, useRef, useState } from "react";
import { useLocation } from "wouter";
import AppBrand from "./AppBrand";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { ThemeToggle } from "./ThemeToggle";

const staffMenuItems = [
  {
    icon: Shield,
    label: "Geral",
    path: STAFF_HOME_PATH,
  },
  {
    icon: Hospital,
    label: "Clinicas e Unidades",
    path: "/staff/users",
  },
  {
    icon: Activity,
    label: "Saude do Sistema",
    path: "/staff/analytics",
  },
];

const isMasterRole = (role: string | undefined) =>
  role === "staff" || role === "admin";

export default function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarWidth] = useState(280);
  const { loading, user } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user || !isMasterRole(user.role)) {
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
      <StaffLayoutContent>{children}</StaffLayoutContent>
    </SidebarProvider>
  );
}

function StaffLayoutContent({
  children,
}: {
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const sidebarRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="app-sidebar border-r-0">
          <SidebarHeader className="border-b border-white/8 px-2 py-3">
            <div className="flex w-full flex-col gap-3 transition-all">
              <div className="flex w-full items-start gap-3">
                <button
                  onClick={toggleSidebar}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <PanelLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="flex w-full items-start justify-between rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-3 text-left">
                      <div className="min-w-0">
                        <AppBrand compact hideSubtitle />
                        <div className="mt-3 flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                          <Shield className="h-3 w-3" />
                          Painel Master
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {staffMenuItems.map((item) => {
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
            <div className="flex flex-col gap-2 px-1 group-data-[collapsible=icon]:items-center">
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
                      Dono do SaaS
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
        <main className="app-main-content flex-1 overflow-auto p-4 md:p-6 lg:p-8 rounded-tl-3xl border-t border-l border-border bg-card shadow-sm m-1 mr-0 mb-0 md:m-2 md:mr-0 md:mb-0 transition-colors duration-200 dark:bg-card/50 dark:border-border/50">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </SidebarInset>
    </>
  );
}
