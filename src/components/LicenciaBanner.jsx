import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { performHeartbeat } from "@/lib/heartbeat";

const DISMISSED_KEY_PREFIX = "licencia_banner_dismissed_";

function isDismissed(key, hours) {
  const val = localStorage.getItem(DISMISSED_KEY_PREFIX + key);
  if (!val) return false;
  return (Date.now() - parseInt(val)) < hours * 3600000;
}

function dismiss(key) {
  localStorage.setItem(DISMISSED_KEY_PREFIX + key, Date.now().toString());
}

export default function LicenciaBanner() {
  const [lic, setLic] = useState(null);
  const [dismissed, setDismissed] = useState({});
  const navigate = useNavigate();

  const load = async () => {
    try {
      const list = await base44.entities.Licencia.list("-created_date", 1);
      setLic(list[0] || null);
    } catch {}
  };

  useEffect(() => {
    load();
    window.addEventListener("licencia-updated", load);
    return () => window.removeEventListener("licencia-updated", load);
  }, []);

  if (!lic || lic.status === "NOT_ACTIVATED") return null;

  const now = new Date();
  const platnostDo = lic.platnostDo ? new Date(lic.platnostDo) : null;
  const dniDoPlatnosti = platnostDo ? Math.ceil((platnostDo - now) / 86400000) : null;
  const offlineDni = lic.offlineDniPocet || 0;

  const handleSync = async () => {
    await performHeartbeat();
    load();
  };

  const BannerWrap = ({ bg, children }) => (
    <div
      className="w-full flex items-center justify-between px-6 animate-in slide-in-from-top-2 duration-300"
      style={{ background: bg, minHeight: 48, padding: "10px 24px" }}
    >
      {children}
    </div>
  );

  const Btn = ({ onClick, href, children }) => (
    <button
      onClick={onClick}
      className="ml-4 text-xs font-semibold border border-white/70 text-white rounded-md px-3 py-1 hover:bg-white/20 transition flex-shrink-0"
    >
      {children}
    </button>
  );

  const txt = (s) => <span className="text-sm text-white font-medium">{s}</span>;

  // Priority 1 — RESTRICTED
  if (lic.status === "RESTRICTED") {
    return (
      <BannerWrap bg="#dc2626">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔒</span>
          {txt("Obmedzený režim — licencia vyžaduje obnovenie. Nové záznamy nemožno pridávať.")}
        </div>
        <Btn onClick={() => navigate("/aktivacia")}>Aktivovať licenciu</Btn>
      </BannerWrap>
    );
  }

  // Priority 2 — REVOKED
  if (lic.status === "REVOKED") {
    return (
      <BannerWrap bg="#dc2626">
        <div className="flex items-center gap-2">
          <span className="text-lg">⛔</span>
          {txt("Vaša licencia bola pozastavená. Kontaktujte podporu.")}
        </div>
      </BannerWrap>
    );
  }

  // Priority 3 — OFFLINE > 14 dni
  if (offlineDni > 14) {
    return (
      <BannerWrap bg="#ea580c">
        <div className="flex items-center gap-2">
          <span className="text-lg">📡</span>
          {txt(`Aplikácia nie je pripojená k licenčnému serveru ${offlineDni} dní. Po ${30 - offlineDni} dňoch obmedzený režim.`)}
        </div>
        <Btn onClick={handleSync}>Synchronizovať teraz</Btn>
      </BannerWrap>
    );
  }

  // Priority 4 — OFFLINE 7-14 dní
  if (offlineDni >= 7) {
    const key = "offline_7_14";
    if (!dismissed[key] && !isDismissed(key, 24)) {
      return (
        <BannerWrap bg="#ca8a04">
          <div className="flex items-center gap-2">
            <span className="text-lg">📡</span>
            {txt(`${offlineDni} dní bez pripojenia. Skontrolujte internet.`)}
          </div>
          <div className="flex items-center gap-2">
            <Btn onClick={handleSync}>Synchronizovať teraz</Btn>
            <button
              onClick={() => { dismiss(key); setDismissed(d => ({ ...d, [key]: true })); }}
              className="text-white/70 hover:text-white ml-1"
            >✕</button>
          </div>
        </BannerWrap>
      );
    }
  }

  // Priority 5 — licencia končí < 30 dní
  if (dniDoPlatnosti !== null && dniDoPlatnosti < 30 && dniDoPlatnosti >= 0) {
    const key = "expiry_soon";
    if (!dismissed[key] && !isDismissed(key, 24 * 7)) {
      const dateStr = platnostDo.toLocaleDateString("sk-SK");
      return (
        <BannerWrap bg="#ca8a04">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏰</span>
            {txt(`Vaša licencia končí dňa ${dateStr} (zostáva ${dniDoPlatnosti} dní)`)}
          </div>
          <div className="flex items-center gap-2">
            <Btn onClick={() => window.open("https://matrikacloud.sk/cennik", "_blank")}>Predĺžiť licenciu</Btn>
            <button
              onClick={() => { dismiss(key); setDismissed(d => ({ ...d, [key]: true })); }}
              className="text-white/70 hover:text-white ml-1"
            >✕</button>
          </div>
        </BannerWrap>
      );
    }
  }

  // Priority 6 — TRIAL
  if (lic.status === "TRIAL") {
    const key = "trial";
    const dniTrialu = dniDoPlatnosti !== null ? dniDoPlatnosti : 30;
    if (!dismissed[key] && !isDismissed(key, 24)) {
      return (
        <BannerWrap bg="#2563eb">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔵</span>
            {txt(`Skúšobná verzia — zostáva ${dniTrialu} dní`)}
          </div>
          <div className="flex items-center gap-2">
            <Btn onClick={() => window.open("https://matrikacloud.sk/cennik", "_blank")}>Zakúpiť plnú licenciu</Btn>
            <button
              onClick={() => { dismiss(key); setDismissed(d => ({ ...d, [key]: true })); }}
              className="text-white/70 hover:text-white ml-1"
            >✕</button>
          </div>
        </BannerWrap>
      );
    }
  }

  return null;
}