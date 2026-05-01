import { useState } from "react";
import { CreditCard, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MOCK_DATA = {
  eID: {
    status: "OK",
    source: "eID_NFC",
    meno: "Ján",
    priezvisko: "Vzorný",
    datumNarodenia: "1978-03-14",
    rodneCislo: "780314/1234",
    pohlavie: "M",
    statnaPrislusnost: "SVK",
    dokladTyp: "OP",
    dokladCislo: "SK1234567",
    dokladPlatnostDo: "2030-05-01",
    adresaTrvalehoPobytu: { ulica: "Hlavná", cislo: "12", mesto: "Prešov", psc: "08001" },
    podpisCertifikatuPlatny: true,
  },
  ePass: {
    status: "OK",
    source: "ePass_NFC",
    meno: "Mária",
    priezvisko: "Horáková",
    datumNarodenia: "1990-07-22",
    rodneCislo: "906722/8901",
    pohlavie: "F",
    statnaPrislusnost: "SVK",
    dokladTyp: "PAS",
    dokladCislo: "PA1234567",
    dokladPlatnostDo: "2028-11-15",
    adresaTrvalehoPobytu: { ulica: "Námestie slobody", cislo: "5", mesto: "Bratislava", psc: "81106" },
    podpisCertifikatuPlatny: true,
  },
};

export default function NfcSimulator({ onDataReceived, onClose }) {
  const [step, setStep] = useState("idle"); // idle | waiting | can | reading | done | error
  const [can, setCan] = useState("");
  const [selectedType, setSelectedType] = useState("eID");

  const startRead = () => {
    setStep("can");
  };

  const submitCan = () => {
    if (can.length < 3) return;
    setStep("reading");
    setTimeout(() => {
      const data = MOCK_DATA[selectedType];
      setStep("done");
      setTimeout(() => {
        onDataReceived(data);
        onClose();
      }, 800);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-8 h-8 text-gov-blue" />
          </div>
          <h2 className="text-xl font-bold text-gov-blue">Načítanie dokladu</h2>
          <p className="text-sm text-slate-500 mt-1">NFC simulátor (testovací režim)</p>
        </div>

        {step === "idle" && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Typ dokladu</Label>
              <div className="grid grid-cols-2 gap-2">
                {["eID", "ePass"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      selectedType === t
                        ? "border-gov-blue bg-blue-50 text-gov-blue"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {t === "eID" ? "🪪 Občiansky preukaz" : "📘 Cestovný pas"}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={startRead} className="w-full bg-gov-blue hover:bg-gov-blue/90 text-white h-11">
              Priložte doklad k čítačke
            </Button>
          </div>
        )}

        {step === "can" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800 font-medium">
                Zadajte CAN kód (6 číslic z prednej strany OP) alebo akékoľvek číslo pre simuláciu.
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1 block">CAN / MRZ kód</Label>
              <Input
                value={can}
                onChange={(e) => setCan(e.target.value)}
                placeholder="napr. 123456"
                className="text-center text-xl tracking-widest font-mono h-12"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && submitCan()}
              />
            </div>
            <Button onClick={submitCan} className="w-full bg-gov-blue hover:bg-gov-blue/90 text-white h-11">
              Potvrdiť a načítať
            </Button>
          </div>
        )}

        {step === "reading" && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-gov-blue animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Čítanie čipu…</p>
            <p className="text-sm text-slate-400 mt-1">Neodkladajte doklad</p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-green-700 font-bold text-lg">Doklad načítaný</p>
            <p className="text-sm text-slate-400 mt-1">Vyplňujem formulár…</p>
          </div>
        )}
      </div>
    </div>
  );
}