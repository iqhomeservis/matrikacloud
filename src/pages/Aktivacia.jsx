import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { BookOpen, CheckCircle, Loader2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  activateLicenseMock,
  generateHardwareFingerprint,
  LICENSE_ERROR_MESSAGES,
  validateLicenseKey,
  validateICO,
  formatLicenseKeyInput,
} from "../lib/licenciaUtils";

const EULA_TEXT = `LICENČNÁ ZMLUVA — MatrikaCloud

Tu bude plné znenie po dodaní právnikom.

© 2026 MatrikaCloud s.r.o. Všetky práva vyhradené.`;

export default function Aktivacia() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    licencnyKluc: "",
    obecIco: "",
    obecNazov: "",
    kontaktEmail: "",
  });
  const [eula, setEula] = useState(false);
  const [telemetria, setTelemetria] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [eulaModal, setEulaModal] = useState(false);

  // Disable browser back button
  useEffect(() => {
    const handlePop = (e) => {
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: "" }));
    setGlobalError("");
  };

  const handleKeyInput = (e) => {
    const formatted = formatLicenseKeyInput(e.target.value);
    set("licencnyKluc", formatted);
  };

  const validate = (trialMode = false) => {
    const errs = {};
    if (!trialMode) {
      if (!validateLicenseKey(form.licencnyKluc)) {
        errs.licencnyKluc = "Aktivačný kľúč musí mať formát MTRK6-XXXXX-XXXXX-XXXXX-XXXXX";
      }
      if (!form.kontaktEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.kontaktEmail)) {
        errs.kontaktEmail = "Zadajte platný e-mail";
      }
    }
    if (!validateICO(form.obecIco)) {
      errs.obecIco = "IČO musí mať 8 číslic";
    }
    if (!form.obecNazov || form.obecNazov.length < 3) {
      errs.obecNazov = "Zadajte názov obce (min. 3 znaky)";
    }
    if (!eula) {
      errs.eula = "Musíte súhlasiť s licenčnou zmluvou";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const keyValid = validateLicenseKey(form.licencnyKluc);
  const icoValid = /^\d{8}$/.test(form.obecIco);
  const obecValid = form.obecNazov.length >= 3;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.kontaktEmail);
  const isFormComplete = keyValid && icoValid && obecValid && emailValid && eula && telemetria;

  const activate = async () => {
    if (!validate(false)) return;
    setLoading(true);
    setGlobalError("");
    try {
      const hwFingerprint = generateHardwareFingerprint();
      const result = await activateLicenseMock(form.licencnyKluc);
      if (!result.success) {
        setGlobalError(LICENSE_ERROR_MESSAGES[result.errorCode] || "Neznáma chyba");
        setLoading(false);
        return;
      }
      const now = new Date();
      const platnostDo = new Date(now); platnostDo.setFullYear(platnostDo.getFullYear() + 1);
      const podporaDo = new Date(now); podporaDo.setFullYear(podporaDo.getFullYear() + 1);

      const licencia = await base44.entities.Licencia.create({
        licenseId: result.data.licenseId,
        licencnyKluc: form.licencnyKluc,
        obecIco: form.obecIco,
        obecNazov: form.obecNazov,
        kontaktEmail: form.kontaktEmail,
        edicia: result.data.edicia,
        maxStanic: result.data.maxStanic,
        aktivovanaDna: now.toISOString(),
        platnostDo: platnostDo.toISOString(),
        podporaDo: podporaDo.toISOString(),
        aktivneFunkcie: result.data.funkcie,
        status: "ACTIVE",
        hardwareFingerprint: hwFingerprint,
        hostname: window.location.hostname,
        verziaApp: "1.0.0",
        posledneOverenie: now.toISOString(),
        offlineDniPocet: 0,
      });

      await base44.entities.LicencneUdalostiLog.create({
        cas: now.toISOString(),
        udalost: "PRVA_AKTIVACIA",
        detail: `Aktivácia edícia ${result.data.edicia}, kľúč ${form.licencnyKluc}`,
        predchadzajuciStav: "NOT_ACTIVATED",
        novyStav: "ACTIVE",
        vykonalAdmin: false,
      });

      await base44.entities.HeartbeatLog.create({
        cas: now.toISOString(),
        typ: "ACTIVATION",
        vysledok: "SUCCESS",
        responseStatus: "200",
      });

      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        toast.success("Licencia úspešne aktivovaná. Vitajte v MatrikaCloud!");
        navigate("/");
      }, 2000);
    } catch (e) {
      setLoading(false);
      setGlobalError(LICENSE_ERROR_MESSAGES.NETWORK_ERROR);
    }
  };

  const activateTrial = async () => {
    if (!validate(true)) return;
    setLoading(true);
    setGlobalError("");
    try {
      const now = new Date();
      const platnostDo = new Date(now); platnostDo.setDate(platnostDo.getDate() + 30);

      await base44.entities.Licencia.create({
        licenseId: "TRIAL-" + now.getTime(),
        obecIco: form.obecIco,
        obecNazov: form.obecNazov,
        edicia: "TRIAL",
        maxStanic: 1,
        aktivovanaDna: now.toISOString(),
        platnostDo: platnostDo.toISOString(),
        aktivneFunkcie: ["OVEROVANIE_LISTIN", "OVEROVANIE_PODPISOV", "AUDIT_LOG"],
        status: "TRIAL",
        verziaApp: "1.0.0",
        posledneOverenie: now.toISOString(),
        offlineDniPocet: 0,
      });

      await base44.entities.LicencneUdalostiLog.create({
        cas: now.toISOString(),
        udalost: "PRVA_AKTIVACIA",
        detail: "Trial verzia 30 dní",
        predchadzajuciStav: "NOT_ACTIVATED",
        novyStav: "TRIAL",
        vykonalAdmin: false,
      });

      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        toast.success("Skúšobná verzia aktivovaná na 30 dní");
        navigate("/");
      }, 2000);
    } catch {
      setLoading(false);
      setGlobalError(LICENSE_ERROR_MESSAGES.NETWORK_ERROR);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)" }}>

      {/* EULA Modal */}
      {eulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-slate-800">Licenčná zmluva a EULA</h3>
              <button onClick={() => setEulaModal(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">{EULA_TEXT}</pre>
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <Button onClick={() => { setEulaModal(false); setEula(true); }} className="bg-gov-blue hover:bg-gov-blue/90 text-white">
                Rozumiem a súhlasím
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-8 relative overflow-hidden">

        {/* Loading overlay */}
        {loading && !success && (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-10 rounded-2xl">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-lg font-semibold text-slate-700">Overujem licenciu…</p>
            <p className="text-sm text-slate-400 mt-1">Prosím čakajte</p>
          </div>
        )}

        {/* Success overlay */}
        {success && (
          <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10 rounded-2xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-xl font-bold text-green-700">Aktivácia úspešná!</p>
            <p className="text-sm text-slate-500 mt-1">Presmerovávam…</p>
          </div>
        )}

        {/* Logo + Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Aktivácia produktu</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pre začatie používania zadajte aktivačný kľúč, ktorý ste dostali pri zakúpení licencie.
          </p>
        </div>

        {/* Global error */}
        {globalError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{globalError}</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {/* License key */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1 block">Aktivačný kľúč *</Label>
            <Input
              value={form.licencnyKluc}
              onChange={handleKeyInput}
              placeholder="MTRK6-A8H3J-X2K9P-Q4M7R-Z1N5W"
              className={`h-11 font-mono tracking-wider text-center ${errors.licencnyKluc ? "border-red-400" : ""}`}
              maxLength={29}
            />
            {errors.licencnyKluc && <p className="text-xs text-red-600 mt-1">{errors.licencnyKluc}</p>}
            <p className="text-xs text-slate-400 mt-1">Kľúč ste dostali e-mailom po zaplatení faktúry</p>
          </div>

          {/* IČO + Obec */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">IČO obce *</Label>
              <Input
                value={form.obecIco}
                onChange={e => set("obecIco", e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="12345678"
                className={`h-11 font-mono ${errors.obecIco ? "border-red-400" : ""}`}
                maxLength={8}
              />
              {errors.obecIco && <p className="text-xs text-red-600 mt-1">{errors.obecIco}</p>}
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">Názov obce *</Label>
              <Input
                value={form.obecNazov}
                onChange={e => set("obecNazov", e.target.value)}
                placeholder="Obec Sabinov"
                className={`h-11 ${errors.obecNazov ? "border-red-400" : ""}`}
                maxLength={200}
              />
              {errors.obecNazov && <p className="text-xs text-red-600 mt-1">{errors.obecNazov}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1 block">Kontaktný e-mail *</Label>
            <Input
              type="email"
              value={form.kontaktEmail}
              onChange={e => set("kontaktEmail", e.target.value)}
              placeholder="starosta@sabinov.sk"
              className={`h-11 ${errors.kontaktEmail ? "border-red-400" : ""}`}
            />
            {errors.kontaktEmail && <p className="text-xs text-red-600 mt-1">{errors.kontaktEmail}</p>}
            <p className="text-xs text-slate-400 mt-1">Na tento e-mail budeme posielať dôležité oznámenia (predĺženia, aktualizácie)</p>
          </div>

          {/* EULA checkbox */}
          <div className="space-y-1">
            <div className="flex items-start gap-3">
              <Checkbox id="eula" checked={eula} onCheckedChange={setEula} className="mt-0.5" />
              <Label htmlFor="eula" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                Súhlasím s{" "}
                <button type="button" onClick={() => setEulaModal(true)} className="text-blue-600 underline hover:text-blue-800">
                  licenčnou zmluvou a EULA
                </button>
              </Label>
            </div>
            {errors.eula && <p className="text-xs text-red-600 ml-7">{errors.eula}</p>}
          </div>

          {/* Telemetry checkbox */}
          <div>
            <div className="flex items-start gap-3">
              <Checkbox id="telemetria" checked={telemetria} onCheckedChange={setTelemetria} className="mt-0.5" />
              <Label htmlFor="telemetria" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                Súhlasím s odosielaním anonymizovaných telemetrických dát pre účely overovania licencie a detekcie chýb
              </Label>
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-7">
              Telemetria obsahuje len: ID licencie, hardware ID, verziu aplikácie, počet záznamov v knihe (číslo, nie obsah).
              NIKDY neobsahuje osobné údaje občanov.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-end justify-between mt-6 pt-4 border-t border-slate-100">
          <a
            href="mailto:matrika@example.sk?subject=Žiadosť o aktivačný kľúč"
            className="text-xs text-blue-600 hover:underline"
          >
            Nemáte kľúč? Kontaktujte podporu
          </a>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <div className="flex flex-col items-center">
                <Button
                  variant="outline"
                  onClick={activateTrial}
                  disabled={loading}
                  className="border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
                >
                  Skúšobná verzia 30 dní
                </Button>
                <span className="text-[10px] text-slate-400 mt-0.5">Plná funkčnosť, bez tlače štítkov</span>
              </div>
              <Button
                onClick={activate}
                disabled={!isFormComplete || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-10"
              >
                AKTIVOVAŤ
              </Button>
            </div>
          </div>
          {import.meta.env.DEV && (
            <p className="text-[10px] text-slate-400 mt-2 text-right font-mono">
              keyValid: {keyValid ? "✅" : "❌"} icoValid: {icoValid ? "✅" : "❌"} obecValid: {obecValid ? "✅" : "❌"} emailValid: {emailValid ? "✅" : "❌"} eula: {eula ? "✅" : "❌"} telemetria: {telemetria ? "✅" : "❌"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}