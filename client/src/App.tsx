import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ScheduleProfileProvider } from "./contexts/ScheduleProfileContext";
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

function Router() {
  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/doctors" component={Doctors} />
            <Route path="/weekly-rules" component={WeeklyRules} />
            <Route path="/weekend-rules" component={WeekendRules} />
            <Route path="/exceptions" component={Exceptions} />
            <Route path="/reports" component={Reports} />
            <Route path="/settings" component={Settings} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
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
