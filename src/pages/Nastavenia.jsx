import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Wifi, Printer, CreditCard, TestTube } from "lucide-react";
import ScannerPluginManager from "@/components/ScannerPluginManager";

const DEFAULT_DOLOZKA_LISTINA = `Podľa § 7 zákona NR SR č. 599/2001 Z. z. osvedčujem, že táto odpis (kópia) súhlasí s predloženou listinou.
Listina obsahuje {pocetListov} listov a {pocetStran} strán.

Poradové číslo: {poradoveCislo}
Dátum: {datumOverenia}
Vybrané poplatky: {poplatok} €`;

const DEFAULT_DOLOZKA_PODPIS = `Podľa § 5 zákona NR SR č. 599/2001 Z. z. osvedčujem, že {meno} {priezvisko}, nar. {datumNarodenia}, trvale bytom {adresaPlna}, ktorého(ej) totožnosť som zistil(a) z {dokladTyp} č. {dokladCislo}, podpísal(a) túto listinu predo mnou vlastnou rukou.

Poradové číslo: {poradoveCislo}
Dátum: {datumOverenia}
Vybrané poplatky: {poplatok} €`;

export default function Nastavenia() {
  const [form, setForm] = useState({
    obecNazov: "",
    obecIco: "",
    adresaUradu: "",
    kraj: "",
    okres: "",
    overovatelMeno: "",
    overovatelFunkcia: "",
    poradoveCisloFormat: "O/{ROK}/{NNNNN}",
    rokAktualny: new Date().getFullYear(),
    sablonaDolozkyListina: "",
    sablonaDolozkyPodpis: "",
    poplatokListina: 2,
    poplatokPodpis: 2,
    bridgeUrl: "https://localhost:8443",
    bridgeToken: "",
    zvukovySignal: true,
  });
  const [id, setId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bridgeTest, setBridgeTest] = useState({ nfc: null, printer: null });
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("obecne");

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await base44.entities.Nastavenia.list();
    if (data.length > 0) {
      setForm(f => ({ ...f, ...data[0] }));
      setId(data[0].id);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    if (id) {
      await base44.entities.Nastavenia.update(id, form);
    } else {
      const created = await base44.entities.Nastavenia.create(form);
      setId(created.id);
    }
    setSaving(false);
    toast.success("Nastavenia uložené");
  };

  const testBridge = async () => {
    setTesting(true);
    setBridgeTest({ nfc: null, printer: null });
    try {
      await fetch(`${form.bridgeUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
      const nfcR = await fetch(`${form.bridgeUrl}/api/reader/status`, { signal: AbortSignal.timeout(3000) });
      const printerR = await fetch(`${form.bridgeUrl}/api/printer/status`, { signal: AbortSignal.timeout(3000) });
      setBridgeTest({ nfc: nfcR.ok ? "ok" : "chyba", printer: printerR.ok ? "ok" : "chyba" });
      toast.success("Bridge service dostupný");
    } catch {
      setBridgeTest({ nfc: "nedostupný", printer: "nedostupný" });
      toast.error("Bridge service nedostupný — skontrolujte MatrikaBridge.exe");
    }
    setTesting(false);
  };

  const section = (title, icon) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
      <div className="text-gov-blue">{icon}</div>
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
    </div>
  );

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gov-blue">Nastavenia</h1>
        {activeTab === "obecne" && (
          <Button onClick={handleSave} disabled={saving} className="bg-gov-blue hover:bg-gov-blue/90 text-white gap-2">
            <Save className="w-4 h-4" /> {saving ? "Ukladám…" : "Uložiť nastavenia"}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="obecne">🏛️ Obecné nastavenia</TabsTrigger>
          <TabsTrigger value="skener">🖥️ Skener dokladov</TabsTrigger>
        </TabsList>

        <TabsContent value="obecne" className="space-y-6 mt-4">
          {/* Obec */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            {section("Údaje obce a overovateľa", "🏛️")}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Názov obce / mesta *</Label>
                <Input value={form.obecNazov} onChange={e => set("obecNazov", e.target.value)} className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">IČO obce *</Label>
                <Input value={form.obecIco} onChange={e => set("obecIco", e.target.value)} className="h-10 font-mono" maxLength={8} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Adresa úradu</Label>
                <Input value={form.adresaUradu} onChange={e => set("adresaUradu", e.target.value)} className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Kraj</Label>
                <Input value={form.kraj} onChange={e => set("kraj", e.target.value)} className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Okres</Label>
                <Input value={form.okres} onChange={e => set("okres", e.target.value)} className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Meno overovateľa</Label>
                <Input value={form.overovatelMeno} onChange={e => set("overovatelMeno", e.target.value)} className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Funkcia overovateľa</Label>
                <Input value={form.overovatelFunkcia} onChange={e => set("overovatelFunkcia", e.target.value)} className="h-10" />
              </div>
            </div>
          </div>

          {/* Poradové čísla a poplatky */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            {section("Poradové čísla a poplatky", "🔢")}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Formát poradového čísla</Label>
                <Input value={form.poradoveCisloFormat} onChange={e => set("poradoveCisloFormat", e.target.value)} className="h-10 font-mono" />
                <p className="text-xs text-slate-400 mt-1">Premenné: {"{ROK}"}, {"{NNNNN}"}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Poplatok — listina (€)</Label>
                <Input type="number" step="0.01" value={form.poplatokListina} onChange={e => set("poplatokListina", parseFloat(e.target.value))} className="h-10 font-mono" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Poplatok — podpis (€)</Label>
                <Input type="number" step="0.01" value={form.poplatokPodpis} onChange={e => set("poplatokPodpis", parseFloat(e.target.value))} className="h-10 font-mono" />
              </div>
            </div>
          </div>

          {/* Šablóny doložiek */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            {section("Šablóny doložiek", "📝")}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-800">
                <strong>Upozornenie:</strong> Pred produkčným nasadením overte znenie doložky s aktuálnou vyhláškou MV SR č. 9/2009 Z. z.
                Dostupné premenné: <code className="bg-amber-100 px-1 rounded">{"{poradoveCislo}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{meno}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{datumNarodenia}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{dokladTyp}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{dokladCislo}"}</code>, <code className="bg-amber-100 px-1 rounded">{"{datum}"}</code>
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-slate-600">Doložka — osvedčenie listiny (§ 7)</Label>
                  <button type="button" onClick={() => set("sablonaDolozkyListina", DEFAULT_DOLOZKA_LISTINA)} className="text-xs text-blue-600 hover:underline">
                    ↩ Obnoviť na default znenie
                  </button>
                </div>
                <Textarea value={form.sablonaDolozkyListina} onChange={e => set("sablonaDolozkyListina", e.target.value)} rows={7} className="font-mono text-sm resize-none" placeholder={DEFAULT_DOLOZKA_LISTINA} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-slate-600">Doložka — osvedčenie podpisu (§ 5)</Label>
                  <button type="button" onClick={() => set("sablonaDolozkyPodpis", DEFAULT_DOLOZKA_PODPIS)} className="text-xs text-blue-600 hover:underline">
                    ↩ Obnoviť na default znenie
                  </button>
                </div>
                <Textarea value={form.sablonaDolozkyPodpis} onChange={e => set("sablonaDolozkyPodpis", e.target.value)} rows={8} className="font-mono text-sm resize-none" placeholder={DEFAULT_DOLOZKA_PODPIS} />
              </div>
            </div>
          </div>

          {/* Bridge service */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            {section("HW integrácia — Bridge Service", <Wifi className="w-4 h-4" />)}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">URL Bridge service</Label>
                <Input value={form.bridgeUrl} onChange={e => set("bridgeUrl", e.target.value)} className="h-10 font-mono" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Bridge token (autentifikácia)</Label>
                <Input type="password" value={form.bridgeToken} onChange={e => set("bridgeToken", e.target.value)} className="h-10 font-mono" />
              </div>
            </div>
            <Button onClick={testBridge} disabled={testing} variant="outline" className="gap-2">
              <TestTube className="w-4 h-4" />
              {testing ? "Testujem…" : "Otestovať spojenie s Bridge"}
            </Button>
            {(bridgeTest.nfc || bridgeTest.printer) && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className={`rounded-lg p-3 text-sm font-medium flex items-center gap-2 ${bridgeTest.nfc === "ok" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                  <CreditCard className="w-4 h-4" />
                  Skener dokladov: {bridgeTest.nfc}
                </div>
                <div className={`rounded-lg p-3 text-sm font-medium flex items-center gap-2 ${bridgeTest.printer === "ok" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                  <Printer className="w-4 h-4" />
                  Tlačiareň: {bridgeTest.printer}
                </div>
              </div>
            )}
            <div className="mt-4 bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-2">Špecifikácia Bridge API (pre MatrikaBridge.exe)</h3>
              <div className="space-y-1 font-mono text-xs text-slate-600">
                <div><span className="text-green-600 font-bold">GET</span>  /api/health — heartbeat</div>
                <div><span className="text-green-600 font-bold">GET</span>  /api/reader/status — stav skenera dokladov</div>
                <div><span className="text-blue-600 font-bold">POST</span> /api/reader/read — načítanie eID/pasu</div>
                <div><span className="text-green-600 font-bold">GET</span>  /api/printer/status — stav tlačiarne</div>
                <div><span className="text-blue-600 font-bold">POST</span> /api/printer/print — tlač ZPL II štítkov</div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="skener" className="mt-4">
          <ScannerPluginManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}