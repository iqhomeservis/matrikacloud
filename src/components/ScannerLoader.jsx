import { useState, useEffect } from "react";

const SCAN_CONFIG = {
  "twain-ocr": { text: "Skenujem doklad...", sub: "OCR rozpoznáva údaje", duration: 4000 },
  "pcsc-nfc":  { text: "Čítam čip...",       sub: "Komunikujem s čipom dokladu", duration: 2000 },
  "camera-ocr":{ text: "Analyzujem obraz...", sub: "Spracovávam snímku kamery", duration: 3000 },
};

export default function ScannerLoader({ plugin, onComplete, onCancel }) {
  const [progress, setProgress] = useState(0);
  const cfg = SCAN_CONFIG[plugin.pluginId] || { text: "Spracovávam...", sub: "", duration: 2000 };

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const p = Math.min(((Date.now() - start) / cfg.duration) * 100, 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => onComplete(plugin.testovacieMockData || {}), 200);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="text-6xl mb-4 animate-pulse">{plugin.ikona}</div>
        <h2 className="text-xl font-bold text-gov-blue mb-1">{cfg.text}</h2>
        <p className="text-sm text-slate-500 mb-6">{cfg.sub}</p>
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6">
          <div
            className="bg-gov-blue h-2.5 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mb-4">{plugin.nazov}</p>
        <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600 transition">
          Zrušiť
        </button>
      </div>
    </div>
  );
}