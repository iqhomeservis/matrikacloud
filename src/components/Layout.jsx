import { Outlet, Link, useLocation } from "react-router-dom";
import { BookOpen, PlusCircle, Settings, Shield, Archive, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import StatusBar from "./StatusBar";
import LicenciaBanner from "./LicenciaBanner";
import TamperError from "./TamperError";
import { performHeartbeat, shouldRunHeartbeat, checkOfflineStatus } from "@/lib/heartbeat";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const navItems = [
  { path: "/", label: "Nový záznam", icon: PlusCircle },
  { path: "/kniha", label: "Kniha záznamov", icon: BookOpen },
  { path: "/nastavenia", label: "Nastavenia", icon: Settings },
  { path: "/audit", label: "Audit log", icon: Shield },
  { path: "/zalohy", label: "Zálohy a integrita", icon: Archive },
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [licStatus, setLicStatus] = useState(null);
  const [tamperCode, setTamperCode] = useState(null);

  useEffect(() => {
    checkOfflineStatus();
    shouldRunHeartbeat().then(should => { if (should) performHeartbeat(); });

    const runAntiTamper = async () => {
      try {
        const [licList, nastavList] = await Promise.all([
          base44.entities.Licencia.list("-created_date", 1),
          base44.entities.Nastavenia.list("-created_date", 1),
        ]);
        const lic = licList[0];
        const nas = nastavList[0];

        if (!lic || lic.status === "NOT_ACTIVATED") return;

        // Kontrola 1 — IČO konzistencia
        if (lic.obecIco && nas?.obecIco && lic.obecIco !== nas.obecIco) {
          await base44.entities.HeartbeatLog.create({
            cas: new Date().toISOString(),
            typ: "ERROR",
            vysledok: "FAILED",
            chybaText: "ICO_MISMATCH",
          });
          setTamperCode("ICO_MISMATCH");
          return;
        }

        // Kontrola 2 — Časový skok
        if (lic.posledneOverenie) {
          const lastHb = new Date(lic.posledneOverenie).getTime();
          if (Date.now() < lastHb - 60000) { // tolerancia 1 min
            await base44.entities.HeartbeatLog.create({
              cas: new Date().toISOString(),
              typ: "ERROR",
              vysledok: "FAILED",
              chybaText: "TIME_TAMPERING",
            });
            const attempts = (lic.tamperingAttempts || 0) + 1;
            const patch = { tamperingAttempts: attempts };
            if (attempts >= 3) patch.status = "RESTRICTED";
            await base44.entities.Licencia.update(lic.id, patch);
            toast.error("Detekovaná zmena systémového času. Aplikácia to zaznamenala.");
            window.dispatchEvent(new CustomEvent("licencia-updated"));
          }
        }

        setLicStatus(lic.status);
      } catch {}
    };

    runAntiTamper();

    const loadLic = () => {
      base44.entities.Licencia.list("-created_date", 1)
        .then(list => { if (list[0]) setLicStatus(list[0].status); })
        .catch(() => {});
    };
    window.addEventListener("licencia-updated", loadLic);
    return () => window.removeEventListener("licencia-updated", loadLic);
  }, []);

  const isRestricted = licStatus === "RESTRICTED" || licStatus === "REVOKED";

  if (tamperCode) return <TamperError code={tamperCode} onReset={() => setTamperCode(null)} />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top header */}
      <header className="bg-gov-blue text-white shadow-lg z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1 rounded hover:bg-white/10 transition"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gov-gold rounded flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-gov-blue" />
              </div>
              <div>
                <div className="font-bold text-sm leading-tight">Digitálna matrika</div>
                <div className="text-xs text-blue-200 leading-tight">Asistent overovania</div>
              </div>
            </div>
          </div>
          <StatusBar />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav
          className={`
            fixed lg:static inset-y-0 left-0 z-40 w-56 bg-gov-dark text-white
            transform transition-transform duration-200 ease-in-out pt-14 lg:pt-0
            ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="p-2 space-y-0.5 mt-2">
            {navItems.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              const blocked = isRestricted && path === "/";
              if (blocked) {
                return (
                  <div
                    key={path}
                    title="Nový záznam nie je dostupný v obmedzenom režime"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-500 opacity-50 cursor-not-allowed select-none"
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </div>
                );
              }
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? "bg-gov-gold text-gov-blue"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Overlay for mobile */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <LicenciaBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}