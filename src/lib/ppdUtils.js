import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";

// ─── Suma slovom (SK) ───────────────────────────────────────────────────────
const EURÁ_FORMS = {
  1: "jeden euro", 2: "dve eurá", 3: "tri eurá", 4: "štyri eurá",
  5: "päť eur", 6: "šesť eur", 7: "sedem eur", 8: "osem eur",
  9: "deväť eur", 10: "desať eur", 11: "jedenásť eur", 12: "dvanásť eur",
  13: "trinásť eur", 14: "štrnásť eur", 15: "pätnásť eur", 16: "šestnásť eur",
  17: "sedemnásť eur", 18: "osemnásť eur", 19: "devätnásť eur", 20: "dvadsať eur",
  21: "dvadsaťjeden eur", 22: "dvadsaťdve eurá", 23: "dvadsaťtri eurá",
  24: "dvadsaťštyri eurá", 25: "dvadsaťpäť eur", 26: "dvadsaťšesť eur",
  27: "dvadsaťsedem eur", 28: "dvadsaťosem eur", 29: "dvadsaťdeväť eur",
  30: "tridsať eur", 35: "tridsaťpäť eur", 40: "štyridsiať eur",
  45: "štyridsiațpäť eur", 50: "päťdesiat eur",
};

export function sumaSlowom(suma) {
  if (suma === 0) return "nula eur";
  const rounded = Math.round(suma);
  if (EURÁ_FORMS[rounded]) return EURÁ_FORMS[rounded];
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
  // A5: 148 x 210 mm
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
  const W = 148;
  const margin = 12;
  let y = 14;

  // ── Hlavička — obec VEĽKÝMI PÍSMENAMI
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text((doklad.obecNazov || "Obec").toUpperCase(), W / 2, y, { align: "center" });
  y += 5;
  if (doklad.obecAdresa) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(doklad.obecAdresa, W / 2, y, { align: "center" });
    y += 4;
  }
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`IČO: ${doklad.obecIco || "—"}`, W / 2, y, { align: "center" });
  y += 9;

  // Oddeľovač
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, W - margin, y);
  y += 9;

  // ── Nadpis
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 110);
  doc.text("PRÍJMOVÝ POKLADNIČNÝ DOKLAD", W / 2, y, { align: "center" });
  y += 2.5;
  // Podčiarknutie nadpisu
  const tw = doc.getTextWidth("PRÍJMOVÝ POKLADNIČNÝ DOKLAD");
  doc.setDrawColor(30, 58, 110);
  doc.line((W - tw) / 2, y, (W + tw) / 2, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(`Číslo: ${doklad.cisloDokladu}`, W / 2, y, { align: "center" });
  y += 5;

  const dt = new Date(doklad.datumVydania);
  const datumStr = dt.toLocaleDateString("sk-SK");
  const casStr = dt.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Dátum: ${datumStr}     Čas: ${casStr}`, W / 2, y, { align: "center" });
  y += 8;

  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, W - margin, y);
  y += 7;

  // ── Obsah — správny text
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Prijal(a) som od žiadateľa sumu:", margin, y);
  y += 6;

  // Správne pomenovanie úkonov
  const typSluzbyFixed = (doklad.typSluzby || "—")
    .replace("Osvedčenie listiny", "Osvedčenie zhody listiny s predloženou listinou")
    .replace("Osvedčenie podpisu", "Osvedčenie pravosti podpisu");

  const rows = [
    ["Druh úkonu:", typSluzbyFixed],
    ["Právny základ:", doklad.pravnyZaklad || "—"],
    ["Referencia:", doklad.poradoveCisloZaznamu || "—"],
    ["Žiadateľ:", doklad.ziadatelMeno || "—"],
  ];
  for (const [label, val] of rows) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(val), margin + 32, y, { maxWidth: W - margin - 32 - 4 });
    y += 5.5;
  }
  y += 3;

  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, W - margin, y);
  y += 6;

  // ── Suma
  const sumaStr = doklad.oslobodenyOdPoplatku
    ? "0,00 €"
    : `${(doklad.suma || 0).toFixed(2).replace(".", ",")} €`;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 110);
  doc.text(`Suma: ${sumaStr}`, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(60, 60, 60);
  doc.text(`Slovom: ${doklad.slovom || "—"}`, margin, y);
  y += 6;

  if (doklad.oslobodenyOdPoplatku) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 100, 0);
    doc.text("Oslobodený od poplatku: ÁNO", margin, y);
    y += 5;
    if (doklad.dovodOslobodenia) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(`Dôvod: ${doklad.dovodOslobodenia}`, margin, y);
      y += 5;
    }
  }

  if (doklad.jeStorno) {
    y += 2;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 0, 0);
    doc.text("STORNO DOKLAD", margin, y);
    y += 5;
    if (doklad.stornoDovodText) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(`Dôvod storna: ${doklad.stornoDovodText}`, margin, y);
      y += 5;
    }
  }

  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, W - margin, y);
  y += 7;

  // ── Päta — podpis vľavo, pečiatka vpravo
  const footerY = y;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Prijal/a: ${doklad.overovatelMeno || "—"}`, margin, footerY);
  doc.text(`V ${doklad.obecNazov || "obci"} dňa ${datumStr}`, margin, footerY + 8);
  doc.text("Podpis: _______________________", margin, footerY + 18);

  // Pečiatka — prerušovaná čiara, 60×28 mm, vpravo dole
  const stampW = 60;
  const stampH = 26;
  const stampX = W - margin - stampW;
  const stampY = footerY - 2;
  doc.setDrawColor(150, 150, 150);
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(stampX, stampY, stampW, stampH);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text("Odtlačok úradnej pečiatky", stampX + stampW / 2, stampY + stampH / 2, { align: "center" });

  y = footerY + stampH + 6;

  // ── Footer — správny zákon
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, W - margin, y);
  y += 4;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  const footerText = "Tento doklad je dokladom o prijatí správneho poplatku podľa zákona č. 145/1995 Z. z. o správnych poplatkoch v znení neskorších predpisov.";
  const footerLines = doc.splitTextToSize(footerText, W - 2 * margin);
  doc.text(footerLines, margin, y);

  return doc;
}