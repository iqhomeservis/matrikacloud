import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

export default function PPDUzavierka() {
  const [rok, setRok] = useState(new Date().getFullYear());
  const [mesiac, setMesiac] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const MESICE = ["Január","Február","Marec","Apríl","Máj","Jún","Júl","August","September","Október","November","December"];

  const nacitaj = async () => {
    setLoading(true);
    setResult(null);
    const all = await base44.entities.PPDDoklad.list("-datumVydania", 9999);
    const filtered = all.filter(d => {
      const dt = new Date(d.datumVydania);
      return dt.getFullYear() === rok && dt.getMonth() + 1 === mesiac;
    });

    const vydane = filtered.filter(d => !d.jeStorno && d.stav === "VYDANY");
    const stornované = filtered.filter(d => d.stav === "STORNOVANY");
    const oslobodene = vydane.filter(d => d.oslobodenyOdPoplatku);
    const celkovaSuma = vydane.reduce((s, d) => s + (d.suma || 0), 0);

    setResult({ filtered, vydane, stornované, oslobodene, celkovaSuma });
    setLoading(false);
  };

  const exportPDF = async () => {
    if (!result) return;
    const settings = await base44.entities.Nastavenia.list();
    const cfg = settings[0] || {};

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const margin = 14;
    let y = 18;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 110);
    doc.text(cfg.obecNazov || "Obec", margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`IČO: ${cfg.obecIco || "—"}  |  ${cfg.adresaUradu || ""}`, margin, y);
    y += 8;

    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y, W - margin, y);
    y += 6;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("MESAČNÁ UZÁVIERKA — PRÍJMOVÉ POKLADNIČNÉ DOKLADY", margin, y, { maxWidth: W - 2 * margin });
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Obdobie: ${MESICE[mesiac - 1]} ${rok}`, margin, y);
    y += 8;

    // Súhrn
    doc.setFillColor(240, 244, 251);
    doc.rect(margin, y, W - 2 * margin, 30, "F");
    y += 6;
    const sumRows = [
      ["Vydaných dokladov:", String(result.vydane.length)],
      ["Stornovaných:", String(result.stornované.length)],
      ["Oslobodených od poplatku:", String(result.oslobodene.length)],
      ["Celková suma:", `${result.celkovaSuma.toFixed(2).replace(".", ",")} €`],
    ];
    for (const [k, v] of sumRows) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(k, margin + 4, y);
      doc.setFont("helvetica", "normal");
      doc.text(v, margin + 80, y);
      y += 5;
    }
    y += 6;

    // Tabuľka
    doc.setFillColor(30, 58, 110);
    doc.rect(margin, y, W - 2 * margin, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    const cols = [14, 50, 90, 130, 160, 185];
    const headers = ["Číslo dokladu", "Dátum", "Žiadateľ", "Záznam", "Suma", "Stav"];
    headers.forEach((h, i) => doc.text(h, cols[i], y + 4.5));
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    for (const d of result.filtered) {
      if (y > 270) { doc.addPage(); y = 14; }
      if (result.filtered.indexOf(d) % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, y, W - 2 * margin, 6, "F");
      }
      const vals = [
        d.cisloDokladu,
        d.datumVydania ? new Date(d.datumVydania).toLocaleDateString("sk-SK") : "—",
        (d.ziadatelMeno || "").slice(0, 22),
        d.poradoveCisloZaznamu || "—",
        `${(d.suma || 0).toFixed(2)} €`,
        d.stav,
      ];
      doc.setFontSize(7);
      vals.forEach((v, i) => doc.text(String(v), cols[i], y + 4));
      y += 6;
    }

    // Podpis
    y += 12;
    doc.setFontSize(9);
    doc.text(`V ${cfg.obecNazov || "obci"} dňa ${new Date().toLocaleDateString("sk-SK")}`, margin, y);
    y += 12;
    doc.text("Podpis a pečiatka: ______________________________", margin, y);

    doc.save(`uzavierka_ppd_${rok}_${String(mesiac).padStart(2, "0")}.pdf`);
    toast.success("PDF uzávierky exportovaný");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
        🧾 Pokladničná uzávierka PPD
      </h2>

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Mesiac</label>
          <select
            value={mesiac}
            onChange={e => setMesiac(Number(e.target.value))}
            className="h-10 rounded-md border border-input px-3 text-sm bg-white"
          >
            {MESICE.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Rok</label>
          <input
            type="number"
            value={rok}
            onChange={e => setRok(Number(e.target.value))}
            className="h-10 w-24 rounded-md border border-input px-3 text-sm"
          />
        </div>
        <Button onClick={nacitaj} disabled={loading} variant="outline" className="gap-2">
          {loading ? "Načítavam…" : "📊 Zobraziť súhrn"}
        </Button>
        {result && (
          <Button onClick={exportPDF} className="gap-2 bg-gov-blue text-white hover:bg-gov-blue/90">
            📄 Exportovať do PDF
          </Button>
        )}
      </div>

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Vydaných dokladov", value: result.vydane.length, color: "text-green-700" },
              { label: "Stornovaných", value: result.stornované.length, color: "text-red-600" },
              { label: "Oslobodených", value: result.oslobodene.length, color: "text-amber-600" },
              { label: "Celková suma", value: `${result.celkovaSuma.toFixed(2).replace(".", ",")} €`, color: "text-gov-blue" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}