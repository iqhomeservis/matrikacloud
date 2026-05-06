import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SEED_PLUGINS = [
  {
    pluginId: "manual",
    nazov: "Manuálne zadávanie",
    vendor: "MatrikaCloud built-in",
    verzia: "1.0",
    popis: "Pracovníčka prepisuje údaje manuálne. Vhodné pre malé obce s občasným overovaním.",
    category: "MANUAL",
    aktivny: true,
    capabilities: { nfc: false, ocr: false, mrz: false, uv: false, camera: false, autoDetect: false },
    typ: "BUILT_IN",
    ikona: "✍️",
    testovacieMockData: {},
    vytvoreny: new Date().toISOString(),
  },
  {
    pluginId: "twain-ocr",
    nazov: "Univerzálny TWAIN OCR skener",
    vendor: "Kompatibilný s Plustek, Avision, Canon...",
    verzia: "1.0",
    popis: "Optický skener dokumentov. Číta MRZ zo zadnej strany OP a adresu z prednej. Funguje s akýmkoľvek TWAIN-kompatibilným skenerom.",
    category: "UNIVERSAL_TWAIN_OCR",
    aktivny: false,
    capabilities: { nfc: false, ocr: true, mrz: true, uv: false, camera: false, autoDetect: true },
    typ: "EXTERNAL",
    ikona: "📷",
    testovacieMockData: {
      givenName: "Ján", surname: "Vzorný", dateOfBirth: "14.03.1978",
      personalNumber: "780314/1234", address: "Hlavná 12, 080 01 Prešov",
      documentNumber: "SK1234567", documentType: "OP", expiryDate: "01.05.2030",
      scanMethod: "OCR", confidence: 0.95,
    },
    vytvoreny: new Date().toISOString(),
  },
  {
    pluginId: "pcsc-nfc",
    nazov: "Univerzálny PC/SC čítačka čipov",
    vendor: "Kompatibilný s ACR, Omnikey, Axagon...",
    verzia: "1.0",
    popis: "Čítačka čipových kariet a NFC. Číta slovenské eID (nové OP od 2022) a biometrické pasy. Pre staré OP bez čipu použiť OCR skener.",
    category: "UNIVERSAL_PCSC_NFC",
    aktivny: false,
    capabilities: { nfc: true, ocr: false, mrz: true, uv: false, camera: false, autoDetect: true },
    typ: "EXTERNAL",
    ikona: "🆔",
    testovacieMockData: {
      givenName: "Ján", surname: "Vzorný", dateOfBirth: "14.03.1978",
      personalNumber: "780314/1234", address: "Hlavná 12, 080 01 Prešov",
      documentNumber: "SK1234567", documentType: "OP", expiryDate: "01.05.2030",
      scanMethod: "NFC", confidence: 1.0, nfcVerified: true,
    },
    vytvoreny: new Date().toISOString(),
  },
  {
    pluginId: "camera-ocr",
    nazov: "Kamera (notebook / USB webkamera)",
    vendor: "MatrikaCloud built-in",
    verzia: "1.0",
    popis: "Načíta doklad pomocou vstavanej kamery notebooku alebo USB webkamery. Žiadny ďalší HW. Vhodné pre malé obce s nízkou frekvenciou.",
    category: "UNIVERSAL_CAMERA",
    aktivny: false,
    capabilities: { nfc: false, ocr: true, mrz: true, uv: false, camera: true, autoDetect: false },
    typ: "BUILT_IN",
    ikona: "📹",
    testovacieMockData: {
      givenName: "Peter", surname: "Testovací", dateOfBirth: "20.07.1985",
      personalNumber: "850720/5678", address: "Nová 5, 040 01 Košice",
      documentNumber: "SK9876543", documentType: "OP", expiryDate: "15.08.2029",
      scanMethod: "CAMERA", confidence: 0.92,
    },
    vytvoreny: new Date().toISOString(),
  },
  {
    pluginId: "zpl-printer",
    nazov: "Univerzálna ZPL tlačiareň štítkov",
    vendor: "Kompatibilný so Zebra, TSC, GoDEX...",
    verzia: "1.0",
    popis: "Termotransferová tlačiareň štítkov. Funguje s akoukoľvek ZPL II kompatibilnou tlačiarňou. Povinná pre tlač štítkov.",
    category: "UNIVERSAL_ZPL_PRINTER",
    aktivny: true,
    capabilities: {},
    typ: "EXTERNAL",
    ikona: "🖨️",
    testovacieMockData: {},
    vytvoreny: new Date().toISOString(),
  },
];

const CAP_LABELS = [
  { key: "nfc", label: "🆔 NFC" },
  { key: "ocr", label: "📷 OCR" },
  { key: "mrz", label: "📝 MRZ" },
  { key: "camera", label: "📹 Kamera" },
  { key: "autoDetect", label: "🤖 Auto-detect" },
];

const HW_CATALOG = [
  { zariadenie: "Plustek S420", typ: "OCR skener", plugin: "TWAIN OCR", cena: "~€220" },
  { zariadenie: "ACR1281U-C1", typ: "NFC čítačka", plugin: "PC/SC NFC", cena: "~€60" },
  { zariadenie: "Axagon CRE-SMPC2", typ: "Čip čítačka", plugin: "PC/SC NFC", cena: "~€15" },
  { zariadenie: "Regula 7024-M11", typ: "Kombo", plugin: "Specialized", cena: "~€900" },
  { zariadenie: "Zebra ZD421t", typ: "Tlačiareň", plugin: "ZPL", cena: "~€340" },
  { zariadenie: "Zebra ZD230", typ: "Tlačiareň", plugin: "ZPL", cena: "~€180" },
  { zariadenie: "IPEVO V4K", typ: "Dok. kamera", plugin: "Camera", cena: "~€80" },
  { zariadenie: "Notebook kamera", typ: "Kamera", plugin: "Camera", cena: "€0" },
];

export default function ScannerPluginManager() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hwScanning, setHwScanning] = useState(false);
  const [hwResult, setHwResult] = useState(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => { initPlugins(); }, []);

  const initPlugins = async () => {
    setLoading(true);
    const existing = await base44.entities.ScannerPlugin.list("-vytvoreny", 50);
    if (existing.length === 0) {
      for (const p of SEED_PLUGINS) {
        await base44.entities.ScannerPlugin.create(p);
      }
      const fresh = await base44.entities.ScannerPlugin.list("-vytvoreny", 50);
      setPlugins(fresh);
    } else {
      setPlugins(existing);
    }
    setLoading(false);
  };

  const scannerPlugins = plugins.filter(p => p.category !== "UNIVERSAL_ZPL_PRINTER");
  const printerPlugins = plugins.filter(p => p.category === "UNIVERSAL_ZPL_PRINTER");
  const activePlugin = scannerPlugins.find(p => p.aktivny) || null;

  const handleActivate = async (plugin) => {
    if (!window.confirm("Zmena skenera ovplyvní načítavanie dokladov. Pokračovať?")) return;
    const toDeactivate = scannerPlugins.filter(p => p.aktivny && p.id !== plugin.id);
    for (const p of toDeactivate) {
      await base44.entities.ScannerPlugin.update(p.id, { aktivny: false });
    }
    await base44.entities.ScannerPlugin.update(plugin.id, { aktivny: true });
    toast.success(`Plugin "${plugin.nazov}" aktivovaný`);
    initPlugins();
  };

  const testConnection = async () => {
    setTesting(true);
    await new Promise(r => setTimeout(r, 1200));
    setTesting(false);
    if (!activePlugin || activePlugin.pluginId === "manual") {
      toast.info("Manuálny režim — HW skener nie je potrebný");
    } else {
      toast.error("Skener nepripojený (mock/demo režim)");
    }
  };

  const scanHw = async () => {
    setHwScanning(true);
    setHwResult(null);
    await new Promise(r => setTimeout(r, 2000));
    setHwScanning(false);
    setHwResult("basic");
  };

  const scanHwFull = async () => {
    setHwScanning(true);
    await new Promise(r => setTimeout(r, 1500));
    setHwScanning(false);
    setHwResult("full");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-gov-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allPlugins = [...scannerPlugins, ...printerPlugins];

  return (
    <div className="space-y-6">
      {/* Aktívny skener */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
          🖥️ Aktívny skener dokladov
        </h2>
        {activePlugin ? (
          <div className="flex items-start gap-5">
            <div className="text-5xl">{activePlugin.ikona}</div>
            <div className="flex-1">
              <div className="text-xl font-bold text-gov-blue">{activePlugin.nazov}</div>
              <div className="text-sm text-slate-500 mb-3">{activePlugin.vendor}</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {CAP_LABELS.map(c => (
                  <span
                    key={c.key}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      activePlugin.capabilities?.[c.key]
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
              <Button onClick={testConnection} disabled={testing} variant="outline" size="sm" className="gap-2">
                {testing ? (
                  <><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Testujem…</>
                ) : "🔍 Test pripojenia"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Žiadny aktívny skener dokladov</p>
        )}
      </div>

      {/* Dostupné pluginy */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
          📦 Dostupné pluginy
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                <th className="pb-2 text-left w-12">Ikona</th>
                <th className="pb-2 text-left">Názov</th>
                <th className="pb-2 text-left hidden md:table-cell">Vendor</th>
                <th className="pb-2 text-left hidden lg:table-cell">Schopnosti</th>
                <th className="pb-2 text-right w-32">Akcia</th>
              </tr>
            </thead>
            <tbody>
              {allPlugins.map(p => (
                <tr key={p.id || p.pluginId} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 text-2xl">{p.ikona}</td>
                  <td className="py-3">
                    <div className="font-semibold text-slate-800">{p.nazov}</div>
                    <div className="text-xs text-slate-400 max-w-xs">{p.popis?.slice(0, 70)}…</div>
                  </td>
                  <td className="py-3 text-slate-500 text-xs hidden md:table-cell">{p.vendor}</td>
                  <td className="py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {CAP_LABELS.filter(c => p.capabilities?.[c.key]).map(c => (
                        <span key={c.key} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                          {c.label}
                        </span>
                      ))}
                      {!Object.values(p.capabilities || {}).some(Boolean) && (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    {p.aktivny ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-bold">
                        ✓ Aktívny
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleActivate(p)}>
                        Aktivovať
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HW detekcia */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
          🔌 Detekcia HW
        </h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <Button onClick={scanHw} disabled={hwScanning} variant="outline" className="gap-2">
            {hwScanning ? (
              <><span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Hľadám zariadenia…</>
            ) : "🔍 Skenovať pripojený HW"}
          </Button>
          <Button onClick={scanHwFull} disabled={hwScanning} variant="outline" size="sm">
            Simulovať plný setup
          </Button>
        </div>
        {hwResult === "basic" && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">Detegované zariadenia:</div>
            <div className="flex items-center gap-2 text-sm text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Tlačiareň štítkov (USB)
              <Button
                size="sm" variant="outline"
                className="ml-auto h-7 text-xs"
                onClick={() => {
                  const p = plugins.find(x => x.pluginId === "zpl-printer");
                  if (p) handleActivate(p);
                }}
              >
                Aktivovať ZPL tlačiareň
              </Button>
            </div>
          </div>
        )}
        {hwResult === "full" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-green-800 mb-3">Detegované zariadenia:</div>
            <div className="space-y-1.5">
              {["✓ Skener dokumentov (USB)", "✓ Čítačka čipov (USB)", "✓ Tlačiareň štítkov (USB)"].map(s => (
                <div key={s} className="flex items-center gap-2 text-sm text-green-700">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {s.replace("✓ ", "")}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* HW Katalóg */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setCatalogOpen(o => !o)}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition"
        >
          <h2 className="text-base font-bold text-slate-800">📋 Katalóg podporovaného HW</h2>
          <span className="text-slate-400 text-sm">{catalogOpen ? "▲ Skryť" : "▼ Zobraziť"}</span>
        </button>
        {catalogOpen && (
          <div className="px-6 pb-6 border-t border-slate-100">
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                  <th className="pb-2 text-left">Zariadenie</th>
                  <th className="pb-2 text-left">Typ</th>
                  <th className="pb-2 text-left">Plugin</th>
                  <th className="pb-2 text-right">Cena</th>
                </tr>
              </thead>
              <tbody>
                {HW_CATALOG.map(h => (
                  <tr key={h.zariadenie} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-slate-800">{h.zariadenie}</td>
                    <td className="py-2 text-slate-500">{h.typ}</td>
                    <td className="py-2 text-slate-600">{h.plugin}</td>
                    <td className="py-2 text-right font-mono text-slate-700">{h.cena}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}