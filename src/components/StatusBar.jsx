import { useState, useEffect } from "react";
import { Wifi, WifiOff, Printer, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function StatusBar() {
  const [online, setOnline] = useState(navigator.onLine);
  const [bridgeStatus, setBridgeStatus] = useState({ nfc: "unknown", printer: "unknown" });
  const [time, setTime] = useState(new Date());
  const [todayCount, setTodayCount] = useState(0);
  const [activePlugin, setActivePlugin] = useState(null);

  useEffect(() => { loadPlugin(); }, []);
  const loadPlugin = async () => {
    try {
      const plugins = await base44.entities.ScannerPlugin.filter({ aktivny: true }, "-vytvoreny", 10);
      const scanner = plugins.find(p => p.category !== "UNIVERSAL_ZPL_PRINTER");
      setActivePlugin(scanner || null);
    } catch { setActivePlugin(null); }
  };

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const timer = setInterval(() => setTime(new Date()), 30000);

    // Check bridge status periodically
    const checkBridge = async () => {
      try {
        const r = await fetch("https://localhost:8443/api/health", { signal: AbortSignal.timeout(2000) });
        if (r.ok) {
          setBridgeStatus({ nfc: "ok", printer: "ok" });
        }
      } catch {
        setBridgeStatus({ nfc: "offline", printer: "offline" });
      }
    };
    checkBridge();
    const bridgeTimer = setInterval(checkBridge, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(timer);
      clearInterval(bridgeTimer);
    };
  }, []);

  const dot = (status) => {
    if (status === "ok") return "bg-green-400";
    if (status === "offline") return "bg-red-400";
    return "bg-yellow-400";
  };

  const formatTime = (d) =>
    d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });

  const getScannerLabel = () => {
    const pid = activePlugin?.pluginId;
    if (!pid || pid === "manual") return null;
    if (pid === "twain-ocr") return { icon: "📷", label: "Skener" };
    if (pid === "pcsc-nfc") return { icon: "🆔", label: "Čítačka" };
    if (pid === "camera-ocr") return { icon: "📹", label: "Kamera" };
    return null;
  };

  const scannerLabel = getScannerLabel();

  return (
    <div className="flex items-center gap-4 text-xs text-blue-100">
      {/* Dynamický indikátor skenera */}
      {scannerLabel && (
        <div className="flex items-center gap-1.5" title="Skener dokladov">
          <span className={`w-2 h-2 rounded-full ${dot(bridgeStatus.nfc)}`} />
          <span>{scannerLabel.icon}</span>
          <span className="hidden sm:inline">{scannerLabel.label}</span>
        </div>
      )}

      {/* Printer */}
      <div className="flex items-center gap-1.5" title="Tlačiareň">
        <span className={`w-2 h-2 rounded-full ${dot(bridgeStatus.printer)}`} />
        <Printer className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Tlačiareň</span>
      </div>

      {/* Network */}
      <div className="flex items-center gap-1.5" title={online ? "Online" : "Offline"}>
        <span className={`w-2 h-2 rounded-full ${online ? "bg-green-400" : "bg-red-400"}`} />
        {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{online ? "Online" : "Offline"}</span>
      </div>

      {/* Clock */}
      <div className="flex items-center gap-1 font-mono">
        <Clock className="w-3.5 h-3.5" />
        {formatTime(time)}
      </div>
    </div>
  );
}