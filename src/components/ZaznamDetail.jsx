import { useState, useEffect } from "react";
import { X, Printer, Shield, Pencil, Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import SourceBadge from "./SourceBadge";

export default function ZaznamDetail({ record: initialRecord, onClose, onReprint }) {
  const [r, setR] = useState(initialRecord);
  const [editCislo, setEditCislo] = useState(false);
  const [newCislo, setNewCislo] = useState("");
  const [cisloError, setCisloError] = useState("");
  const [cisloReason, setCisloReason] = useState("");
  const [savingCislo, setSavingCislo] = useState(false);

  const [ppdDoklad, setPpdDoklad] = useState(null);
  const [editPpd, setEditPpd] = useState(false);
  const [newPpd, setNewPpd] = useState("");
  const [ppdError, setPpdError] = useState("");
  const [ppdReason, setPpdReason] = useState("");
  const [savingPpd, setSavingPpd] = useState(false);

  useEffect(() => {
    base44.entities.PPDDoklad.filter({ zaznamId: r.id }).then(list => {
      const found = list.find(d => !d.jeStorno && d.stav === "VYDANY");
      if (found) setPpdDoklad(found);
    });
  }, [r.id]);

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString("sk-SK") : "—";
  const formatDateTime = (iso) => iso ? new Date(iso).toLocaleString("sk-SK") : "—";

  const row = (label, value) => (
    <div className="grid grid-cols-2 gap-2 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-800 font-medium">{value || "—"}</span>
    </div>
  );

  const handleSaveCislo = async () => {
    if (!newCislo.trim()) { setCisloError("Číslo je povinné"); return; }
    if (cisloReason.trim().length < 10) { setCisloError("Dôvod musí mať aspoň 10 znakov"); return; }
    setSavingCislo(true);
    // Check duplicate
    const existing = await base44.entities.OverovaciaKniha.filter({ poradoveCislo: newCislo.trim() });
    if (existing.some(x => x.id !== r.id)) {
      setCisloError("Toto číslo je už použité");
      setSavingCislo(false);
      return;
    }
    const oldCislo = r.poradoveCislo;
    await base44.entities.OverovaciaKniha.update(r.id, { poradoveCislo: newCislo.trim() });
    await base44.entities.AuditLog.create({
      akcia: "UPDATE",
      casovaPecat: new Date().toISOString(),
      refZaznamId: r.id,
      refPoradoveCislo: newCislo.trim(),
      popis: `Zmena poradového čísla: PRED ${oldCislo} → PO ${newCislo.trim()} | Dôvod: ${cisloReason}`,
    });
    setR(prev => ({ ...prev, poradoveCislo: newCislo.trim() }));
    setEditCislo(false);
    setCisloError("");
    setCisloReason("");
    setSavingCislo(false);
    toast.success("Poradové číslo zmenené");
  };

  const handleSavePpd = async () => {
    if (!newPpd.trim()) { setPpdError("Číslo je povinné"); return; }
    if (ppdReason.trim().length < 10) { setPpdError("Dôvod musí mať aspoň 10 znakov"); return; }
    setSavingPpd(true);
    const existing = await base44.entities.PPDDoklad.filter({ cisloDokladu: newPpd.trim() });
    if (existing.some(x => x.id !== ppdDoklad?.id)) {
      setPpdError("Toto číslo PPD je už použité");
      setSavingPpd(false);
      return;
    }
    const oldPpd = ppdDoklad.cisloDokladu;
    await base44.entities.PPDDoklad.update(ppdDoklad.id, { cisloDokladu: newPpd.trim() });
    await base44.entities.AuditLog.create({
      akcia: "UPDATE",
      casovaPecat: new Date().toISOString(),
      refZaznamId: r.id,
      refPoradoveCislo: r.poradoveCislo,
      popis: `Zmena čísla PPD: PRED ${oldPpd} → PO ${newPpd.trim()} | Dôvod: ${ppdReason}`,
    });
    setPpdDoklad(prev => ({ ...prev, cisloDokladu: newPpd.trim() }));
    setEditPpd(false);
    setPpdError("");
    setPpdReason("");
    setSavingPpd(false);
    toast.success("Číslo PPD zmenené");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            {editCislo ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={newCislo}
                    onChange={e => { setNewCislo(e.target.value); setCisloError(""); }}
                    className="h-8 font-mono w-52 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveCislo} disabled={savingCislo} className="h-8 bg-gov-blue text-white">
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditCislo(false); setCisloError(""); }} className="h-8">
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Input
                  value={cisloReason}
                  onChange={e => setCisloReason(e.target.value)}
                  className="h-7 text-xs w-80"
                  placeholder="Dôvod úpravy čísla (min. 10 znakov)…"
                />
                {cisloError && <p className="text-xs text-red-600">{cisloError}</p>}
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 max-w-xs">
                  ⚠️ Manuálna zmena čísla. Uistite sa, že číslo nebolo použité v inom zázname.
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gov-blue font-mono">{r.poradoveCislo}</h2>
                <button
                  onClick={() => { setNewCislo(r.poradoveCislo); setEditCislo(true); }}
                  className="text-slate-400 hover:text-gov-blue transition"
                  title="Upraviť poradové číslo"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
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
          {/* PPD doklad sekcia */}
          {ppdDoklad && (
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🧾 Príjmový doklad (PPD)</h3>
              <div className="grid grid-cols-2 gap-2 py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Číslo dokladu</span>
                <span className="text-sm text-slate-800 font-medium">
                  {editPpd ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Input
                          value={newPpd}
                          onChange={e => { setNewPpd(e.target.value); setPpdError(""); }}
                          className="h-7 font-mono w-44 text-xs"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleSavePpd} disabled={savingPpd} className="h-7 bg-gov-blue text-white px-2">
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditPpd(false); setPpdError(""); }} className="h-7 px-2">
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                      <Input
                        value={ppdReason}
                        onChange={e => setPpdReason(e.target.value)}
                        className="h-6 text-xs w-64"
                        placeholder="Dôvod úpravy (min. 10 znakov)…"
                      />
                      {ppdError && <p className="text-xs text-red-600">{ppdError}</p>}
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        ⚠️ Uistite sa, že číslo nebolo použité v inom doklade.
                      </div>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2 font-mono">
                      {ppdDoklad.cisloDokladu}
                      <button onClick={() => { setNewPpd(ppdDoklad.cisloDokladu); setEditPpd(true); }} className="text-slate-400 hover:text-gov-blue transition" title="Upraviť číslo PPD">
                        <Pencil className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </span>
              </div>
              {row("Suma", ppdDoklad.oslobodenyOdPoplatku ? "Oslobodený" : `${(ppdDoklad.suma || 0).toFixed(2).replace(".", ",")} €`)}
              {row("Stav", ppdDoklad.stav)}
            </section>
          )}

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

          {r.skenovacieMetadata?.pluginId && (
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">📡 Zdroj údajov</h3>
              {row("Použitý skener", r.skenovacieMetadata.pluginNazov)}
              {row("Metóda", r.skenovacieMetadata.scanMethod)}
              {r.skenovacieMetadata.confidence != null && row("Spoľahlivosť", `${Math.round(r.skenovacieMetadata.confidence * 100)}%`)}
              {r.skenovacieMetadata.nfcVerified && row("NFC overenie", "✓ Čip bol overený")}
            </section>
          )}
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