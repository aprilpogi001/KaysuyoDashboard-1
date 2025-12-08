import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useState, useRef } from "react";
import { CheckCircle, Camera, MessageSquare, Loader2, RefreshCw, AlertCircle, Lock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Scanner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scannedResult, setScannedResult] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["scanner-stats"],
    queryFn: async () => {
      const res = await apiFetch("/api/attendance/stats/today");
      return res.ok ? res.json() : { totalPresent: 0, totalLate: 0, totalAbsent: 0, totalScanned: 0 };
    },
    refetchInterval: 10000,
    enabled: isAuthenticated,
  });

  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("scanner_authenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
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
        sessionStorage.setItem("scanner_authenticated", "true");
        toast({
          title: "Access Granted",
          description: "Scanner is now unlocked. You can start scanning.",
        });
      } else {
        setAuthError(data.error || "Invalid password. Please try again.");
        setPassword("");
      }
    } catch (error) {
      setAuthError("Connection error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("scanner_authenticated");
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScannedResult(null);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    async function initCameras() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const cameraList = devices.map((d) => ({ 
            id: d.id, 
            label: d.label || `Camera ${d.id.slice(0, 8)}` 
          }));
          setCameras(cameraList);
          const backCamera = cameraList.find(c => 
            c.label.toLowerCase().includes('back') || 
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('environment')
          );
          setSelectedCamera(backCamera?.id || cameraList[0].id);
        } else {
          setCameras([]);
          setSelectedCamera("");
        }
      } catch (err) {
        console.error("Error getting cameras:", err);
        setCameras([]);
        setSelectedCamera("");
      }
    }
    
    initCameras();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isScanning && selectedCamera) {
      const switchCamera = async () => {
        try {
          if (scannerRef.current) {
            await scannerRef.current.stop().catch(() => {});
            scannerRef.current = null;
          }
          await new Promise(resolve => setTimeout(resolve, 300));
          startScanner();
        } catch (err) {
          console.error("Error switching camera:", err);
        }
      };
      switchCamera();
    }
  }, [selectedCamera]);

  async function stopScanner() {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
    }
    setIsScanning(false);
  }

  async function handleScanSuccess(decodedText: string) {
    try {
      await stopScanner();
      
      const data = JSON.parse(decodedText);
      setScannedResult(data);
      setIsProcessing(true);

      toast({
        title: "Processing...",
        description: `Recording attendance for ${data.n}`,
      });

      const response = await apiFetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData: decodedText }),
      });

      if (!response.ok) {
        throw new Error("Failed to record attendance");
      }

      const result = await response.json();

      toast({
        title: "Attendance Recorded!",
        description: `Welcome, ${result.student.name}`,
        variant: "default",
        className: "bg-green-600 text-white border-green-700",
      });

      refetchStats();
      queryClient.invalidateQueries({ queryKey: ["stats", "today"] });

      setTimeout(() => {
        toast({
          title: result.smsSent ? "SMS Sent" : "SMS Status",
          description: result.smsSent 
            ? `Parent notification sent to ${data.c}` 
            : "SMS sending requires API configuration.",
        });
      }, 1000);

    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to process QR code",
      });
      startScanner();
    } finally {
      setIsProcessing(false);
    }
  }

  async function startScanner() {
    setCameraError(null);
    setIsScanning(true);

    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (e) {
          console.log("Scanner stop error (ignored):", e);
        }
        scannerRef.current = null;
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      scannerRef.current = new Html5Qrcode("reader");
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      if (selectedCamera) {
        await scannerRef.current.start(
          selectedCamera,
          config,
          handleScanSuccess,
          () => {}
        );
      } else {
        await scannerRef.current.start(
          { facingMode: "environment" },
          config,
          handleScanSuccess,
          () => {}
        );
      }
    } catch (err: any) {
      console.error("Scanner start error:", err);
      setIsScanning(false);
      
      const errorStr = err.toString().toLowerCase();
      if (errorStr.includes("notallowederror") || errorStr.includes("permission")) {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings and refresh the page.");
      } else if (errorStr.includes("notfounderror") || errorStr.includes("no camera")) {
        setCameraError("No camera found. Please connect a camera device.");
      } else if (errorStr.includes("notreadableerror") || errorStr.includes("in use") || errorStr.includes("could not start")) {
        setCameraError("Camera is being used by another app. Please close other apps using the camera and try again.");
      } else if (errorStr.includes("overconstrained")) {
        try {
          await scannerRef.current?.start(
            { facingMode: "user" },
            { fps: 10, qrbox: { width: 200, height: 200 } },
            handleScanSuccess,
            () => {}
          );
          setIsScanning(true);
          return;
        } catch (fallbackErr) {
          setCameraError("Camera not compatible. Please try a different browser or device.");
        }
      } else {
        setCameraError(`Camera error: ${err.message || "Could not start camera. Please refresh and try again."}`);
      }
    }
  }

  function resetScanner() {
    setScannedResult(null);
    startScanner();
  }

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto space-y-6 md:space-y-8 pt-8">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-page-title">Scanner Protected</h1>
            <p className="text-sm md:text-base text-muted-foreground">Enter the admin password to access the attendance scanner.</p>
          </div>

          <Card className="border-2 border-primary/10 shadow-lg">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center justify-center gap-2 text-base">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Authentication Required
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAuthenticate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scanner-password">Admin Password</Label>
                  <Input
                    id="scanner-password"
                    type="password"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-center text-lg tracking-widest"
                    autoComplete="off"
                    data-testid="input-scanner-password"
                  />
                </div>
                
                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                    <p className="text-sm text-red-600">{authError}</p>
                  </div>
                )}
                
                <Button type="submit" className="w-full" size="lg" disabled={isVerifying} data-testid="button-unlock-scanner">
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" /> Unlock Scanner
                    </>
                  )}
                </Button>
              </form>
              
              <p className="text-xs text-muted-foreground text-center mt-4">
                Para sa mga authorized personnel lamang. Contact admin kung wala kang password.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-page-title">Attendance Scanner</h1>
          <p className="text-sm md:text-base text-muted-foreground">Scan student QR ID to record time-in and notify parents.</p>
        </div>

        <Card className="overflow-hidden border-2 border-primary/10 shadow-lg">
          <CardHeader className="bg-muted/30 border-b p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="w-5 h-5 text-primary" />
                {isScanning ? "Scanning Active..." : isProcessing ? "Processing..." : "Ready to Scan"}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="text-xs"
                data-testid="button-lock-scanner"
              >
                <Lock className="w-3 h-3 mr-1" /> Lock
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {cameraError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-700">{cameraError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => {
                    setCameraError(null);
                    Html5Qrcode.getCameras().then((devices) => {
                      if (devices && devices.length > 0) {
                        const cameraList = devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 8)}` }));
                        setCameras(cameraList);
                        setSelectedCamera(cameraList[0].id);
                      }
                    });
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </Button>
              </div>
            )}

            {!isScanning && !scannedResult && !isProcessing && !cameraError && (
              <div className="text-center py-8 md:py-12 space-y-4">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                </div>
                
                {cameras.length > 0 && (
                  <div className="max-w-xs mx-auto">
                    <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                      <SelectTrigger data-testid="select-camera">
                        <SelectValue placeholder="Select camera" />
                      </SelectTrigger>
                      <SelectContent>
                        {cameras.map((cam) => (
                          <SelectItem key={cam.id} value={cam.id}>
                            {cam.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Selected: {cameras.find(c => c.id === selectedCamera)?.label || "None"}
                    </p>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground">Camera permission is required to scan codes.</p>
                <Button onClick={startScanner} size="lg" className="font-bold" data-testid="button-start-camera">
                  Start Camera
                </Button>
              </div>
            )}

            {isScanning && (
              <div className="max-w-md mx-auto">
                <div id="reader" className="overflow-hidden rounded-lg border border-border"></div>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Point camera at the Student QR Code
                </p>
                <Button 
                  variant="outline" 
                  className="w-full mt-4" 
                  onClick={stopScanner}
                  data-testid="button-stop-camera"
                >
                  Stop Camera
                </Button>
              </div>
            )}

            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-muted-foreground">Recording attendance...</p>
              </div>
            )}

            {scannedResult && !isProcessing && (
              <div className="max-w-md mx-auto bg-green-50 border border-green-200 rounded-lg p-4 md:p-6 space-y-4 md:space-y-6 animate-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 md:w-8 md:h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-green-800">Attendance Recorded</h2>
                  <p className="text-green-700 font-medium">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="space-y-2 md:space-y-3 border-t border-green-200 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700/70">Student Name:</span>
                    <span className="font-bold text-green-900">{scannedResult.n}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700/70">Grade/Section:</span>
                    <span className="font-bold text-green-900">Grade {scannedResult.g} - {scannedResult.s}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-700/70">Parent Notified:</span>
                    <Badge variant="outline" className="bg-green-200 text-green-800 border-green-300 gap-1 text-xs">
                       <MessageSquare className="w-3 h-3" /> SMS Sent
                    </Badge>
                  </div>
                </div>

                <Button onClick={resetScanner} className="w-full bg-green-600 hover:bg-green-700 text-white" data-testid="button-scan-next">
                  <RefreshCw className="w-4 h-4 mr-2" /> Scan Next Student
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3 md:gap-4 text-center">
          <div className="p-3 md:p-4 rounded-lg bg-card border shadow-sm" data-testid="stat-scanned">
            <h3 className="font-bold text-xl md:text-2xl text-primary">{stats?.totalScanned || 0}</h3>
            <p className="text-[10px] md:text-xs text-muted-foreground">Scanned Today</p>
          </div>
          <div className="p-3 md:p-4 rounded-lg bg-card border shadow-sm" data-testid="stat-late">
            <h3 className="font-bold text-xl md:text-2xl text-yellow-600">{stats?.totalLate || 0}</h3>
            <p className="text-[10px] md:text-xs text-muted-foreground">Late Arrivals</p>
          </div>
          <div className="p-3 md:p-4 rounded-lg bg-card border shadow-sm" data-testid="stat-status">
            <h3 className="font-bold text-xl md:text-2xl text-green-600">Online</h3>
            <p className="text-[10px] md:text-xs text-muted-foreground">System Status</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
