import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Search, Download, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const AKCIA_COLORS = {
  CREATE: "bg-green-100 text-green-800",
  READ: "bg-blue-100 text-blue-800",
  UPDATE: "bg-amber-100 text-amber-800",
  EXPORT: "bg-purple-100 text-purple-800",
  RESTORE: "bg-orange-100 text-orange-800",
  LOGIN: "bg-slate-100 text-slate-800",
  LOGOUT: "bg-slate-100 text-slate-500",
  PRINT: "bg-cyan-100 text-cyan-800",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAkcia, setFilterAkcia] = useState("ALL");
  const [verifying, setVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.AuditLog.list("-casovaPecat", 1000);
    setLogs(data);
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || [l.pouzivatelMeno, l.refPoradoveCislo, l.popis, l.akcia]
      .join(" ").toLowerCase().includes(q);
    const matchAkcia = filterAkcia === "ALL" || l.akcia === filterAkcia;
    return matchSearch && matchAkcia;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const verifyIntegrity = async () => {
    setVerifying(true);
    setIntegrityResult(null);
    try {
      const records = await base44.entities.OverovaciaKniha.list("created_date", 9999);
      let ok = true;
      let brokenAt = null;

      for (let i = 1; i < records.length; i++) {
        const curr = records[i];
        const prev = records[i - 1];
        if (curr.predchadzajuciHash && prev.hashZaznamu && curr.predchadzajuciHash !== prev.hashZaznamu) {
          ok = false;
          brokenAt = curr.poradoveCislo;
          break;
        }
      }

      setIntegrityResult({ ok, brokenAt, count: records.length });
      if (ok) {
        toast.success(`Integrita reťazca overená — ${records.length} záznamov v poriadku`);
      } else {
        toast.error(`Porušená integrita pri zázname ${brokenAt}`);
      }
    } catch (e) {
      toast.error("Chyba pri overovaní integrity");
    }
    setVerifying(false);
  };

  const exportCSV = () => {
    const rows = [
      ["Čas", "Akcia", "Používateľ", "Ref. záznam", "Popis"],
      ...filtered.map(l => [
        new Date(l.casovaPecat).toLocaleString("sk-SK"),
        l.akcia, l.pouzivatelMeno || "", l.refPoradoveCislo || "", l.popis || "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit_log_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    toast.success("Audit log exportovaný");
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gov-blue flex items-center gap-2">
            <Shield className="w-6 h-6" /> Audit log
          </h1>
          <p className="text-sm text-slate-500">{filtered.length} záznamov (len pre čítanie)</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={verifyIntegrity}
            disabled={verifying}
            variant="outline"
            className="gap-2 border-gov-blue text-gov-blue hover:bg-blue-50"
          >
            <Shield className="w-4 h-4" />
            {verifying ? "Overujem…" : "Overiť integritu"}
          </Button>
          <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button onClick={load} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Integrity result */}
      {integrityResult && (
        <div className={`rounded-xl p-4 mb-4 flex items-center gap-3 border ${integrityResult.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          {integrityResult.ok ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <div>
            <div className={`font-bold text-sm ${integrityResult.ok ? "text-green-800" : "text-red-800"}`}>
              {integrityResult.ok ? "✓ Integrita reťazca je neporušená" : "⚠ Porušená integrita reťazca!"}
            </div>
            <div className={`text-xs ${integrityResult.ok ? "text-green-700" : "text-red-700"}`}>
              {integrityResult.ok
                ? `Všetkých ${integrityResult.count} záznamov je v poriadku`
                : `Reťazec porušený pri zázname ${integrityResult.brokenAt}`}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať..." className="pl-9 h-10" />
          </div>
          <Select value={filterAkcia} onValueChange={setFilterAkcia}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Typ akcie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Všetky akcie</SelectItem>
              {["CREATE", "READ", "UPDATE", "EXPORT", "RESTORE", "LOGIN", "LOGOUT", "PRINT"].map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Načítavam…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Čas</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Akcia</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase hidden sm:table-cell">Používateľ</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase hidden md:table-cell">Ref. záznam</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Popis</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((l, i) => (
                <tr key={l.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {new Date(l.casovaPecat).toLocaleString("sk-SK")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${AKCIA_COLORS[l.akcia] || "bg-slate-100 text-slate-700"}`}>
                      {l.akcia}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 hidden sm:table-cell">{l.pouzivatelMeno || "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gov-blue hidden md:table-cell">{l.refPoradoveCislo || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">{l.popis || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">Strana {page} z {totalPages}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Predošlá</Button>
            <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Nasledujúca →</Button>
          </div>
        </div>
      )}
    </div>
  );
}