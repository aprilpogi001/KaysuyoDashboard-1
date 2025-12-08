import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Wrench, Shield, RefreshCw, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  enabledAt: string | null;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [isToggling, setIsToggling] = useState(false);

  const { data: maintenanceStatus, refetch: refetchStatus } = useQuery<MaintenanceStatus>({
    queryKey: ["maintenance-status-settings"],
    queryFn: async () => {
      const res = await fetch("/api/maintenance/status");
      return res.json();
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("settings_authenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsVerifying(true);

    try {
      const response = await fetch("/api/auth/verify-scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem("settings_authenticated", "true");
        sessionStorage.setItem("admin_password", password);
        toast({
          title: "Access Granted",
          description: "Welcome to Admin Settings!",
        });
      } else {
        setAuthError(data.error || "Invalid password");
      }
    } catch (error) {
      setAuthError("Connection error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggleMaintenance = async () => {
    setIsToggling(true);
    const savedPassword = sessionStorage.getItem("admin_password") || password;
    
    try {
      const endpoint = maintenanceStatus?.enabled ? "/api/maintenance/off" : "/api/maintenance/on";
      const body: any = { password: savedPassword };
      
      if (!maintenanceStatus?.enabled && maintenanceMessage.trim()) {
        body.message = maintenanceMessage;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: maintenanceStatus?.enabled ? "Maintenance Mode Disabled" : "Maintenance Mode Enabled",
          description: data.message,
        });
        refetchStatus();
        queryClient.invalidateQueries({ queryKey: ["maintenance-status"] });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to toggle maintenance mode",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Connection error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsToggling(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto mt-16">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Admin Access Required</CardTitle>
              <CardDescription>
                Enter the admin password to access settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuthenticate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Admin Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    data-testid="input-admin-password"
                  />
                </div>
                {authError && (
                  <p className="text-sm text-destructive">{authError}</p>
                )}
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isVerifying || !password}
                  data-testid="button-verify-admin"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Access Settings"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary flex items-center gap-3">
              <Settings className="w-8 h-8" />
              Admin Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage system settings and maintenance mode
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem("settings_authenticated");
              sessionStorage.removeItem("admin_password");
              setIsAuthenticated(false);
              setPassword("");
            }}
            data-testid="button-logout-admin"
          >
            Lock Settings
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Maintenance Mode
            </CardTitle>
            <CardDescription>
              Enable maintenance mode to temporarily disable the website for users. 
              Only the maintenance page will be shown when enabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-1">
                <p className="font-medium">
                  Status: {maintenanceStatus?.enabled ? (
                    <span className="text-orange-600">Maintenance Mode ON</span>
                  ) : (
                    <span className="text-green-600">Website is Live</span>
                  )}
                </p>
                {maintenanceStatus?.enabledAt && (
                  <p className="text-sm text-muted-foreground">
                    Enabled since: {new Date(maintenanceStatus.enabledAt).toLocaleString("en-PH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
              <Switch
                checked={maintenanceStatus?.enabled || false}
                onCheckedChange={handleToggleMaintenance}
                disabled={isToggling}
                data-testid="switch-maintenance-mode"
              />
            </div>

            {!maintenanceStatus?.enabled && (
              <div className="space-y-2">
                <Label htmlFor="maintenance-message">Custom Maintenance Message (Optional)</Label>
                <Textarea
                  id="maintenance-message"
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="We are currently performing scheduled maintenance. Please check back soon."
                  className="min-h-[100px]"
                  data-testid="textarea-maintenance-message"
                />
                <p className="text-xs text-muted-foreground">
                  This message will be displayed to users when maintenance mode is enabled.
                </p>
              </div>
            )}

            <Button
              onClick={handleToggleMaintenance}
              disabled={isToggling}
              variant={maintenanceStatus?.enabled ? "default" : "destructive"}
              className="w-full"
              data-testid="button-toggle-maintenance"
            >
              {isToggling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {maintenanceStatus?.enabled ? "Disabling..." : "Enabling..."}
                </>
              ) : maintenanceStatus?.enabled ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Disable Maintenance Mode
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Enable Maintenance Mode
                </>
              )}
            </Button>

            {maintenanceStatus?.enabled && maintenanceStatus?.message && (
              <div className="p-4 border rounded-lg bg-orange-50 border-orange-200">
                <p className="text-sm font-medium text-orange-800">Current Message:</p>
                <p className="text-sm text-orange-700 mt-1">{maintenanceStatus.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
