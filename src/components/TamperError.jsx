import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function TamperError({ code, onReset }) {
  const navigate = useNavigate();

  const handleReset = async () => {
    try {
      const list = await base44.entities.Licencia.list("-created_date", 1);
      if (list[0]) await base44.entities.Licencia.update(list[0].id, { status: "NOT_ACTIVATED" });
    } catch {}
    navigate("/aktivacia");
    onReset?.();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-red-950 flex flex-col items-center justify-center text-white p-8">
      <div className="text-6xl mb-6">🔴</div>
      <h1 className="text-2xl font-bold mb-3 text-red-100">Nesúlad údajov licencie</h1>
      <p className="text-red-200 mb-2 text-center max-w-md">
        Bola detekovaná nezrovnalosť v licenčných údajoch. Prístup do aplikácie bol zablokovaný.
      </p>
      <p className="font-mono text-sm bg-red-900 px-4 py-2 rounded-lg mb-8 text-red-300">
        Kód: {code}
      </p>
      <div className="flex gap-4">
        <a
          href={`mailto:support@matrikacloud.sk?subject=Chyba%20${code}`}
          className="px-6 py-2.5 rounded-lg border-2 border-red-400 text-red-100 hover:bg-red-900 transition font-semibold"
        >
          ✉️ Kontaktovať podporu
        </a>
        <button
          onClick={handleReset}
          className="px-6 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 text-white transition font-semibold"
        >
          🔓 Resetovať licenciu
        </button>
      </div>
    </div>
  );
}