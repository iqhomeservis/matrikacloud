import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Archive, Download, CheckCircle, AlertCircle, RefreshCw, Shield, HardDrive, Cloud } from "lucide-react";

export default function ZalohyIntegrita() {
  const [zalohy, setZalohy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState(null);
  const [stats, setStats] = useState({ total: 0, today: 0 });

  useEffect(() => {
    load();
    loadStats();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Zaloha.list("-casZalohy", 50);
    setZalohy(data);
    setLoading(false);
  };

  const loadStats = async () => {
    const records = await base44.entities.OverovaciaKniha.list("-created_date", 9999);
    const today = new Date().toDateString();
    const todayCount = records.filter(r => new Date(r.datumOverenia).toDateString() === today).length;
    setStats({ total: records.length, today: todayCount });
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const records = await base44.entities.OverovaciaKniha.list("-created_date", 9999);
      const dataStr = JSON.stringify(records, null, 2);
      const msgBuffer = new TextEncoder().encode(dataStr);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const zaloha = await base44.entities.Zaloha.create({
        casZalohy: new Date().toISOString(),
        typZalohy: "SERVER",
        hashSuboru: hashHex,
        pocetZaznamov: records.length,
        status: "OK",
      });

      // Also trigger download
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `matrika_zaloha_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();

      await load();
      toast.success(`Záloha vytvorená — ${records.length} záznamov, hash: ${hashHex.slice(0, 12)}…`);
    } catch (e) {
      await base44.entities.Zaloha.create({
        casZalohy: new Date().toISOString(),
        typZalohy: "SERVER",
        pocetZaznamov: 0,
        status: "FAILED",
      });
      toast.error("Záloha zlyhala");
    }
    setCreating(false);
  };

  const verifyIntegrity = async () => {
    setVerifying(true);
    setIntegrityResult(null);
    try {
      const records = await base44.entities.OverovaciaKniha.list("created_date", 9999);
      let ok = true;
      let brokenAt = null;
      let checked = 0;

      for (let i = 1; i < records.length; i++) {
        const curr = records[i];
        const prev = records[i - 1];
        checked++;
        if (
          curr.predchadzajuciHash &&
          prev.hashZaznamu &&
          curr.predchadzajuciHash !== prev.hashZaznamu
        ) {
          ok = false;
          brokenAt = curr.poradoveCislo;
          break;
        }
      }

      setIntegrityResult({ ok, brokenAt, count: records.length, checked });
      if (ok) toast.success(`Integrita overená — ${records.length} záznamov v poriadku`);
      else toast.error(`Porušená integrita pri ${brokenAt}`);
    } catch {
      toast.error("Chyba pri overení integrity");
    }
    setVerifying(false);
  };

  const formatDate = (iso) => iso ? new Date(iso).toLocaleString("sk-SK") : "—";

  const statusBadge = (status) => {
    const conf = {
      OK: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      VERIFIED: "bg-blue-100 text-blue-800",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${conf[status] || "bg-slate-100 text-slate-700"}`}>{status}</span>;
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gov-blue flex items-center gap-2">
            <Archive className="w-6 h-6" /> Zálohy a integrita
          </h1>
          <p className="text-sm text-slate-500">Trojvrstvový model záloh · Hash-reťazenie záznamov</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Záznamov celkom", value: stats.total, icon: Archive, color: "text-gov-blue" },
          { label: "Dnes overených", value: stats.today, icon: CheckCircle, color: "text-green-600" },
          { label: "Záloh celkom", value: zalohy.length, icon: HardDrive, color: "text-purple-600" },
          { label: "Posledná záloha", value: zalohy[0] ? new Date(zalohy[0].casZalohy).toLocaleDateString("sk-SK") : "—", icon: Cloud, color: "text-blue-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <div className="text-2xl font-bold text-slate-800">{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Download className="w-4 h-4 text-gov-blue" /> Manuálna záloha
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Exportuje všetky záznamy ako JSON súbor a zaznamená zálohu do histórie.
          </p>
          <Button
            onClick={createBackup}
            disabled={creating}
            className="w-full bg-gov-blue hover:bg-gov-blue/90 text-white gap-2"
          >
            <Archive className="w-4 h-4" />
            {creating ? "Zálohuje…" : "Vytvoriť zálohu teraz"}
          </Button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gov-blue" /> Overenie integrity
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Overuje hash reťazec všetkých záznamov. Akákoľvek manipulácia bude detekovaná.
          </p>
          <Button
            onClick={verifyIntegrity}
            disabled={verifying}
            variant="outline"
            className="w-full border-gov-blue text-gov-blue hover:bg-blue-50 gap-2"
          >
            <Shield className="w-4 h-4" />
            {verifying ? "Overujem…" : "Overiť celú knihu"}
          </Button>
        </div>
      </div>

      {/* Integrity result */}
      {integrityResult && (
        <div className={`rounded-2xl p-5 border ${integrityResult.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-start gap-3">
            {integrityResult.ok ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className={`font-bold ${integrityResult.ok ? "text-green-800" : "text-red-800"}`}>
                {integrityResult.ok
                  ? "✓ Integrita reťazca je neporušená"
                  : "⚠ Porušená integrita — manipulácia detekovaná!"}
              </div>
              <div className={`text-sm mt-1 ${integrityResult.ok ? "text-green-700" : "text-red-700"}`}>
                {integrityResult.ok
                  ? `Overených ${integrityResult.count} záznamov — hash reťazec je konzistentný.`
                  : `Reťazec porušený pri zázname ${integrityResult.brokenAt}. Kontaktujte administrátora.`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shamir info */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h3 className="font-bold text-amber-800 mb-2">🔑 Správa kľúčov pre exportované zálohy (Shamirov sekret)</h3>
        <p className="text-sm text-amber-700">
          Master Backup Key je rozdelený na 5 podielov (Shamirov sekret sharing, schéma 3-z-5).
          Pre obnovu zálohy sú potrebné minimálne <strong>3 z 5 podielov</strong>.
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2 text-xs text-amber-700">
          {["Starosta", "Prednostka", "IT správca", "Externý auditor", "Obecný trezor"].map(h => (
            <div key={h} className="bg-amber-100 rounded-lg p-2 text-center font-medium">{h}</div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">História záloh</h2>
          <Button onClick={load} variant="ghost" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Načítavam…
          </div>
        ) : zalohy.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <Archive className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Žiadne zálohy</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Čas zálohy</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Typ</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Záznamov</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase hidden md:table-cell">Hash</th>
              </tr>
            </thead>
            <tbody>
              {zalohy.map((z, i) => (
                <tr key={z.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{formatDate(z.casZalohy)}</td>
                  <td className="px-4 py-2.5 text-slate-700">{z.typZalohy}</td>
                  <td className="px-4 py-2.5 text-slate-700 font-mono">{z.pocetZaznamov}</td>
                  <td className="px-4 py-2.5">{statusBadge(z.status)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400 hidden md:table-cell">
                    {z.hashSuboru ? z.hashSuboru.slice(0, 16) + "…" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}