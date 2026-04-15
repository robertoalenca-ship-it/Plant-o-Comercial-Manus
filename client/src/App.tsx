import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ScheduleProfileProvider, useScheduleProfile } from "./contexts/ScheduleProfileContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Doctors from "./pages/Doctors";
import WeeklyRules from "./pages/WeeklyRules";
import WeekendRules from "./pages/WeekendRules";
import Exceptions from "./pages/Exceptions";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import InviteAccept from "./pages/InviteAccept";
import Home from "./pages/Home";
import LoginPage from "./pages/Login";
import UpgradePlan from "./pages/UpgradePlan";
import AdminPanel from "./pages/AdminPanel";
import Swaps from "./pages/Swaps";
import Attendance from "./pages/Attendance";
import Finance from "./pages/Finance";
import {
  APP_HOME_PATH,
  LEGACY_APP_ROUTE_REDIRECTS,
  appPath,
  isAppRoute,
  STAFF_HOME_PATH,
  staffPath,
  isStaffRoute,
  supportPath,
  isSupportRoute,
} from "./lib/appRoutes";
import StaffDashboard from "./pages/StaffDashboard";
import StaffLayout from "./components/StaffLayout";
import StaffSupportLayout from "./components/StaffSupportLayout";
import { useAuth } from "./_core/hooks/useAuth";
import {
  disableSupportMode,
  enableSupportMode,
  getSupportModeProfileId,
  isSupportModeEnabled,
} from "./lib/supportAccess";

const isMasterRole = (role: string | undefined) =>
  role === "staff" || role === "admin";

function OptionalAnalytics() {
  useEffect(() => {
    // @ts-ignore
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim();
    // @ts-ignore
    const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID?.trim();

    if (!endpoint || !websiteId) {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-app-analytics="umami"]'
    );

    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.defer = true;
    script.dataset.appAnalytics = "umami";
    script.dataset.websiteId = websiteId;
    script.src = `${endpoint.replace(/\/+$/, "")}/umami`;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}

function AppShell() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={APP_HOME_PATH} component={Dashboard} />
        <Route path={appPath("/calendar")} component={Calendar} />
        <Route path={appPath("/doctors")} component={Doctors} />
        <Route path={appPath("/weekly-rules")} component={WeeklyRules} />
        <Route path={appPath("/weekend-rules")} component={WeekendRules} />
        <Route path={appPath("/exceptions")} component={Exceptions} />
        <Route path={appPath("/reports")} component={Reports} />
        <Route path={appPath("/settings")} component={Settings} />
        <Route path={appPath("/upgrade")} component={UpgradePlan} />
        <Route path={appPath("/admin")} component={AdminPanel} />
        <Route path={appPath("/swaps")} component={Swaps} />
        <Route path={appPath("/attendance")} component={Attendance} />
        <Route path={appPath("/finance")} component={Finance} />
        <Route path={appPath("/404")} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}


function StaffShell() {
  return (
    <StaffLayout>
      <Switch>
        <Route path={STAFF_HOME_PATH} component={StaffDashboard} />
        <Route path={staffPath("/dashboard")} component={StaffDashboard} />
        <Route path={staffPath("/users")} component={StaffDashboard} />
        <Route path={staffPath("/analytics")} component={StaffDashboard} />
        <Route component={NotFound} />
      </Switch>
    </StaffLayout>
  );
}

function SupportShell() {
  return (
    <StaffSupportLayout>
      <Switch>
        <Route path={supportPath()} component={Dashboard} />
        <Route path={supportPath("/calendar")} component={Calendar} />
        <Route path={supportPath("/admin")} component={AdminPanel} />
        <Route path={supportPath("/swaps")} component={Swaps} />
        <Route path={supportPath("/attendance")} component={Attendance} />
        <Route path={supportPath("/finance")} component={Finance} />
        <Route path={supportPath("/settings")} component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </StaffSupportLayout>
  );
}

function LegacyRouteRedirect({ to }: { to: string }) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (location !== to) {
      setLocation(to);
    }
  }, [location, setLocation, to]);

  return null;
}

function Router() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const { activeProfileId, setActiveProfileId } = useScheduleProfile();
  const supportModeActive = isSupportModeEnabled();
  const supportModeProfileId = getSupportModeProfileId();

  useEffect(() => {
    if (location === "/" && !loading && isAuthenticated) {
      if (isMasterRole(user?.role)) {
        setLocation(STAFF_HOME_PATH);
      } else {
        setLocation(appPath());
      }
    }
  }, [location, loading, isAuthenticated, user?.role, setLocation]);

  const legacyTarget = LEGACY_APP_ROUTE_REDIRECTS[location];
  if (legacyTarget) {
    return <LegacyRouteRedirect to={legacyTarget} />;
  }

  // REDIRECT GUARDS FOR MASTER (STAFF)
  if (user?.role === "staff") {
    const effectiveSupportProfileId = activeProfileId ?? supportModeProfileId;
    const canAccessClientContext =
      supportModeActive && Boolean(effectiveSupportProfileId);
    const legacySupportMatch = location.match(
      /^\/staff\/support\/(\d+)(?:\/([^/]+))?(?:\/.*)?$/
    );

    if (
      supportModeActive &&
      !activeProfileId &&
      supportModeProfileId &&
      isSupportRoute(location)
    ) {
      setActiveProfileId(supportModeProfileId);
      return null;
    }

    if (legacySupportMatch) {
      const profileId = Number.parseInt(legacySupportMatch[1] ?? "", 10);
      const rawSection = legacySupportMatch[2] ?? "";
      const sectionMap: Record<string, string> = {
        dashboard: "",
        home: "",
        calendar: "/calendar",
        admin: "/admin",
        doctors: "/admin",
        users: "/admin",
        settings: "/settings",
      };

      if (Number.isFinite(profileId) && profileId > 0) {
        const target = supportPath(sectionMap[rawSection] ?? "");

        if (
          effectiveSupportProfileId !== profileId ||
          location !== target ||
          !supportModeActive
        ) {
          setActiveProfileId(profileId);
          enableSupportMode(profileId);
          setLocation(target);
          return null;
        }
      }
    }

    if (isAppRoute(location)) {
      setLocation(
        canAccessClientContext
          ? supportPath(location.slice(APP_HOME_PATH.length))
          : STAFF_HOME_PATH
      );
      return null;
    }

    if (isSupportRoute(location) && !canAccessClientContext) {
      if (supportModeActive && !activeProfileId) {
        disableSupportMode();
      }
      setLocation(STAFF_HOME_PATH);
      return null;
    }

    if (!isStaffRoute(location) && !isSupportRoute(location)) {
      if (supportModeActive && !activeProfileId) {
        disableSupportMode();
      }
      setLocation(STAFF_HOME_PATH);
      return null;
    }
  }

  // REGULAR ROUTES
  if (location === "/") {
    return <Home />;
  }

  if (location === "/login") {
    return <LoginPage />;
  }

  if (location === appPath("/onboarding")) {
    return <Onboarding />;
  }

  if (location === "/invite-accept") {
    return <InviteAccept />;
  }

  if (isAppRoute(location)) {
    return <AppShell key="app-shell" />;
  }

  if (isStaffRoute(location)) {
    return <StaffShell key="staff-shell" />;
  }

  if (isSupportRoute(location)) {
    return <SupportShell key="support-shell" />;
  }

  return <NotFound />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <ScheduleProfileProvider>
          <TooltipProvider>
            <OptionalAnalytics />
            <Toaster />
            <Router />
          </TooltipProvider>
        </ScheduleProfileProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
