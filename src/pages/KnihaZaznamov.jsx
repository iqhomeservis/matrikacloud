import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Printer, Eye, RefreshCw, Filter, FileText } from "lucide-react";
import { createDoc, applyAllWatermarks } from "@/lib/pdfWatermark";
import { toast } from "sonner";
import ZaznamDetail from "../components/ZaznamDetail";

export default function KnihaZaznamov() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTyp, setFilterTyp] = useState("ALL");
  const [filterDatumOd, setFilterDatumOd] = useState("");
  const [filterDatumDo, setFilterDatumDo] = useState("");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.OverovaciaKniha.list("-datumOverenia", 500);
    setRecords(data);
    setLoading(false);
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || [r.poradoveCislo, r.ziadatelMeno, r.ziadatelPriezvisko, r.listinaDruh]
      .join(" ").toLowerCase().includes(q);
    const matchTyp = filterTyp === "ALL" || r.typOverenia === filterTyp;
    const matchOd = !filterDatumOd || new Date(r.datumOverenia) >= new Date(filterDatumOd);
    const matchDo = !filterDatumDo || new Date(r.datumOverenia) <= new Date(filterDatumDo + "T23:59:59");
    return matchSearch && matchTyp && matchOd && matchDo;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("sk-SK");
  };

  const handleExportPDF = async () => {
    const doc = createDoc("landscape", "a4");
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 110);
    doc.text("Kniha overovacích záznamov", 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Export: ${new Date().toLocaleString("sk-SK")} | Záznamov: ${filtered.length}`, 14, 25);

    const headers = [["Por. č.", "Dátum", "Meno", "Priezvisko", "Typ", "Druh listiny", "Listy", "Poplatok", "Overovateľ"]];
    const rows = filtered.map(r => [
      r.poradoveCislo || "",
      formatDate(r.datumOverenia),
      r.ziadatelMeno || "",
      r.ziadatelPriezvisko || "",
      r.typOverenia || "",
      r.listinaDruh || "",
      r.pocetListov || "",
      r.oslobodenyOdPoplatku ? "Osl." : `${r.poplatokEur?.toFixed(2) || "0.00"} €`,
      r.overovatelMeno || "",
    ]);

    // Simple manual table rendering
    const colWidths = [28, 22, 28, 28, 20, 42, 12, 22, 40];
    const startX = 14;
    let y = 32;
    const rowH = 7;

    // Header row
    doc.setFillColor(30, 58, 110);
    doc.rect(startX, y, colWidths.reduce((a,b)=>a+b,0), rowH, "F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(7);
    let x = startX;
    headers[0].forEach((h, i) => { doc.text(h, x + 1, y + 4.5); x += colWidths[i]; });
    y += rowH;

    doc.setTextColor(30, 30, 30);
    rows.forEach((row, ri) => {
      if (y > 185) { doc.addPage(); y = 14; }
      if (ri % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(startX, y, colWidths.reduce((a,b)=>a+b,0), rowH, "F"); }
      x = startX;
      row.forEach((cell, i) => {
        const cellStr = String(cell);
        doc.setFontSize(6.5);
        doc.text(doc.splitTextToSize(cellStr, colWidths[i] - 2)[0], x + 1, y + 4.5);
        x += colWidths[i];
      });
      y += rowH;
    });

    await applyAllWatermarks(doc);
    doc.save(`kniha_overovani_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success("PDF exportovaný");
  };

  const handleExportCSV = () => {
    const rows = [
      ["Poradové číslo", "Dátum", "Meno", "Priezvisko", "Typ", "Druh listiny", "Počet listov", "Poplatok", "Overovateľ"],
      ...filtered.map(r => [
        r.poradoveCislo, formatDate(r.datumOverenia),
        r.ziadatelMeno, r.ziadatelPriezvisko,
        r.typOverenia, r.listinaDruh || "",
        r.pocetListov || "", r.poplatokEur || "",
        r.overovatelMeno || "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `overovania_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    toast.success("CSV exportovaný");
  };

  const handleReprint = async (record) => {
    try {
      const settings = await base44.entities.Nastavenia.list();
      const cfg = settings[0];
      const bridgeUrl = cfg?.bridgeUrl || "https://localhost:8443";
      await fetch(`${bridgeUrl}/api/printer/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zpl: "^XA^FO50,50^A0N,40,40^FD" + record.poradoveCislo + "^FS^XZ" }),
      });
      toast.success("Štítok odoslaný na tlač");
    } catch {
      toast.error("Tlačiareň nedostupná");
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {selected && <ZaznamDetail record={selected} onClose={() => setSelected(null)} onReprint={handleReprint} />}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gov-blue">Kniha záznamov</h1>
          <p className="text-sm text-slate-500">{filtered.length} záznamov celkom</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={load} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Obnoviť
          </Button>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-2">
            <FileText className="w-4 h-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Hľadať..."
              className="pl-9 h-10"
            />
          </div>
          <Select value={filterTyp} onValueChange={v => { setFilterTyp(v); setPage(1); }}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Typ overenia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Všetky typy</SelectItem>
              <SelectItem value="LISTINA">Listina</SelectItem>
              <SelectItem value="PODPIS">Podpis</SelectItem>
            </SelectContent>
          </Select>
          <div>
            <Input type="date" value={filterDatumOd} onChange={e => setFilterDatumOd(e.target.value)} className="h-10" placeholder="Dátum od" />
          </div>
          <div>
            <Input type="date" value={filterDatumDo} onChange={e => setFilterDatumDo(e.target.value)} className="h-10" placeholder="Dátum do" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Načítavam...
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Filter className="w-8 h-8 mb-2 opacity-50" />
            <p>Žiadne záznamy</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Por. č.</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Dátum</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Žiadateľ</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Typ</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase hidden lg:table-cell">Druh listiny</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase hidden lg:table-cell">Poplatok</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}
                  onClick={() => setSelected(r)}
                >
                  <td className="px-4 py-3 font-mono font-bold text-gov-blue text-xs">{r.poradoveCislo}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(r.datumOverenia)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {r.ziadatelTitulPred && <span className="text-slate-500 text-xs mr-1">{r.ziadatelTitulPred}</span>}
                    {r.ziadatelMeno} {r.ziadatelPriezvisko}
                    {r.ziadatelTitulZa && <span className="text-slate-500 text-xs ml-1">{r.ziadatelTitulZa}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={r.typOverenia === "LISTINA" ? "default" : "secondary"} className="text-xs">
                      {r.typOverenia === "LISTINA" ? "📄" : "✍️"} {r.typOverenia}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{r.listinaDruh || "—"}</td>
                  <td className="px-4 py-3 text-slate-700 hidden lg:table-cell font-mono">
                    {r.oslobodenyOdPoplatku ? (
                      <span className="text-green-600 text-xs">Oslobodený</span>
                    ) : (
                      `${r.poplatokEur?.toFixed(2) || "0.00"} €`
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(r)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleReprint(r)}>
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Strana {page} z {totalPages} ({filtered.length} záznamov)
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              ← Predošlá
            </Button>
            <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Nasledujúca →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}