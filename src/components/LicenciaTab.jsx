import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { performHeartbeat, getLicencia } from "@/lib/heartbeat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const APP_VERSION = "1.0.0";
const IS_DEV = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const FEATURES_MAP = [
  { key: "OVEROVANIA_LISTIN", label: "Overovanie listín" },
  { key: "OVEROVANIA_PODPISOV", label: "Overovanie podpisov" },
  { key: "TLAC_STITKOV", label: "Tlač štítkov" },
  { key: "AUDIT_LOG", label: "Audit log" },
  { key: "LOKALNE_ZALOHY", label: "Lokálne zálohy" },
  { key: "CLOUD_ZALOHY", label: "Cloud zálohy" },
  { key: "MESACNE_REPORTY", label: "Mesačné reporty" },
  { key: "SIETOVA_VERZIA", label: "Sieťová verzia" },
];

const EDITION_COLOR = { TRIAL: "bg-blue-100 text-blue-800", BASIC: "bg-slate-100 text-slate-700", STANDARD: "bg-green-100 text-green-800", PREMIUM: "bg-yellow-100 text-yellow-800" };
const STATUS_COLOR = { ACTIVE: "bg-green-100 text-green-800", TRIAL: "bg-blue-100 text-blue-800", RESTRICTED: "bg-red-100 text-red-800", REVOKED: "bg-red-100 text-red-800", OFFLINE_GRACE: "bg-orange-100 text-orange-800", NOT_ACTIVATED: "bg-slate-100 text-slate-600" };

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 2) return "práve teraz";
  if (diff < 60) return `pred ${Math.floor(diff)} min.`;
  if (diff < 1440) return `pred ${Math.floor(diff / 60)} hod.`;
  return `pred ${Math.floor(diff / 1440)} dňami`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sk-SK");
}

export default function LicenciaTab() {
  const [lic, setLic] = useState(null);
  const [heartbeats, setHeartbeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [resetStep, setResetStep] = useState(0);
  const [resetText, setResetText] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showEmailEdit, setShowEmailEdit] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const l = await getLicencia();
    setLic(l);
    if (l) {
      const hb = await base44.entities.HeartbeatLog.list("-cas", 20);
      setHeartbeats(hb);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    await performHeartbeat();
    await load();
    setSyncing(false);
    toast.success("Synchronizácia dokončená");
  };

  const handleExportDiag = async () => {
    const hb = await base44.entities.HeartbeatLog.list("-cas", 20);
    const diag = {
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      licencia: lic,
      heartbeats: hb,
    };
    const blob = new Blob([JSON.stringify(diag, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "diagnostika.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = async () => {
    if (resetText !== "RESETOVAŤ") return;
    await base44.entities.Licencia.update(lic.id, { status: "NOT_ACTIVATED" });
    navigate("/aktivacia");
  };

  // DEV helpers
  const devSimulate = async (patch) => {
    if (!lic) return;
    await base44.entities.Licencia.update(lic.id, patch);
    window.dispatchEvent(new CustomEvent("licencia-updated"));
    await load();
    toast.info("Simulácia aplikovaná");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Skopírované");
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gov-blue border-t-transparent rounded-full animate-spin" /></div>;

  if (!lic) return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
      <p className="text-slate-400 mb-4">Licencia nie je aktivovaná</p>
      <Button onClick={() => navigate("/aktivacia")} className="bg-gov-blue">Aktivovať licenciu</Button>
    </div>
  );

  const platnostDo = lic.platnostDo ? new Date(lic.platnostDo) : null;
  const dniDoPlatnosti = platnostDo ? Math.ceil((platnostDo - new Date()) / 86400000) : null;
  const isTrial = lic.status === "TRIAL";
  const trialProgress = isTrial && dniDoPlatnosti !== null ? Math.max(0, Math.min(100, (dniDoPlatnosti / 30) * 100)) : null;
  const feats = lic.aktivneFunkcie || [];

  const row = (label, value) => (
    <div className="grid grid-cols-2 gap-2 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Sekcia 1 — Stav licencie */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">🪪 Stav licencie</h2>
        <div>
          {row("License ID",
            <span className="flex items-center gap-2 font-mono text-xs">
              {lic.licenseId || "—"}
              {lic.licenseId && <button onClick={() => copyToClipboard(lic.licenseId)} className="text-slate-400 hover:text-slate-700">📋</button>}
            </span>
          )}
          {row("Edícia",
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${EDITION_COLOR[lic.edicia] || "bg-slate-100 text-slate-700"}`}>{lic.edicia}</span>
          )}
          {row("Stav",
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLOR[lic.status] || "bg-slate-100 text-slate-600"}`}>{lic.status}</span>
          )}
          {row("Platnosť do",
            <span>{formatDate(lic.platnostDo)} {dniDoPlatnosti !== null ? <span className="text-slate-400 text-xs">({dniDoPlatnosti} dní)</span> : ""}</span>
          )}
          {row("Podpora do", formatDate(lic.podporaDo))}
          {row("Posledné overenie", <span>{timeAgo(lic.posledneOverenie)} <span className="text-xs text-slate-400">{formatDate(lic.posledneOverenie)}</span></span>)}
          {row("Dni offline", lic.offlineDniPocet ?? 0)}
        </div>
        {isTrial && trialProgress !== null && (
          <div className="mt-4">
            <div className="text-xs text-slate-500 mb-1">Trial zostatok: {dniDoPlatnosti} / 30 dní</div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${trialProgress > 50 ? "bg-green-500" : trialProgress > 17 ? "bg-yellow-400" : "bg-red-500"}`}
                style={{ width: `${trialProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sekcia 2 — Aktivované funkcie */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">⚙️ Aktivované funkcie</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
              <th className="pb-2 text-left font-semibold">Funkcia</th>
              <th className="pb-2 text-center w-20 font-semibold">Stav</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES_MAP.map(f => {
              const enabled = feats.includes(f.key);
              return (
                <tr key={f.key} className="border-b border-slate-50">
                  <td className="py-2 text-slate-700">{f.label}</td>
                  <td className="py-2 text-center">
                    {enabled ? (
                      <span className="text-green-600 text-lg">✅</span>
                    ) : (
                      <span title="Dostupné vo vyšších edíciách" className="text-slate-300 text-lg cursor-help">❌</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sekcia 3 — HW a aplikácia */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">💻 Hardvér a aplikácia</h2>
        {row("Hardware ID",
          <span title={lic.hardwareFingerprint || "—"} className="font-mono text-xs cursor-help">
            {lic.hardwareFingerprint ? lic.hardwareFingerprint.slice(0, 16) + "…" : "—"}
          </span>
        )}
        {row("Hostname", lic.hostname || "—")}
        {row("OS", lic.osVersion || "—")}
        {row("Verzia aplikácie", APP_VERSION)}
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => toast.info("Pre prenos licencie kontaktujte podporu na support@matrikacloud.sk so svojím License ID.")}>
            📤 Preniesť licenciu na iný počítač
          </Button>
        </div>
      </div>

      {/* Sekcia 4 — Zákaznícke údaje */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">🏛️ Zákaznícke údaje</h2>
        {row("Obec", lic.obecNazov || "—")}
        {row("IČO", lic.obecIco || "—")}
        {row("Kontaktný email",
          showEmailEdit ? (
            <div className="flex gap-2">
              <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-7 text-xs" placeholder="email@obec.sk" />
              <Button size="sm" className="h-7 text-xs" onClick={async () => {
                await base44.entities.Licencia.update(lic.id, { kontaktEmail: newEmail });
                setShowEmailEdit(false); load(); toast.success("Email aktualizovaný");
              }}>Uložiť</Button>
            </div>
          ) : (
            <span className="flex items-center gap-2">{lic.kontaktEmail || "—"}
              <button onClick={() => { setNewEmail(lic.kontaktEmail || ""); setShowEmailEdit(true); }} className="text-xs text-blue-600 hover:underline">Aktualizovať</button>
            </span>
          )
        )}
      </div>

      {/* Sekcia 5 — Akcie */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">🛠️ Akcie</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Button onClick={handleSync} disabled={syncing} variant="outline" className="h-auto py-3 flex-col gap-1 text-xs">
            <span className="text-lg">{syncing ? "⏳" : "🔄"}</span>
            {syncing ? "Synchronizujem…" : "Synchronizovať teraz"}
          </Button>
          <Button onClick={() => toast.success("Máte najnovšiu verziu 1.0.0")} variant="outline" className="h-auto py-3 flex-col gap-1 text-xs">
            <span className="text-lg">📥</span> Skontrolovať aktualizácie
          </Button>
          <Button onClick={() => window.open("https://matrikacloud.sk/cennik", "_blank")} variant="outline" className="h-auto py-3 flex-col gap-1 text-xs">
            <span className="text-lg">💳</span> Predĺžiť licenciu
          </Button>
          <Button onClick={() => window.open(`mailto:support@matrikacloud.sk?subject=Podpora%20${lic.licenseId || ""}`, "_blank")} variant="outline" className="h-auto py-3 flex-col gap-1 text-xs">
            <span className="text-lg">❓</span> Kontaktovať podporu
          </Button>
          <Button onClick={handleExportDiag} variant="outline" className="h-auto py-3 flex-col gap-1 text-xs">
            <span className="text-lg">📊</span> Exportovať diagnostiku
          </Button>
        </div>
      </div>

      {/* Sekcia 6 — Pokročilé */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setAdvancedOpen(o => !o)}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition"
        >
          <h2 className="text-base font-bold text-slate-800">⚠️ Pokročilé</h2>
          <span className="text-slate-400 text-sm">{advancedOpen ? "▲ Skryť" : "▼ Zobraziť"}</span>
        </button>
        {advancedOpen && (
          <div className="px-6 pb-6 space-y-6 border-t border-slate-100">

            {/* Reset licencie */}
            <div className="mt-4">
              <h3 className="text-sm font-bold text-red-600 mb-2">🔓 Resetovať licenciu</h3>
              {resetStep === 0 && (
                <Button variant="destructive" size="sm" onClick={() => setResetStep(1)}>Resetovať licenciu…</Button>
              )}
              {resetStep === 1 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-red-700 font-semibold">⚠️ Toto je nenávratná akcia. Licencia bude deaktivovaná.</p>
                  <p className="text-sm text-red-600">Napíšte <strong>RESETOVAŤ</strong> pre potvrdenie:</p>
                  <Input value={resetText} onChange={e => setResetText(e.target.value)} className="h-9 border-red-300" placeholder="RESETOVAŤ" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setResetStep(0); setResetText(""); }}>Zrušiť</Button>
                    <Button variant="destructive" size="sm" disabled={resetText !== "RESETOVAŤ"} onClick={handleReset}>Potvrdiť reset</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Heartbeat log */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">📋 Heartbeat log (posledných 20)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="pb-1 text-left">Čas</th>
                      <th className="pb-1 text-left">Typ</th>
                      <th className="pb-1 text-left">Výsledok</th>
                      <th className="pb-1 text-right">Záznamy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heartbeats.length === 0 && (
                      <tr><td colSpan={4} className="py-3 text-center text-slate-300">Žiadne záznamy</td></tr>
                    )}
                    {heartbeats.map(h => (
                      <tr key={h.id} className="border-b border-slate-50">
                        <td className="py-1.5 font-mono">{h.cas ? new Date(h.cas).toLocaleString("sk-SK") : "—"}</td>
                        <td className="py-1.5">{h.typ}</td>
                        <td className="py-1.5">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${h.vysledok === "SUCCESS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {h.vysledok}
                          </span>
                        </td>
                        <td className="py-1.5 text-right">{h.pocetZaznamovVKnihe ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DEV mode */}
            {IS_DEV && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-yellow-800 mb-3">🧪 DEV MODE</h3>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => devSimulate({ offlineDniPocet: 30 })}>TEST: 30d offline</Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => devSimulate({ status: "RESTRICTED" })}>TEST: RESTRICTED</Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => devSimulate({ status: "ACTIVE", offlineDniPocet: 0 })}>TEST: Späť ACTIVE</Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => devSimulate({ status: "TRIAL", platnostDo: new Date(Date.now() + 5 * 86400000).toISOString() })}>TEST: TRIAL 5d</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}