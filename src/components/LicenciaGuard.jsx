import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Routes allowed even in RESTRICTED mode
const RESTRICTED_ALLOWED = ["/kniha", "/nastavenia"];

export default function LicenciaGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkLicense();
  }, [location.pathname]);

  const checkLicense = async () => {
    const licenses = await base44.entities.Licencia.list("-created_date", 1);

    if (licenses.length === 0 || licenses[0].status === "NOT_ACTIVATED") {
      navigate("/aktivacia", { replace: true });
      setChecking(false);
      return;
    }

    const lic = licenses[0];

    if (lic.status === "RESTRICTED") {
      if (!RESTRICTED_ALLOWED.some(p => location.pathname.startsWith(p))) {
        toast.warning("Funkcia nie je dostupná v obmedzenom režime");
        navigate("/kniha", { replace: true });
      }
    }

    setChecking(false);
  };

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gov-light">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-gov-blue rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Overujem licenciu…</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}