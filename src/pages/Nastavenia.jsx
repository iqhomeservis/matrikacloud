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
import { nacitajAleboVytvorPPDNastavenia, formatujCisloPPD } from "@/lib/ppdUtils";
import LicenciaTab from "@/components/LicenciaTab";

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
  const [ppdNas, setPpdNas] = useState(null);
  const [ppdSaving, setPpdSaving] = useState(false);
  const [bridgeTest, setBridgeTest] = useState({ nfc: null, printer: null });
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("licencia");

  useEffect(() => { load(); loadPPD(); }, []);

  const loadPPD = async () => {
    const n = await nacitajAleboVytvorPPDNastavenia();
    setPpdNas(n);
  };

  const savePPD = async () => {
    if (!ppdNas) return;
    setPpdSaving(true);
    await base44.entities.PPDNastavenia.update(ppdNas.id, {
      aktualnePoradoveCislo: ppdNas.aktualnePoradoveCislo,
      formatCisla: ppdNas.formatCisla,
    });
    await loadPPD();
    setPpdSaving(false);
    toast.success("Číslovanie PPD uložené");
  };

  const load = async () => {
    const data = await base44.entities.Nastavenia.list();
    if (data.length > 0) {
      setForm(f => ({ ...f, ...data[0] }));
      setId(data[0].id);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/png','image/jpeg','image/svg+xml'].includes(file.type)) {
      toast.error('Akceptované formáty: PNG, JPG, SVG'); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo musí byť menšie ako 2 MB'); return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 300;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        set('logoObce', canvas.toDataURL('image/png'));
        toast.success('Logo nahrатé — kliknite Uložiť nastavenia');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

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
          <TabsTrigger value="licencia">🪪 O licencii</TabsTrigger>
          <TabsTrigger value="obecne">🏛️ Obecné nastavenia</TabsTrigger>
          <TabsTrigger value="skener">🖥️ Skener dokladov</TabsTrigger>
        </TabsList>

        <TabsContent value="licencia" className="mt-4">
          <LicenciaTab />
        </TabsContent>

        <TabsContent value="obecne" className="space-y-6 mt-4">

          {/* Identita obce */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            {section("Identita obce", "🖼️")}
            <div className="flex items-start gap-6 flex-wrap">
              <div className="flex flex-col items-center gap-2">
                {form.logoObce ? (
                  <img src={form.logoObce} alt="Logo obce" style={{ maxHeight: 120, maxWidth: 200, objectFit: 'contain' }} className="rounded border border-slate-200 p-2 bg-slate-50" />
                ) : (
                  <div className="w-40 h-28 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                    <span className="text-3xl">🏛️</span>
                    <span>Bez loga</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">📁 Nahrať logo</span>
                  </label>
                  {form.logoObce && (
                    <button onClick={() => set('logoObce', '')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 bg-red-50 text-xs font-medium text-red-600 hover:bg-red-100">❌ Odstrániť</button>
                  )}
                </div>
                <p className="text-xs text-slate-400 text-center">PNG, JPG, SVG · max 2 MB</p>
              </div>
              <div className="flex-1 min-w-48 space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Slogan / podnadpis (voliteľné)</Label>
                  <Input value={form.sloganObce || ''} onChange={e => set('sloganObce', e.target.value)} placeholder="Obecný úrad" className="h-10" />
                  <p className="text-xs text-slate-400 mt-1">Zobrazí sa pod názvom obce v dokumentoch</p>
                </div>
              </div>
            </div>
          </div>

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
                <Input type="number" step="0.10" min="0" max="999" value={form.poplatokListina} onChange={e => set("poplatokListina", parseFloat(e.target.value))} className="h-10 font-mono" />
                <p className="text-xs text-slate-400 mt-1">{(form.poplatokListina || 0).toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Poplatok — podpis (€)</Label>
                <Input type="number" step="0.10" min="0" max="999" value={form.poplatokPodpis} onChange={e => set("poplatokPodpis", parseFloat(e.target.value))} className="h-10 font-mono" />
                <p className="text-xs text-slate-400 mt-1">{(form.poplatokPodpis || 0).toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
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

          {/* Pokladničné doklady */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            {section("Pokladničné doklady (PPD)", "🧾")}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-800">
                <strong>Upozornenie:</strong> Číslovanie príjmových dokladov musí byť nepretržité.
                Ak ste vydávali doklady v papierovej forme (napr. PPD/2026/00001 až PPD/2026/00022),
                nastavte aktuálne číslo na <strong>23</strong> aby systém pokračoval od PPD/2026/00023.
              </p>
            </div>
            {ppdNas && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Formát čísla dokladu</Label>
                  <Input
                    value={ppdNas.formatCisla || "PPD/{ROK}/{NNNNN}"}
                    onChange={e => setPpdNas(n => ({ ...n, formatCisla: e.target.value }))}
                    className="h-10 font-mono"
                  />
                  <p className="text-xs text-slate-400 mt-1">Premenné: {'{ROK}'}, {'{MES}'}, {'{NNNNN}'}, {'{NNN}'}</p>
                  <p className="text-xs text-slate-400">Príklad: {formatujCisloPPD(ppdNas.formatCisla, ppdNas.aktualnePoradoveCislo, new Date().getFullYear(), new Date().getMonth() + 1)}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600 mb-1 block">Aktuálne poradové číslo</Label>
                  <Input
                    type="number"
                    min={1}
                    value={ppdNas.aktualnePoradoveCislo || 1}
                    onChange={e => setPpdNas(n => ({ ...n, aktualnePoradoveCislo: parseInt(e.target.value) }))}
                    className="h-10 font-mono w-40"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Upravte ak ste vydávali doklady v papierovej forme. Ďalší doklad dostane číslo{" "}
                    <strong className="text-slate-600">#{(ppdNas.aktualnePoradoveCislo || 1) + 1}</strong>.
                  </p>
                </div>
                {ppdNas.posledneVydaneCislo && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500">Posledný vydaný doklad:</p>
                    <p className="font-mono font-bold text-gov-blue">{ppdNas.posledneVydaneCislo}</p>
                  </div>
                )}
                <Button onClick={savePPD} disabled={ppdSaving} variant="outline" className="gap-2">
                  <Save className="w-4 h-4" /> {ppdSaving ? "Ukladám…" : "Uložiť číslovanie"}
                </Button>
              </div>
            )}
          </div>

          {/* O aplikácii */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            {section("O aplikácii", "ℹ️")}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {[
                ["Názov", "MatrikaCloud — Asistent overovania"],
                ["Verzia", "1.0.0-MVP"],
                ["Zákon", "Zákon č. 599/2001 Z. z."],
                ["Email podpory", <a href="mailto:support@matrikacloud.sk" className="text-blue-600 hover:underline">support@matrikacloud.sk</a>],
                ["Web", <a href="https://matrikacloud.sk" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">matrikacloud.sk</a>],
                ["Copyright", "© 2026 MatrikaCloud. Všetky práva vyhradené."],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-2 py-2 border-b border-slate-50">
                  <span className="text-slate-500 w-36 flex-shrink-0">{label}</span>
                  <span className="font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success("Máte najnovšiu verziu 1.0.0")}
                className="gap-2"
              >
                📥 Skontrolovať aktualizácie
              </Button>
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