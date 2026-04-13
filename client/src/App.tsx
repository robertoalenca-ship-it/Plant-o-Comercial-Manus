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
import UpgradePlan from "./pages/UpgradePlan";
import AdminPanel from "./pages/AdminPanel";
import {
  APP_HOME_PATH,
  LEGACY_APP_ROUTE_REDIRECTS,
  appPath,
  isAppRoute,
  STAFF_HOME_PATH,
  staffPath,
  isStaffRoute,
} from "./lib/appRoutes";
import StaffDashboard from "./pages/StaffDashboard";
import { useAuth } from "./_core/hooks/useAuth";

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
        <Route path={appPath("/404")} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}


function StaffShell() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={STAFF_HOME_PATH} component={StaffDashboard} />
        <Route path={staffPath("/dashboard")} component={StaffDashboard} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
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
  const { activeProfileId } = useScheduleProfile();

  useEffect(() => {
    if (location === "/" && !loading && isAuthenticated) {
      if (user?.role === "staff") {
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

  // CENTRALIZED MASTER/STAFF GUARDS
  if (user?.role === "staff") {
    // 1. Block Home path (Home component) for Staff, force to Master Panel
    if (location === "/") {
      return <Home />; // Let Home handle its own redirect if needed, but we prefer declarative here
    }

    // 2. Block Onboarding path for Staff
    if (location === appPath("/onboarding")) {
      setLocation(STAFF_HOME_PATH);
      return null;
    }

    // 3. Block any app route for Staff if no profile is active
    if (isAppRoute(location) && !activeProfileId && location !== appPath("/onboarding")) {
      setLocation(STAFF_HOME_PATH);
      return null;
    }
  }

  // REGULAR ROUTES
  if (location === "/") {
    return <Home />;
  }

  if (location === appPath("/onboarding")) {
    return <Onboarding />;
  }

  if (location === "/invite-accept") {
    return <InviteAccept />;
  }

  if (isAppRoute(location)) {
    return <AppShell />;
  }

  if (isStaffRoute(location)) {
    return <StaffShell />;
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
