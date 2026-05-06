import { X } from "lucide-react";

const sections = [
  {
    title: "Hlavné akcie",
    rows: [
      ["F2", "Načítať doklad zo skenera"],
      ["F3", "Prepnúť Listina / Podpis"],
      ["F4", "Tlačiť štítky"],
      ["F8", "Uložiť bez tlače"],
      ["F9", "Vyplniť manuálne"],
      ["Esc", "Zrušiť / Zatvoriť"],
    ],
  },
  {
    title: "Navigácia",
    rows: [
      ["Ctrl+N", "Nový záznam"],
      ["Ctrl+K", "Kniha záznamov"],
      ["Ctrl+,", "Nastavenia"],
      ["Ctrl+/", "Táto nápoveda"],
    ],
  },
];

export default function KeyboardShortcutsModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[9000] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gov-blue text-white">
          <h2 className="font-bold text-lg">⌨️ Pomoc — Klávesové skratky</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/20 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sections */}
        <div className="px-6 py-5 space-y-5">
          {sections.map(({ title, rows }) => (
            <div key={title}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</h3>
              <div className="rounded-xl overflow-hidden border border-slate-100">
                {rows.map(([key, action], i) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between px-4 py-2.5 ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <kbd className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 text-xs font-mono font-bold px-2 py-1 rounded">
                      {key}
                    </kbd>
                    <span className="text-sm text-slate-700">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Zákon footer */}
          <p className="text-xs text-slate-400 text-center pt-1">
            Overovanie podľa zákona č. 599/2001 Z. z.
          </p>
        </div>
      </div>
    </div>
  );
}