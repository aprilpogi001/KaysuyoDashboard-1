import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MaintenancePage } from "@/components/MaintenancePage";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Attendance from "@/pages/attendance";
import Rules from "@/pages/rules";
import QrGenerator from "@/pages/qr-generator";
import Scanner from "@/pages/scanner";
import Settings from "@/pages/settings";
import About from "@/pages/about";

interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  enabledAt: string | null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/attendance/:grade" component={Attendance} />
      <Route path="/rules" component={Rules} />
      <Route path="/qr-generator" component={QrGenerator} />
      <Route path="/scanner" component={Scanner} />
      <Route path="/settings" component={Settings} />
      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { data: maintenanceStatus, isLoading } = useQuery<MaintenanceStatus>({
    queryKey: ["maintenance-status"],
    queryFn: async () => {
      const res = await fetch("/api/maintenance/status");
      if (!res.ok) throw new Error("Failed to fetch maintenance status");
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Check if current path is settings (allow access during maintenance)
  const isSettingsPage = window.location.pathname === "/settings";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  // Allow settings page to be accessed even during maintenance
  if (maintenanceStatus?.enabled && !isSettingsPage) {
    return (
      <MaintenancePage 
        message={maintenanceStatus.message}
        enabledAt={maintenanceStatus.enabledAt}
      />
    );
  }

  return (
    <>
      <Toaster />
      <Router />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
