import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { generujPPDPdf, sumaSlowom, formatujCisloPPD, nacitajAleboVytvorPPDNastavenia } from "@/lib/ppdUtils";

export default function PPDModal({ zaznam, onClose }) {
  const [vydatDoklad, setVydatDoklad] = useState(true);
  const [oslobodeny, setOslobodeny] = useState(zaznam?.oslobodenyOdPoplatku || false);
  const [loading, setLoading] = useState(false);

  const suma = oslobodeny ? 0 : (zaznam?.poplatokEur || 0);
  const slovom = sumaSlowom(suma);

  const buildAndSavePPD = async (printAfter) => {
    setLoading(true);
    try {
      const nas = await nacitajAleboVytvorPPDNastavenia();
      const settings = await base44.entities.Nastavenia.list();
      const cfg = settings[0] || {};
      const rok = new Date().getFullYear();
      const mes = new Date().getMonth() + 1;

      const cisloDokladu = formatujCisloPPD(nas.formatCisla, nas.aktualnePoradoveCislo, rok, mes);

      const dokladData = {
        cisloDokladu,
        zaznamId: zaznam.id,
        datumVydania: new Date().toISOString(),
        suma,
        slovom,
        typSluzby: zaznam.typOverenia === "LISTINA"
          ? `Osvedčenie listiny (${zaznam.listinaDruh || "—"})`
          : "Osvedčenie podpisu",
        overovatelMeno: zaznam.overovatelMeno || "",
        obecNazov: cfg.obecNazov || "",
        obecIco: cfg.obecIco || "",
        obecAdresa: cfg.adresaUradu || "",
        ziadatelMeno: `${zaznam.ziadatelTitulPred ? zaznam.ziadatelTitulPred + " " : ""}${zaznam.ziadatelMeno} ${zaznam.ziadatelPriezvisko}`,
        poradoveCisloZaznamu: zaznam.poradoveCislo || "",
        oslobodenyOdPoplatku: oslobodeny,
        dovodOslobodenia: zaznam.dovodOslobodenia || "",
        pravnyZaklad: zaznam.typOverenia === "LISTINA" ? "§7 zák. č. 599/2001 Z.z." : "§5 zák. č. 599/2001 Z.z.",
        stav: "VYDANY",
        jeStorno: false,
      };

      await base44.entities.PPDDoklad.create(dokladData);

      // Increment serial number
      await base44.entities.PPDNastavenia.update(nas.id, {
        aktualnePoradoveCislo: nas.aktualnePoradoveCislo + 1,
        posledneVydaneCislo: cisloDokladu,
      });

      if (printAfter) {
        const doc = generujPPDPdf(dokladData);
        doc.autoPrint();
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }

      toast.success(`Doklad ${cisloDokladu} vydaný`);
      onClose();
    } catch (e) {
      toast.error("Chyba pri vydaní dokladu: " + e.message);
    }
    setLoading(false);
  };

  const handleSaveWithoutPrint = () => buildAndSavePPD(false);
  const handlePrint = () => buildAndSavePPD(true);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gov-blue mb-1">Vydať príjmový doklad?</h2>
        <p className="text-sm text-slate-500 mb-5">Záznam bol uložený. Chcete vydať PPD?</p>

        <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Záznam:</span>
            <span className="font-mono font-bold text-gov-blue">{zaznam?.poradoveCislo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Žiadateľ:</span>
            <span className="font-medium">{zaznam?.ziadatelMeno} {zaznam?.ziadatelPriezvisko}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Suma:</span>
            <span className="font-bold text-lg text-gov-blue">{suma.toFixed(2).replace(".", ",")} €</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Slovom:</span>
            <span className="italic">{slovom}</span>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-2">
            <Checkbox id="vydatDoklad" checked={vydatDoklad} onCheckedChange={setVydatDoklad} />
            <Label htmlFor="vydatDoklad" className="text-sm font-medium">Vydať doklad (PPD)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="oslobodenyModal" checked={oslobodeny} onCheckedChange={v => setOslobodeny(v)} />
            <Label htmlFor="oslobodenyModal" className="text-sm text-slate-600">Oslobodený od poplatku (suma = 0 €)</Label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {vydatDoklad && (
            <>
              <Button
                onClick={handlePrint}
                disabled={loading}
                className="w-full bg-gov-blue hover:bg-gov-blue/90 text-white gap-2 h-11 text-base font-bold"
              >
                🖨️ TLAČIŤ DOKLAD
              </Button>
              <Button
                onClick={handleSaveWithoutPrint}
                disabled={loading}
                variant="outline"
                className="w-full gap-2"
              >
                💾 Uložiť bez tlače
              </Button>
            </>
          )}
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-slate-500"
          >
            ✖ Nevydávať
          </Button>
        </div>
      </div>
    </div>
  );
}