import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { generujPPDPdf } from "@/lib/ppdUtils";
import { RefreshCw, Eye, Printer, X } from "lucide-react";

export default function PPDEvidencia() {
  const [doklady, setDoklady] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stornoId, setStornoId] = useState(null);
  const [stornoDovod, setStornoDovod] = useState("");
  const [stornoLoading, setStornoLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.PPDDoklad.list("-datumVydania", 500);
    setDoklady(data);
    setLoading(false);
  };

  const openPdf = (doklad) => {
    const doc = generujPPDPdf(doklad);
    const blob = doc.output("blob");
    window.open(URL.createObjectURL(blob), "_blank");
  };

  const handleStorno = async () => {
    if (!stornoDovod.trim()) { toast.error("Dôvod storna je povinný"); return; }
    setStornoLoading(true);
    const orig = doklady.find(d => d.id === stornoId);
    if (!orig) return;

    const stornoCislo = `STORNO-${orig.cisloDokladu}`;

    // Mark original as STORNOVANÝ
    await base44.entities.PPDDoklad.update(stornoId, {
      stav: "STORNOVANY",
      stornoDoklad: stornoCislo,
      stornoDovodText: stornoDovod,
    });

    // Create storno document
    await base44.entities.PPDDoklad.create({
      ...orig,
      id: undefined,
      cisloDokladu: stornoCislo,
      suma: -(orig.suma || 0),
      slovom: `Mínus ${orig.slovom}`,
      stav: "VYDANY",
      jeStorno: true,
      stornoDovodText: stornoDovod,
      datumVydania: new Date().toISOString(),
    });

    toast.success("Storno doklad vystavený");
    setStornoId(null);
    setStornoDovod("");
    await load();
    setStornoLoading(false);
  };

  const stavBadge = (stav) => {
    if (stav === "STORNOVANY") return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">STORNOVANÝ</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">VYDANÝ</span>;
  };

  return (
    <div className="space-y-4">
      {/* Storno modal */}
      {stornoId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-red-700 mb-2">⚠️ Storno dokladu</h3>
            <p className="text-sm text-slate-600 mb-4">Zadajte dôvod storna. Pôvodný doklad bude označený ako STORNOVANÝ.</p>
            <Input
              value={stornoDovod}
              onChange={e => setStornoDovod(e.target.value)}
              placeholder="Dôvod storna (povinné)..."
              className="mb-4 h-10"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStornoId(null); setStornoDovod(""); }} className="flex-1">Zrušiť</Button>
              <Button
                variant="destructive"
                disabled={!stornoDovod.trim() || stornoLoading}
                onClick={handleStorno}
                className="flex-1"
              >
                {stornoLoading ? "Stornovanie…" : "Stornovať"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{doklady.length} dokladov celkom</p>
        <Button onClick={load} variant="ghost" size="sm"><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Načítavam…
          </div>
        ) : doklady.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <p className="text-sm">Žiadne doklady</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Číslo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Dátum</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Žiadateľ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Suma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden lg:table-cell">Záznam</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Stav</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {doklady.map((d, i) => (
                <tr key={d.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "" : "bg-slate-50/50"} ${d.jeStorno ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-gov-blue">{d.cisloDokladu}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    {d.datumVydania ? new Date(d.datumVydania).toLocaleDateString("sk-SK") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 hidden md:table-cell">{d.ziadatelMeno || "—"}</td>
                  <td className="px-4 py-2.5 font-mono font-medium">
                    <span className={d.suma < 0 ? "text-red-600" : "text-slate-800"}>
                      {(d.suma || 0).toFixed(2).replace(".", ",")} €
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400 hidden lg:table-cell">{d.poradoveCisloZaznamu || "—"}</td>
                  <td className="px-4 py-2.5">{stavBadge(d.stav)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Zobraziť PDF" onClick={() => openPdf(d)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Tlačiť znova" onClick={() => { const doc = generujPPDPdf(d); doc.autoPrint(); window.open(doc.output("bloburl"), "_blank"); }}>
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                      {d.stav === "VYDANY" && !d.jeStorno && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700" title="Stornovať" onClick={() => setStornoId(d.id)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
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