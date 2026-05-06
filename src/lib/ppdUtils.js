import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";

// ─── Suma slovom (SK) ───────────────────────────────────────────────────────
const EURÁ_FORMS = {
  1: "jedno euro", 2: "dve eurá", 3: "tri eurá", 4: "štyri eurá",
  5: "päť eur", 6: "šesť eur", 7: "sedem eur", 8: "osem eur",
  9: "deväť eur", 10: "desať eur", 11: "jedenásť eur", 12: "dvanásť eur",
  13: "trinásť eur", 14: "štrnásť eur", 15: "pätnásť eur", 16: "šestnásť eur",
  17: "sedemnásť eur", 18: "osemnásť eur", 19: "devätnásť eur", 20: "dvadsať eur",
  21: "dvadsaťjedno eur", 22: "dvadsaťdva eur", 23: "dvadsaťtri eur",
  24: "dvadsaťštyri eur", 25: "dvadsaťpäť eur", 26: "dvadsaťšesť eur",
  27: "dvadsaťsedem eur", 28: "dvadsaťosem eur", 29: "dvadsaťdeväť eur",
  30: "tridsať eur", 35: "tridsaťpäť eur", 40: "štyridsiať eur",
  45: "štyridsiatiepäť eur", 50: "päťdesiat eur",
};

export function sumaSlowom(suma) {
  if (suma === 0) return "nula eur";
  const rounded = Math.round(suma);
  if (EURÁ_FORMS[rounded]) return EURÁ_FORMS[rounded];
  // fallback pre iné sumy
  const cents = Math.round((suma - Math.floor(suma)) * 100);
  const euros = Math.floor(suma);
  let result = EURÁ_FORMS[euros] || `${euros} eur`;
  if (cents > 0) result += ` ${cents} centov`;
  return result;
}

// ─── Generovanie čísla dokladu ──────────────────────────────────────────────
export function formatujCisloPPD(format, cislo, rok, mes) {
  const num5 = String(cislo).padStart(5, "0");
  const num3 = String(cislo).padStart(3, "0");
  const mesStr = String(mes).padStart(2, "0");
  return (format || "PPD/{ROK}/{NNNNN}")
    .replace("{ROK}", rok)
    .replace("{MES}", mesStr)
    .replace("{NNNNN}", num5)
    .replace("{NNN}", num3);
}

export async function nacitajAleboVytvorPPDNastavenia() {
  const list = await base44.entities.PPDNastavenia.list();
  const rok = new Date().getFullYear();
  if (list.length === 0) {
    return await base44.entities.PPDNastavenia.create({
      aktualnePoradoveCislo: 1,
      formatCisla: "PPD/{ROK}/{NNNNN}",
      rokAktualny: rok,
      resetovatRocne: true,
    });
  }
  const nas = list[0];
  // Automatický ročný reset
  if (nas.resetovatRocne && nas.rokAktualny && nas.rokAktualny < rok) {
    const updated = await base44.entities.PPDNastavenia.update(nas.id, {
      aktualnePoradoveCislo: 1,
      rokAktualny: rok,
      posledneVydaneCislo: null,
    });
    return updated;
  }
  return nas;
}

// ─── Generovanie PDF dokladu ────────────────────────────────────────────────
export function generujPPDPdf(doklad) {
  // A5 format: 148 x 210 mm
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
  const W = 148;
  const margin = 12;
  let y = 14;

  const line = (text, fontSize, align, bold, color) => {
    doc.setFontSize(fontSize || 10);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    if (color) doc.setTextColor(...color);
    else doc.setTextColor(30, 30, 30);
    const x = align === "center" ? W / 2 : margin;
    doc.text(text || "", x, y, { align: align || "left", maxWidth: W - 2 * margin });
  };

  const skip = (mm) => { y += mm; };

  // ── Hlavička
  line(doklad.obecNazov || "Obec", 14, "center", true);
  skip(6);
  if (doklad.obecAdresa) { line(doklad.obecAdresa, 9, "center"); skip(5); }
  line(`IČO: ${doklad.obecIco || "—"}`, 9, "center");
  skip(6);

  // Delimitér
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, W - margin, y);
  skip(6);

  // ── Nadpis
  line("PRÍJMOVÝ POKLADNIČNÝ DOKLAD", 14, "center", true, [30, 58, 110]);
  skip(7);
  line(`Číslo: ${doklad.cisloDokladu}`, 10, "center", true);
  skip(5);
  const dt = new Date(doklad.datumVydania);
  const datumStr = dt.toLocaleDateString("sk-SK");
  const casStr = dt.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
  line(`Dátum: ${datumStr}     Čas: ${casStr}`, 9, "center");
  skip(7);

  doc.line(margin, y, W - margin, y);
  skip(6);

  // ── Obsah
  line("Prijatá platba za:", 9, "left", true);
  skip(5);

  const rows = [
    ["Druh úkonu:", doklad.typSluzby || "—"],
    ["Právny základ:", doklad.pravnyZaklad || "—"],
    ["Referencia:", doklad.poradoveCisloZaznamu || "—"],
    ["Žiadateľ:", doklad.ziadatelMeno || "—"],
  ];
  for (const [label, val] of rows) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(val, margin + 32, y);
    y += 5;
  }
  skip(4);

  doc.line(margin, y, W - margin, y);
  skip(5);

  // ── Suma
  const sumaStr = doklad.oslobodenyOdPoplatku
    ? "0,00 €"
    : `${(doklad.suma || 0).toFixed(2).replace(".", ",")} €`;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 110);
  doc.text(`Suma: ${sumaStr}`, margin, y);
  skip(6);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Slovom: ${doklad.slovom || "—"}`, margin, y);
  skip(5);

  if (doklad.oslobodenyOdPoplatku) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 100, 0);
    doc.text("Oslobodený od poplatku: ÁNO", margin, y);
    skip(5);
    if (doklad.dovodOslobodenia) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(`Dôvod: ${doklad.dovodOslobodenia}`, margin, y);
      skip(5);
    }
  }

  // Je storno doklad?
  if (doklad.jeStorno) {
    skip(2);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 0, 0);
    doc.text("STORNO DOKLAD", margin, y);
    skip(5);
    if (doklad.stornoDovodText) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(`Dôvod storna: ${doklad.stornoDovodText}`, margin, y);
      skip(5);
    }
  }

  skip(3);
  doc.line(margin, y, W - margin, y);
  skip(6);

  // ── Päta
  line(`Prijal/a: ${doklad.overovatelMeno || "—"}`, 9);
  skip(10);

  // Pečiatka
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, 40, 18);
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text("Odtlačok úradnej pečiatky", margin + 2, y + 10);
  skip(22);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`V ${doklad.obecNazov || "obci"} dňa ${datumStr}`, margin, y);
  skip(8);

  // ── Footer
  doc.line(margin, y, W - margin, y);
  skip(4);
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  const footerText =
    "Tento doklad je príjmovým pokladničným dokladom podľa § 18 ods. 1 zák. č. 595/2003 Z. z. v znení neskorších predpisov.";
  const footerLines = doc.splitTextToSize(footerText, W - 2 * margin);
  doc.text(footerLines, margin, y);

  return doc;
}