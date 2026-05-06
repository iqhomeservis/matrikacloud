import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CanDialog({ onConfirm, onCancel }) {
  const [can, setCan] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🆔</div>
          <h2 className="text-lg font-bold text-gov-blue">Zadajte CAN kód</h2>
        </div>
        <p className="text-sm text-slate-600 mb-5 text-center">
          CAN je <strong>6-miestne číslo</strong> vytlačené na prednej strane občianskeho preukazu
          v pravom dolnom rohu pri fotografii.
        </p>
        <Input
          value={can}
          onChange={e => setCan(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          placeholder="000000"
          className="h-14 text-center text-3xl font-mono tracking-[0.5em] mb-5"
          autoFocus
          onKeyDown={e => { if (e.key === "Enter" && can.length === 6) onConfirm(can); }}
        />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">Zrušiť</Button>
          <Button
            onClick={() => onConfirm(can)}
            disabled={can.length !== 6}
            className="flex-1 bg-gov-blue hover:bg-gov-blue/90"
          >
            Pokračovať →
          </Button>
        </div>
      </div>
    </div>
  );
}