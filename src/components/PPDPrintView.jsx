import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Printer } from "lucide-react";

// Lokál mesta pre slovenčinu
function mestoDna(mesto) {
  if (!mesto) return "";
  const lokaly = {
    "Sabinov": "Sabinove", "Prešov": "Prešove", "Košice": "Košiciach",
    "Bratislava": "Bratislave", "Žilina": "Žiline", "Trenčín": "Trenčíne",
    "Trnava": "Trnave", "Banská Bystrica": "Banskej Bystrici",
    "Nitra": "Nitre", "Poprad": "Poprade", "Bardejov": "Bardejove",
    "Humenné": "Humennom", "Michalovce": "Michalovciach",
    "Rožňava": "Rožňave", "Levoča": "Levoči", "Čadca": "Čadci",
    "Ružomberok": "Ružomberku", "Liptovský Mikuláš": "Liptovskom Mikuláši",
    "Spišská Nová Ves": "Spišskej Novej Vsi", "Vranov nad Topľou": "Vranove nad Topľou",
    "Stropkov": "Stropkove", "Snina": "Snine", "Trebišov": "Trebišove",
    "Lipany": "Lipanoch", "Gelnica": "Gelnici",
  };
  return lokaly[mesto] || `${mesto}e`;
}

export default function PPDPrintView({ doklad, nastavenia, onClose }) {
  const printRef = useRef(null);

  const obecNazov = (nastavenia?.obecNazov || doklad.obecNazov || "").toUpperCase();
  const obecAdresa = nastavenia?.adresaUradu || doklad.obecAdresa || "";
  const obecIco = nastavenia?.obecIco || doklad.obecIco || "";
  const icoChyba = !obecIco;

  const dt = new Date(doklad.datumVydania);
  const datumStr = dt.toLocaleDateString("sk-SK");
  const casStr = dt.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
  const sumaStr = doklad.oslobodenyOdPoplatku
    ? "0,00 €"
    : `${(doklad.suma || 0).toFixed(2).replace(".", ",")} €`;

  const typSluzbyFixed = (doklad.typSluzby || "—")
    .replace(/Osvedčenie listiny(\s*\(.*?\))?/, "Osvedčenie zhody listiny s predloženou listinou$1")
    .replace(/Osvedčenie podpisu(\s*\(.*?\))?/, "Osvedčenie pravosti podpisu$1");

  useEffect(() => {
    if (icoChyba) {
      toast.warning("Upozornenie: IČO obce nie je vyplnené v Nastaveniach. Doklad nemusí byť platný.");
    }
  }, [icoChyba]);

  const handlePrint = () => window.print();

  return (
    <>
      {/* Print CSS — injected globally */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .ppd-print-overlay { display: block !important; position: static !important; background: white !important; }
          .ppd-print-overlay .ppd-no-print { display: none !important; }
          .ppd-print-view {
            display: block !important;
            font-family: Arial, sans-serif !important;
            font-size: 12pt !important;
            color: #000 !important;
            max-width: 148mm !important;
            margin: 0 auto !important;
            padding: 8mm !important;
          }
        }
      `}</style>

      {/* Overlay */}
      <div className="ppd-print-overlay fixed inset-0 z-[500] bg-black/60 flex items-start justify-center overflow-y-auto py-8 px-4">
        {/* Toolbar */}
        <div className="ppd-no-print fixed top-4 right-4 flex gap-2 z-[600]">
          {icoChyba && (
            <div className="bg-amber-100 border border-amber-400 text-amber-800 text-xs px-3 py-2 rounded-lg max-w-xs">
              ⚠️ IČO obce nie je vyplnené v Nastaveniach
            </div>
          )}
          <Button onClick={handlePrint} className="bg-gov-blue text-white gap-2 shadow-lg">
            <Printer className="w-4 h-4" /> Tlačiť
          </Button>
          <Button onClick={onClose} variant="outline" className="bg-white gap-2 shadow-lg">
            <X className="w-4 h-4" /> Zatvoriť
          </Button>
        </div>

        {/* Doklad — A5 card */}
        <div
          ref={printRef}
          className="ppd-print-view bg-white shadow-2xl"
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "11pt",
            color: "#111",
            width: "148mm",
            minHeight: "210mm",
            padding: "10mm 12mm",
            boxSizing: "border-box",
          }}
        >
          {/* HLAVIČKA */}
          <div style={{ textAlign: "center", marginBottom: "6mm" }}>
            <div style={{ fontSize: "18pt", fontWeight: "bold", letterSpacing: "0.5px" }}>
              {obecNazov || "OBEC"}
            </div>
            {obecAdresa && (
              <div style={{ fontSize: "9pt", color: "#444", marginTop: "2px" }}>{obecAdresa}</div>
            )}
            <div style={{ fontSize: "9pt", color: "#444", marginTop: "2px" }}>
              {icoChyba
                ? <span style={{ color: "#b45309" }}>IČO: (doplňte v Nastaveniach)</span>
                : `IČO: ${obecIco}`
              }
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #333", marginBottom: "6mm" }} />

          {/* NADPIS */}
          <div style={{ textAlign: "center", marginBottom: "4mm" }}>
            <div style={{ fontSize: "16pt", fontWeight: "bold", color: "#1a365d" }}>
              PRÍJMOVÝ POKLADNIČNÝ DOKLAD
            </div>
            <div style={{ fontSize: "13pt", fontWeight: "bold", marginTop: "3mm" }}>
              Číslo: {doklad.cisloDokladu}
            </div>
            <div style={{ fontSize: "10pt", marginTop: "2mm" }}>
              Dátum: {datumStr}&nbsp;&nbsp;&nbsp;&nbsp;Čas: {casStr}
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #ccc", marginBottom: "5mm" }} />

          {/* OBSAH */}
          <div style={{ marginBottom: "4mm", fontSize: "11pt" }}>
            Prijal(a) som od žiadateľa sumu:
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: "4mm" }}>
            <tbody>
              {[
                ["Druh úkonu:", typSluzbyFixed],
                ["Právny základ:", doklad.pravnyZaklad || "—"],
                ["Referencia:", doklad.poradoveCisloZaznamu || "—"],
                ["Žiadateľ:", doklad.ziadatelMeno || "—"],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ fontWeight: "bold", width: "34mm", paddingBottom: "3px", verticalAlign: "top" }}>{label}</td>
                  <td style={{ paddingBottom: "3px", verticalAlign: "top" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr style={{ border: "none", borderTop: "1px solid #ccc", marginBottom: "4mm" }} />

          {/* SUMA */}
          <div style={{ fontSize: "18pt", fontWeight: "bold", color: "#1a365d", marginBottom: "2mm" }}>
            Suma: {sumaStr}
          </div>
          <div style={{ fontSize: "11pt", fontStyle: "italic", color: "#444", marginBottom: "3mm" }}>
            Slovom: {doklad.slovom || "—"}
          </div>

          {doklad.oslobodenyOdPoplatku && (
            <div style={{ fontSize: "10pt", color: "#92400e", fontWeight: "bold", marginBottom: "2mm" }}>
              OSLOBODENÝ OD POPLATKU
              {doklad.dovodOslobodenia && <span style={{ fontWeight: "normal" }}> — Dôvod: {doklad.dovodOslobodenia}</span>}
            </div>
          )}

          {doklad.jeStorno && (
            <div style={{ fontSize: "13pt", fontWeight: "bold", color: "#dc2626", marginBottom: "3mm" }}>
              STORNO DOKLAD
              {doklad.stornoDovodText && <div style={{ fontSize: "9pt", fontWeight: "normal" }}>Dôvod: {doklad.stornoDovodText}</div>}
            </div>
          )}

          <hr style={{ border: "none", borderTop: "1px solid #ccc", marginBottom: "5mm" }} />

          {/* PÄTA — dvojstĺpcový layout */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "4mm", marginBottom: "5mm" }}>
            {/* Ľavý stĺpec */}
            <div style={{ fontSize: "10pt", flex: 1 }}>
              <div>Prijal/a: <strong>{doklad.overovatelMeno || "—"}</strong></div>
              <div style={{ marginTop: "6mm" }}>
                V {mestoDna(nastavenia?.obecNazov || doklad.obecNazov)} dňa {datumStr}
              </div>
              <div style={{ marginTop: "10mm" }}>
                Podpis: _________________________
              </div>
            </div>
            {/* Pravý stĺpec — pečiatka */}
            <div style={{
              border: "1px dashed #888",
              width: "52mm",
              height: "30mm",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "8pt",
              color: "#999",
              textAlign: "center",
              padding: "3mm",
            }}>
              Odtlačok úradnej pečiatky
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #ccc", marginBottom: "3mm" }} />

          {/* FOOTER */}
          <div style={{ fontSize: "8pt", color: "#666", lineHeight: "1.4" }}>
            Tento doklad je potvrdením o prijatí správneho poplatku podľa zákona č. 145/1995 Z. z.
            o správnych poplatkoch v znení neskorších predpisov.
            Vystavené v súlade so zákonom č. 431/2002 Z. z. o účtovníctve.
          </div>
        </div>
      </div>
    </>
  );
}