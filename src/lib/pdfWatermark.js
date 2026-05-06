import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";

async function getLicInfo() {
  try {
    const list = await base44.entities.Licencia.list("-created_date", 1);
    return list[0] || null;
  } catch {
    return null;
  }
}

/**
 * Vytvorí jsPDF dokument s watermarkingom:
 *  - Vrstva 1: PDF metadata (vždy)
 *  - Vrstva 2: päta každej strany
 *  - Vrstva 3: diagonálny watermark (TRIAL / RESTRICTED)
 *
 * @param {jsPDF} doc  — existujúci jsPDF objekt
 * @param {object} lic — objekt licencie (alebo null)
 */
export function applyMetadata(doc, lic) {
  const licenseId = lic?.licenseId || "UNKNOWN";
  const obecNazov = lic?.obecNazov || "";
  const obecIco = lic?.obecIco || "";

  doc.setProperties({
    producer: `MatrikaCloud v1.0.0 [${licenseId}]`,
    author: `${obecNazov} (IČO: ${obecIco})`,
    keywords: `MTRK_LIC_${licenseId}`,
  });
}

export function applyFooter(doc, lic) {
  const licenseId = lic?.licenseId || "UNKNOWN";
  const obecNazov = lic?.obecNazov || "";
  const datumCas = new Date().toLocaleString("sk-SK");
  const pageCount = doc.getNumberOfPages();
  const text = `Vygenerované: MatrikaCloud | Licencia: ${licenseId} | ${obecNazov} | ${datumCas}`;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(text, pageW / 2, pageH - 6, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }
}

export function applyTrialWatermark(doc, lic) {
  const needsWatermark = lic?.status === "TRIAL" || lic?.status === "RESTRICTED";
  if (!needsWatermark) return;

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.12 }));
    doc.setFontSize(60);
    doc.setTextColor(220, 38, 38);
    doc.text("SKÚŠOBNÁ VERZIA", pageW / 2, pageH / 2, {
      align: "center",
      angle: 45,
    });
    doc.restoreGraphicsState();
    doc.setTextColor(0, 0, 0);
  }
}

/**
 * Shortcut — aplikuj všetky 3 vrstvy naraz.
 * Volaj PO tom, ako si pridal obsah do doc.
 */
export async function applyAllWatermarks(doc) {
  const lic = await getLicInfo();
  applyMetadata(doc, lic);
  applyFooter(doc, lic);
  applyTrialWatermark(doc, lic);
  return doc;
}

/**
 * Vytvorí prázdny jsPDF doc s metadatami — štartovací bod.
 */
export function createDoc(orientation = "portrait", format = "a4") {
  return new jsPDF({ orientation, format, unit: "mm" });
}