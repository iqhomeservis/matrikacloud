import { X, Printer, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import SourceBadge from "./SourceBadge";

export default function ZaznamDetail({ record: r, onClose, onReprint }) {
  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString("sk-SK") : "—";
  const formatDateTime = (iso) => iso ? new Date(iso).toLocaleString("sk-SK") : "—";

  const row = (label, value) => (
    <div className="grid grid-cols-2 gap-2 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-800 font-medium">{value || "—"}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gov-blue font-mono">{r.poradoveCislo}</h2>
            <div className="flex items-center gap-2 mt-1">
              <SourceBadge source={r.zdrojUdajov} />
              <span className="text-xs text-slate-500">{formatDateTime(r.datumOverenia)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onReprint(r)} className="gap-1">
              <Printer className="w-4 h-4" /> Re-tlač
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Žiadateľ</h3>
            {row("Meno", `${r.ziadatelTitulPred || ""} ${r.ziadatelMeno} ${r.ziadatelPriezvisko} ${r.ziadatelTitulZa || ""}`.trim())}
            {row("Dátum narodenia", formatDate(r.datumNarodenia))}
            {row("Rodné číslo", r.rodneCislo ? "••••••/••••" : "—")}
            {row("Trvalý pobyt", [r.adresaUlica, r.adresaCislo, r.adresaPsc, r.adresaMesto, r.adresaStat].filter(Boolean).join(", "))}
          </section>

          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Doklad totožnosti</h3>
            {row("Typ dokladu", r.dokladTyp)}
            {row("Číslo dokladu", r.dokladCislo ? "••••••••" : "—")}
            {row("Platnosť do", formatDate(r.dokladPlatnostDo))}
            {row("Certifikát", r.podpisCertifikatuPlatny ? "✓ Platný" : "—")}
          </section>

          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Overenie</h3>
            {row("Typ overenia", r.typOverenia)}
            {r.typOverenia === "LISTINA" && row("Druh listiny", r.listinaDruh)}
            {r.typOverenia === "LISTINA" && row("Počet listov / strán", `${r.pocetListov || "—"} / ${r.pocetStran || "—"}`)}
            {row("Počet overení", r.pocetOvereni)}
            {row("Poplatok", r.oslobodenyOdPoplatku ? `0.00 € (oslobodený: ${r.dovodOslobodenia || "—"})` : `${r.poplatokEur?.toFixed(2)} €`)}
            {row("Overovateľ", r.overovatelMeno)}
          </section>

          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Integrita záznamu
            </h3>
            {row("Hash záznamu", r.hashZaznamu ? r.hashZaznamu.slice(0, 16) + "…" : "—")}
            {row("Predch. hash", r.predchadzajuciHash ? r.predchadzajuciHash.slice(0, 16) + "…" : "—")}
          </section>

          {r.poznamka && (
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Poznámka</h3>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{r.poznamka}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}