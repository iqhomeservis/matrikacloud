import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CreditCard, Printer, Save, X, RotateCcw, ChevronRight, Eye, EyeOff } from "lucide-react";
import NfcSimulator from "../components/NfcSimulator";
import SourceBadge from "../components/SourceBadge";
import { generateHash, encryptField, formatPoradoveCislo, formatDateSK } from "../lib/matrikaUtils";

const INITIAL_FORM = {
  typOverenia: "LISTINA",
  ziadatelMeno: "",
  ziadatelPriezvisko: "",
  ziadatelTitulPred: "",
  ziadatelTitulZa: "",
  rodneCislo: "",
  datumNarodenia: "",
  adresaUlica: "",
  adresaCislo: "",
  adresaMesto: "",
  adresaPsc: "",
  adresaStat: "SR",
  dokladTyp: "OP",
  dokladCislo: "",
  dokladPlatnostDo: "",
  zdrojUdajov: "MANUAL",
  listinaDruh: "",
  listinaJazyk: "SK",
  pocetListov: 1,
  pocetStran: 1,
  pocetOvereni: 1,
  podpisPredZamestnancom: true,
  poplatokEur: 2,
  oslobodenyOdPoplatku: false,
  dovodOslobodenia: "",
  poznamka: "",
  statnaPrislusnost: "SVK",
  podpisCertifikatuPlatny: false,
};

export default function NovyZaznam() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [source, setSource] = useState(null);
  const [nfcOpen, setNfcOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [rcVisible, setRcVisible] = useState(false);
  const [rcRaw, setRcRaw] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === "F2") { e.preventDefault(); setNfcOpen(true); }
      if (e.key === "F3") { e.preventDefault(); setForm(f => ({ ...f, typOverenia: f.typOverenia === "LISTINA" ? "PODPIS" : "LISTINA" })); }
      if (e.key === "F4") { e.preventDefault(); handlePrintAndSave(); }
      if (e.key === "F8") { e.preventDefault(); handleSaveOnly(); }
      if (e.key === "Escape") { e.preventDefault(); handleReset(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [form]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleNfcData = (data) => {
    setSource(data.source);
    const rc = data.rodneCislo || "";
    setRcRaw(rc);
    setForm(f => ({
      ...f,
      ziadatelMeno: data.meno || "",
      ziadatelPriezvisko: data.priezvisko || "",
      rodneCislo: rc,
      datumNarodenia: data.datumNarodenia || "",
      adresaUlica: data.adresaTrvalehoPobytu?.ulica || "",
      adresaCislo: data.adresaTrvalehoPobytu?.cislo || "",
      adresaMesto: data.adresaTrvalehoPobytu?.mesto || "",
      adresaPsc: data.adresaTrvalehoPobytu?.psc || "",
      dokladTyp: data.dokladTyp || "OP",
      dokladCislo: data.dokladCislo || "",
      dokladPlatnostDo: data.dokladPlatnostDo || "",
      zdrojUdajov: data.source,
      statnaPrislusnost: data.statnaPrislusnost || "SVK",
      podpisCertifikatuPlatny: data.podpisCertifikatuPlatny || false,
    }));
    toast.success("Doklad bol úspešne načítaný z čipu");
  };

  const buildRecord = async () => {
    const user = await base44.auth.me();
    const now = new Date().toISOString();
    
    // Get last record for hash chaining
    const lastRecords = await base44.entities.OverovaciaKniha.list("-created_date", 1);
    const predchadzajuciHash = lastRecords[0]?.hashZaznamu || "GENESIS";
    
    // Generate sequential number
    const year = new Date().getFullYear();
    const allThisYear = await base44.entities.OverovaciaKniha.filter({ }, "-created_date", 9999);
    const thisYear = allThisYear.filter(r => r.poradoveCislo?.includes(`/${year}/`));
    const seq = (thisYear.length + 1).toString().padStart(5, "0");
    const poradoveCislo = `O/${year}/${seq}`;

    const record = {
      ...form,
      poradoveCislo,
      datumOverenia: now,
      overovatelId: user.id,
      overovatelMeno: `${user.full_name || user.email}`,
      predchadzajuciHash,
    };

    // Compute hash
    const hashInput = `${poradoveCislo}|${form.ziadatelMeno}|${form.ziadatelPriezvisko}|${form.datumNarodenia}|${predchadzajuciHash}`;
    record.hashZaznamu = await generateHash(hashInput);

    return record;
  };

  const validateRequired = () => {
    const errs = {};
    if (!form.ziadatelMeno) errs.ziadatelMeno = true;
    if (!form.ziadatelPriezvisko) errs.ziadatelPriezvisko = true;
    if (!rcRaw) errs.rodneCislo = true;
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Vyplňte povinné polia");
      return false;
    }
    return true;
  };

  const handleSaveOnly = async () => {
    if (!validateRequired()) return;
    setSaving(true);
    const record = await buildRecord();
    const saved = await base44.entities.OverovaciaKniha.create(record);
    
    // Audit log
    await base44.entities.AuditLog.create({
      akcia: "CREATE",
      casovaPecat: new Date().toISOString(),
      refZaznamId: saved.id,
      refPoradoveCislo: saved.poradoveCislo,
      popis: `Vytvorený záznam ${saved.poradoveCislo}`,
    });

    setLastSaved(saved);
    setSaving(false);
    toast.success(`Záznam ${saved.poradoveCislo} uložený`);
    setForm(INITIAL_FORM);
    setSource(null);
  };

  const handlePrintAndSave = async () => {
    if (!validateRequired()) return;
    setPrinting(true);
    const record = await buildRecord();
    const saved = await base44.entities.OverovaciaKniha.create(record);

    // Audit log
    await base44.entities.AuditLog.create({
      akcia: "CREATE",
      casovaPecat: new Date().toISOString(),
      refZaznamId: saved.id,
      refPoradoveCislo: saved.poradoveCislo,
      popis: `Vytvorený záznam ${saved.poradoveCislo} + tlač štítkov`,
    });

    // Attempt bridge print
    try {
      const settings = await base44.entities.Nastavenia.list();
      const cfg = settings[0];
      const bridgeUrl = cfg?.bridgeUrl || "https://localhost:8443";
      const zpl = generateZPL(saved);
      await fetch(`${bridgeUrl}/api/printer/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Bridge-Token": cfg?.bridgeToken || "" },
        body: JSON.stringify({ zpl }),
      });
      toast.success(`Záznam ${saved.poradoveCislo} uložený a štítky vytlačené`);
    } catch {
      toast.warning(`Záznam ${saved.poradoveCislo} uložený — tlačiareň nedostupná (štítky možno dotlačiť neskôr)`);
    }

    setLastSaved(saved);
    setPrinting(false);
    setForm(INITIAL_FORM);
    setSource(null);
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setRcRaw("");
    setRcVisible(false);
    setFieldErrors({});
    setSource(null);
    toast.info("Formulár vymazaný");
  };

  const maskRC = (raw) => {
    const digits = raw.replace(/\//g, "");
    if (digits.length <= 6) return raw;
    return "XXXXXX/" + digits.slice(6);
  };

  const handleRcChange = (e) => {
    let val = e.target.value.replace(/[^0-9/]/g, "");
    // auto-insert slash after 6 digits
    const digitsOnly = val.replace(/\//g, "");
    if (digitsOnly.length === 6 && !val.includes("/")) val = val + "/";
    setRcRaw(val);
    set("rodneCislo", val);
    if (val) setFieldErrors(fe => ({ ...fe, rodneCislo: false }));
  };

  const fieldClass = (fromChip) =>
    fromChip && source
      ? source === "eID_NFC"
        ? "border-green-400 bg-green-50"
        : "border-blue-400 bg-blue-50"
      : "";

  return (
    <div className="min-h-full flex flex-col">
    <div className="p-4 max-w-7xl mx-auto flex-1 pb-6">
      {nfcOpen && <NfcSimulator onDataReceived={handleNfcData} onClose={() => setNfcOpen(false)} />}

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gov-blue">Nový záznam overenia</h1>
          <p className="text-sm text-slate-500">Zákon č. 599/2001 Z. z.</p>
        </div>
        <div className="flex gap-2">
          {/* Typ overenia toggle */}
          <div className="flex rounded-xl overflow-hidden border-2 border-gov-blue">
            {["LISTINA", "PODPIS"].map((t) => (
              <button
                key={t}
                onClick={() => set("typOverenia", t)}
                className={`px-4 py-2 text-sm font-bold transition-all ${
                  form.typOverenia === t ? "bg-gov-blue text-white" : "bg-white text-gov-blue hover:bg-blue-50"
                }`}
              >
                {t === "LISTINA" ? "📄 Listina" : "✍️ Podpis"} <span className="text-xs opacity-60">{t === "LISTINA" ? "(F3)" : ""}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: NFC + osobné údaje */}
        <div className="lg:col-span-2 space-y-4">
          {/* NFC button */}
          <button
            onClick={() => setNfcOpen(true)}
            className="w-full bg-gov-blue hover:bg-gov-blue/90 text-white rounded-2xl p-5 flex items-center gap-4 shadow-lg transition-all hover:shadow-xl active:scale-[0.99]"
          >
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-8 h-8" />
            </div>
            <div className="text-left">
              <div className="text-xl font-bold">NAČÍTAŤ DOKLAD</div>
              <div className="text-sm text-blue-200">Vložte OP alebo cestovný pas do skenera — F2</div>
            </div>
            {source && (
              <div className="ml-auto">
                <SourceBadge source={source} />
              </div>
            )}
          </button>

          {/* Osobné údaje */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Údaje žiadateľa
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Meno *</Label>
                <Input
                  value={form.ziadatelMeno}
                  onChange={e => { set("ziadatelMeno", e.target.value); if (e.target.value) setFieldErrors(fe => ({ ...fe, ziadatelMeno: false })); }}
                  className={`h-10 ${fieldClass(true)} ${fieldErrors.ziadatelMeno ? "border-red-400" : ""}`}
                  placeholder="Ján"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Priezvisko *</Label>
                <Input
                  value={form.ziadatelPriezvisko}
                  onChange={e => { set("ziadatelPriezvisko", e.target.value); if (e.target.value) setFieldErrors(fe => ({ ...fe, ziadatelPriezvisko: false })); }}
                  className={`h-10 ${fieldClass(true)} ${fieldErrors.ziadatelPriezvisko ? "border-red-400" : ""}`}
                  placeholder="Vzorný"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Titul pred</Label>
                <Input value={form.ziadatelTitulPred} onChange={e => set("ziadatelTitulPred", e.target.value)} className="h-10" placeholder="Ing." />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Titul za</Label>
                <Input value={form.ziadatelTitulZa} onChange={e => set("ziadatelTitulZa", e.target.value)} className="h-10" placeholder="PhD." />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Rodné číslo *</Label>
                <div className="relative">
                  <Input
                    value={rcVisible ? rcRaw : (document.activeElement === document.getElementById("rc-input") ? rcRaw : maskRC(rcRaw))}
                    id="rc-input"
                    onChange={handleRcChange}
                    onFocus={() => setRcVisible(true)}
                    onBlur={() => setRcVisible(false)}
                    className={`h-10 font-mono pr-9 ${fieldClass(true)} ${fieldErrors.rodneCislo ? "border-red-400" : ""}`}
                    placeholder="780314/1234"
                    maxLength={11}
                  />
                  <button
                    type="button"
                    onClick={() => setRcVisible(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {rcVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Dátum narodenia</Label>
                <Input
                  type="date"
                  value={form.datumNarodenia}
                  onChange={e => set("datumNarodenia", e.target.value)}
                  className={`h-10 ${fieldClass(true)}`}
                />
              </div>
            </div>

            {/* Adresa */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Trvalý pobyt</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Ulica</Label>
                  <Input value={form.adresaUlica} onChange={e => set("adresaUlica", e.target.value)} className={`h-10 ${fieldClass(true)}`} placeholder="Hlavná" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Číslo</Label>
                  <Input value={form.adresaCislo} onChange={e => set("adresaCislo", e.target.value)} className={`h-10 ${fieldClass(true)}`} placeholder="12" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Mesto</Label>
                  <Input value={form.adresaMesto} onChange={e => set("adresaMesto", e.target.value)} className={`h-10 ${fieldClass(true)}`} placeholder="Prešov" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">PSČ</Label>
                  <Input value={form.adresaPsc} onChange={e => set("adresaPsc", e.target.value)} className={`h-10 ${fieldClass(true)}`} placeholder="08001" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Štát</Label>
                  <Input value={form.adresaStat} onChange={e => set("adresaStat", e.target.value)} className="h-10" />
                </div>
              </div>
            </div>

            {/* Doklad */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Doklad totožnosti</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Typ dokladu</Label>
                  <Select value={form.dokladTyp} onValueChange={v => set("dokladTyp", v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OP">Občiansky preukaz</SelectItem>
                      <SelectItem value="PAS">Cestovný pas</SelectItem>
                      <SelectItem value="POVOLENIE_NA_POBYT">Povolenie na pobyt</SelectItem>
                      <SelectItem value="INE">Iný</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Číslo dokladu</Label>
                  <Input value={form.dokladCislo} onChange={e => set("dokladCislo", e.target.value)} className={`h-10 font-mono ${fieldClass(true)}`} placeholder="SK1234567" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Platnosť do</Label>
                  <Input type="date" value={form.dokladPlatnostDo} onChange={e => set("dokladPlatnostDo", e.target.value)} className={`h-10 ${fieldClass(true)}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Overenie + akcie */}
        <div className="space-y-4">
          {/* Typ listiny */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              {form.typOverenia === "LISTINA" ? "📄 Listina" : "✍️ Podpis"}
            </h2>
            {form.typOverenia === "LISTINA" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Druh listiny *</Label>
                  <Input
                    value={form.listinaDruh}
                    onChange={e => set("listinaDruh", e.target.value)}
                    placeholder="napr. Výpis z obchodného registra"
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Jazyk</Label>
                  <Input value={form.listinaJazyk} onChange={e => set("listinaJazyk", e.target.value)} className="h-10" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1 block">Počet listov</Label>
                    <Input type="number" min={1} value={form.pocetListov} onChange={e => set("pocetListov", parseInt(e.target.value))} className="h-10" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1 block">Počet strán</Label>
                    <Input type="number" min={1} value={form.pocetStran} onChange={e => set("pocetStran", parseInt(e.target.value))} className="h-10" />
                  </div>
                </div>
              </div>
            )}

            {form.typOverenia === "PODPIS" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="podpisPred"
                    checked={form.podpisPredZamestnancom}
                    onCheckedChange={v => set("podpisPredZamestnancom", v)}
                  />
                  <Label htmlFor="podpisPred" className="text-sm text-slate-700">
                    Podpis urobený pred zamestnancom
                  </Label>
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Počet overení</Label>
                <Input type="number" min={1} value={form.pocetOvereni} onChange={e => set("pocetOvereni", parseInt(e.target.value))} className="h-10" />
              </div>
            </div>
          </div>

          {/* Poplatok */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">💶 Poplatok</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Suma (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.poplatokEur}
                  onChange={e => set("poplatokEur", parseFloat(e.target.value))}
                  className="h-10 font-mono"
                  disabled={form.oslobodenyOdPoplatku}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="oslobodeny" checked={form.oslobodenyOdPoplatku} onCheckedChange={v => { set("oslobodenyOdPoplatku", v); if (v) set("poplatokEur", 0); }} />
                <Label htmlFor="oslobodeny" className="text-sm text-slate-700">Oslobodený od poplatku</Label>
              </div>
              {form.oslobodenyOdPoplatku && (
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Dôvod oslobodenia</Label>
                  <Input value={form.dovodOslobodenia} onChange={e => set("dovodOslobodenia", e.target.value)} className="h-10" />
                </div>
              )}
            </div>
          </div>

          {/* Poznámka */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <Label className="text-xs font-semibold text-slate-600 mb-1 block">Poznámka</Label>
            <Textarea value={form.poznamka} onChange={e => set("poznamka", e.target.value)} rows={2} className="resize-none" />
          </div>

          {/* Last saved */}
          {lastSaved && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
              <div className="font-bold text-green-800">✓ Naposledy uložené</div>
              <div className="text-green-700 font-mono">{lastSaved.poradoveCislo}</div>
              <div className="text-green-600 text-xs">{lastSaved.ziadatelMeno} {lastSaved.ziadatelPriezvisko}</div>
            </div>
          )}

          {/* Keyboard hint */}
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
            <div className="font-semibold text-slate-600 mb-2">Klávesové skratky</div>
            {[["F2", "Načítať doklad"], ["F3", "Prepnúť typ"], ["F4", "Tlačiť štítky"], ["F8", "Uložiť"], ["Esc", "Vymazať"]].map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono text-xs font-bold text-slate-700">{k}</kbd>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Sticky bottom action panel */}
    <div className="sticky bottom-0 z-[100] bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.1)] px-6 py-4 flex items-center justify-between">
      <div className="text-xs text-slate-500">
        {lastSaved && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <span className="font-bold text-green-800">✓ Uložené:</span>{" "}
            <span className="font-mono text-green-700">{lastSaved.poradoveCislo}</span>{" — "}
            <span className="text-green-600">{lastSaved.ziadatelMeno} {lastSaved.ziadatelPriezvisko}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleReset}
          disabled={printing || saving}
          className="border-2 border-slate-400 text-slate-600 bg-transparent rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50"
        >
          ✖ Zrušiť (Esc)
        </button>
        <button
          onClick={handleSaveOnly}
          disabled={printing || saving}
          className="bg-slate-500 hover:bg-slate-600 text-white rounded-lg px-6 py-2.5 text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> ULOŽIŤ BEZ TLAČE (F8)
        </button>
        <button
          onClick={handlePrintAndSave}
          disabled={printing || saving}
          className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-8 py-3 text-base font-bold transition disabled:opacity-50 flex items-center gap-2 shadow-lg"
        >
          <Printer className="w-5 h-5" /> 🖨️ TLAČIŤ ŠTÍTKY (F4)
        </button>
      </div>
    </div>
    </div>
  );
}

function generateZPL(record) {
  const adresa = `${record.adresaUlica} ${record.adresaCislo}, ${record.adresaPsc} ${record.adresaMesto}`;
  const datumFormatted = record.datumOverenia
    ? new Date(record.datumOverenia).toLocaleDateString("sk-SK")
    : "";
  return `^XA
^CI28
^PW560
^LL400
^FO20,20^A0N,24,24^FDOSVEDCENIE PRAVOSTI PODPISU^FS
^FO20,50^A0N,18,18^FDPodla § 5 zakona NR SR c. 599/2001 Z. z.^FS
^FO20,80^GB520,2,2^FS
^FO20,95^A0N,20,20^FDPoradove cislo: ${record.poradoveCislo}^FS
^FO20,120^A0N,20,20^FDDatum: ${datumFormatted}^FS
^FO20,155^A0N,18,18^FDMeno a priezvisko: ${record.ziadatelMeno} ${record.ziadatelPriezvisko}^FS
^FO20,180^A0N,18,18^FDDatum narodenia: ${record.datumNarodenia || ""}^FS
^FO20,205^A0N,16,16^FDTrvaly pobyt: ${adresa}^FS
^FO20,230^A0N,16,16^FDDruh a c. dokladu: ${record.dokladTyp}, ${record.dokladCislo || ""}^FS
^FO20,265^GB520,2,2^FS
^FO20,280^A0N,16,16^FDV ........................ dna ......................^FS
^FO20,315^A0N,16,16^FDpodpis a odtlacok uradnej peciatky^FS
^XZ`;
}