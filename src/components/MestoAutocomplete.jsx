import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

export const OBCE_PRESOVSKY_KRAJ = [
  // OKRES SABINOV
  ["Bajerovce","08203","SB"],
  ["Bodovce","08204","SB"],
  ["Brezovica","08222","SB"],
  ["Brezovička","08207","SB"],
  ["Červená Voda","08206","SB"],
  ["Červenica pri Sabinove","08203","SB"],
  ["Ďačov","08205","SB"],
  ["Daletice","08212","SB"],
  ["Drienica","08204","SB"],
  ["Dubovica","08205","SB"],
  ["Hanigovce","08206","SB"],
  ["Hubošovce","08207","SB"],
  ["Jakovany","08301","SB"],
  ["Jakubova Voľa","08256","SB"],
  ["Jakubovany","08301","SB"],
  ["Jarovnice","08273","SB"],
  ["Kamenica","08212","SB"],
  ["Krásna Lúka","08214","SB"],
  ["Krivany","08213","SB"],
  ["Lipany","08271","SB"],
  ["Lúčka","08215","SB"],
  ["Ľutina","08216","SB"],
  ["Milpoš","08236","SB"],
  ["Nižný Slavkov","08276","SB"],
  ["Olejníkov","08244","SB"],
  ["Oľšov","08244","SB"],
  ["Ostrovany","08243","SB"],
  ["Pečovská Nová Ves","08242","SB"],
  ["Poloma","08275","SB"],
  ["Ratvaj","08274","SB"],
  ["Ražňany","08253","SB"],
  ["Renčišov","08261","SB"],
  ["Rožkovany","08257","SB"],
  ["Sabinov","08301","SB"],
  ["Šarišské Dravce","08233","SB"],
  ["Šarišské Michaľany","08232","SB"],
  ["Šarišské Sokolovce","08235","SB"],
  ["Tichý Potok","08237","SB"],
  ["Torysa","08238","SB"],
  ["Uzovce","08267","SB"],
  ["Uzovské Pekľany","08263","SB"],
  ["Uzovský Šalgov","08266","SB"],
  ["Vysoká","08276","SB"],
  // OKRES PREŠOV
  ["Abranovce","08241","PO"],
  ["Bajerov","08243","PO"],
  ["Bertotovce","08252","PO"],
  ["Brestov","08221","PO"],
  ["Bretejovce","08241","PO"],
  ["Brežany","08243","PO"],
  ["Bzenov","08221","PO"],
  ["Červenica","08237","PO"],
  ["Chminianska Nová Ves","08215","PO"],
  ["Chminianske Jakubovany","08215","PO"],
  ["Chmiňany","08215","PO"],
  ["Demjata","08241","PO"],
  ["Drienov","08243","PO"],
  ["Dulova Ves","08237","PO"],
  ["Fintice","08001","PO"],
  ["Fričovce","08221","PO"],
  ["Fulianka","08001","PO"],
  ["Geraltov","08237","PO"],
  ["Gregorovce","08241","PO"],
  ["Haniska","08001","PO"],
  ["Hendrichovce","08241","PO"],
  ["Hermanovce","08252","PO"],
  ["Hrabkov","08237","PO"],
  ["Janov","08237","PO"],
  ["Kapušany","08001","PO"],
  ["Kendice","08243","PO"],
  ["Klenov","08237","PO"],
  ["Kojatice","08241","PO"],
  ["Kokošovce","08237","PO"],
  ["Krížovany","08241","PO"],
  ["Lada","08237","PO"],
  ["Lažany","08241","PO"],
  ["Lemešany","08241","PO"],
  ["Ličartovce","08241","PO"],
  ["Lipníky","08001","PO"],
  ["Lipovce","08237","PO"],
  ["Ľubotice","08106","PO"],
  ["Ľubovec","08237","PO"],
  ["Malý Šariš","08001","PO"],
  ["Malý Slivník","08241","PO"],
  ["Medzany","08241","PO"],
  ["Miklušovce","08241","PO"],
  ["Mirkovce","08241","PO"],
  ["Mošurov","08237","PO"],
  ["Nemcovce","08237","PO"],
  ["Okružná","08001","PO"],
  ["Ondrašovce","08241","PO"],
  ["Petrovany","08241","PO"],
  ["Podhorany","08241","PO"],
  ["Podhradík","08237","PO"],
  ["Prešov","08001","PO"],
  ["Proč","08237","PO"],
  ["Radatice","08241","PO"],
  ["Rokycany","08237","PO"],
  ["Ruská Nová Ves","08001","PO"],
  ["Sedlice","08241","PO"],
  ["Seniakovce","08241","PO"],
  ["Šarišská Poruba","08237","PO"],
  ["Šarišská Trstená","08241","PO"],
  ["Šarišské Bohdanovce","08241","PO"],
  ["Šindliar","08237","PO"],
  ["Široké","08237","PO"],
  ["Štefanovce","08001","PO"],
  ["Suchá Dolina","08237","PO"],
  ["Svinia","08241","PO"],
  ["Terňa","08237","PO"],
  ["Trnkov","08241","PO"],
  ["Tulčík","08241","PO"],
  ["Varhaňovce","08001","PO"],
  ["Veľký Šariš","08201","PO"],
  ["Záborské","08001","PO"],
  ["Župčany","08241","PO"],
  // OKRES BARDEJOV
  ["Bardejov","08501","BJ"],
  ["Bardejovské Kúpele","08506","BJ"],
  ["Becherov","08601","BJ"],
  ["Dlhá Lúka","08601","BJ"],
  ["Gaboltov","08601","BJ"],
  ["Hervartov","08601","BJ"],
  ["Kobyly","08601","BJ"],
  ["Komárov","08601","BJ"],
  ["Kríže","08601","BJ"],
  ["Lenartov","08601","BJ"],
  ["Lukavica","08601","BJ"],
  ["Lukov","08601","BJ"],
  ["Nižná Polianka","08601","BJ"],
  ["Nižný Tvarožec","08601","BJ"],
  ["Oľšavce","08601","BJ"],
  ["Osikov","08601","BJ"],
  ["Raslavice","08601","BJ"],
  ["Rokytov","08601","BJ"],
  ["Soľ","08601","BJ"],
  ["Sveržov","08601","BJ"],
  ["Tročany","08601","BJ"],
  ["Vyšná Polianka","08601","BJ"],
  ["Zborov","08601","BJ"],
  // OKRES HUMENNÉ
  ["Humenné","06601","HE"],
  ["Brekov","06601","HE"],
  ["Chlmec","06601","HE"],
  ["Jasenov","06601","HE"],
  ["Kamenica nad Cirochou","06901","HE"],
  ["Koškovce","06601","HE"],
  ["Lackovce","06601","HE"],
  ["Ohradzany","06601","HE"],
  ["Pakostov","06601","HE"],
  ["Ptičie","06601","HE"],
  ["Slovenská Volová","06601","HE"],
  ["Stankovce","06601","HE"],
  ["Udavské","06601","HE"],
  ["Unín","06601","HE"],
  ["Veľopolie","06601","HE"],
  ["Zubné","06901","HE"],
  // OKRES KEŽMAROK
  ["Kežmarok","06001","KK"],
  ["Ľubica","06001","KK"],
  ["Spišská Belá","05901","KK"],
  ["Stará Lesná","05960","KK"],
  ["Tatranská Lomnica","05960","KK"],
  ["Veľká Lomnica","06001","KK"],
  ["Vlková","06001","KK"],
  ["Vrbov","06001","KK"],
  ["Výborná","06001","KK"],
  ["Žakovce","06001","KK"],
  // OKRES LEVOČA
  ["Levoča","05401","LE"],
  ["Andrejová","05401","LE"],
  ["Doľany","05401","LE"],
  ["Dravce","05401","LE"],
  ["Harakovce","05401","LE"],
  ["Hozelec","05901","LE"],
  ["Jablonov","05301","LE"],
  ["Klčov","05301","LE"],
  ["Kyjov","05401","LE"],
  ["Markušovce","05316","LE"],
  ["Nemešany","05401","LE"],
  ["Olšavica","05401","LE"],
  ["Spišský Štvrtok","05341","LE"],
  ["Tvarožná","05401","LE"],
  ["Závada","05401","LE"],
  // OKRES MEDZILABORCE
  ["Medzilaborce","06801","ML"],
  ["Čabiny","06901","ML"],
  ["Kalinov","06801","ML"],
  ["Krásny Brod","06801","ML"],
  ["Repejov","06801","ML"],
  ["Sukov","06801","ML"],
  ["Valentovce","06801","ML"],
  // OKRES POPRAD
  ["Poprad","05801","PP"],
  ["Batizovce","05933","PP"],
  ["Gánovce","05817","PP"],
  ["Lučivná","05901","PP"],
  ["Mengusovce","05921","PP"],
  ["Spišská Sobota","05801","PP"],
  ["Starý Smokovec","06201","PP"],
  ["Svit","05921","PP"],
  ["Štrbské Pleso","05985","PP"],
  ["Tatranská Kotlina","06290","PP"],
  ["Tatranská Štrba","05985","PP"],
  ["Velické","05801","PP"],
  ["Vysoké Tatry","06201","PP"],
  // OKRES SNINA
  ["Snina","06901","SI"],
  ["Belá nad Cirochou","06901","SI"],
  ["Hostovice","06901","SI"],
  ["Kolbasov","06901","SI"],
  ["Nová Sedlica","06901","SI"],
  ["Ostrožnica","06901","SI"],
  ["Parihuzovce","06901","SI"],
  ["Pčoliné","06901","SI"],
  ["Príslop","06901","SI"],
  ["Runina","06765","SI"],
  ["Ubľa","06979","SI"],
  ["Ulič","06979","SI"],
  ["Uličské Krivé","06979","SI"],
  ["Zemplínske Hámre","06901","SI"],
  // OKRES STARÁ ĽUBOVŇA
  ["Stará Ľubovňa","06401","SL"],
  ["Červený Kláštor","06506","SL"],
  ["Fordušice","06401","SL"],
  ["Jakubany","06513","SL"],
  ["Kolačkov","06401","SL"],
  ["Kremná","06401","SL"],
  ["Lacková","06401","SL"],
  ["Lesnica","06506","SL"],
  ["Litmanová","06513","SL"],
  ["Lomnička","06401","SL"],
  ["Mníšek nad Popradom","06401","SL"],
  ["Nižné Ružbachy","06540","SL"],
  ["Orlov","06401","SL"],
  ["Plavnica","06401","SL"],
  ["Plaveč","06501","SL"],
  ["Podolínec","06503","SL"],
  ["Ruská Voľa","06401","SL"],
  ["Sulín","06401","SL"],
  ["Toporec","06401","SL"],
  ["Vyšné Ružbachy","06540","SL"],
  // OKRES STROPKOV
  ["Stropkov","09101","SK"],
  ["Bžany","09101","SK"],
  ["Chotča","09101","SK"],
  ["Dlhoňa","09101","SK"],
  ["Duplín","09101","SK"],
  ["Havaj","08266","SK"],
  ["Kožuchovce","09101","SK"],
  ["Makovce","09101","SK"],
  ["Miňovce","09101","SK"],
  ["Mrázovce","09101","SK"],
  ["Soľník","09101","SK"],
  ["Tisinec","09101","SK"],
  ["Turany nad Ondavou","09101","SK"],
  ["Valkov","09101","SK"],
  ["Vladiča","09101","SK"],
  // OKRES SVIDNÍK
  ["Svidník","08901","SK"],
  ["Dlhé","08901","SK"],
  ["Dubová","08901","SK"],
  ["Fijaš","08901","SK"],
  ["Giraltovce","08701","SK"],
  ["Kapišová","08901","SK"],
  ["Kručov","08901","SK"],
  ["Ladomirová","08901","SK"],
  ["Lúčka","08901","SK"],
  ["Nižná Jedľová","08901","SK"],
  ["Nižný Mirošov","08701","SK"],
  ["Potoky","08901","SK"],
  ["Rakovčík","08901","SK"],
  ["Šandal","08701","SK"],
  ["Šarbov","08901","SK"],
  ["Vápeník","08901","SK"],
  ["Vyšná Jedľová","08901","SK"],
  ["Vyšný Mirošov","08701","SK"],
  // OKRES VRANOV NAD TOPĽOU
  ["Vranov nad Topľou","09301","VT"],
  ["Bystré","09301","VT"],
  ["Čaklov","09401","VT"],
  ["Dlhé Klčovo","09301","VT"],
  ["Hanušovce nad Topľou","09431","VT"],
  ["Hermanovce nad Topľou","09301","VT"],
  ["Hencovce","09301","VT"],
  ["Horovce","09301","VT"],
  ["Kučín","09301","VT"],
  ["Merník","09301","VT"],
  ["Nižný Hrušov","09301","VT"],
  ["Petrova","09301","VT"],
  ["Poša","09301","VT"],
  ["Sačurov","09401","VT"],
  ["Soľ","09301","VT"],
  ["Tovarné","09301","VT"],
  ["Vlača","09301","VT"],
  ["Vyšný Hrušov","09301","VT"],
  ["Zámutov","09301","VT"],
];

export function filterObce(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const starts = OBCE_PRESOVSKY_KRAJ.filter(([n]) => n.toLowerCase().startsWith(q));
  const includes = OBCE_PRESOVSKY_KRAJ.filter(([n]) => !n.toLowerCase().startsWith(q) && n.toLowerCase().includes(q));
  return [...starts, ...includes].slice(0, 8);
}

export function getObecByPsc(psc) {
  const digits = psc.replace(/\s/g, "");
  return OBCE_PRESOVSKY_KRAJ.find(([, p]) => p === digits) || null;
}

export function formatPsc(digits) {
  return digits.length >= 5 ? digits.slice(0, 3) + " " + digits.slice(3, 5) : digits;
}

export default function MestoAutocomplete({ value, onChange, onSelect, style, className }) {
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    const sugs = filterObce(val);
    setSuggestions(sugs);
    setOpen(sugs.length > 0);
    setActiveIdx(-1);
  };

  const handleSelect = (item) => {
    const [nazov, psc] = item;
    onSelect(nazov, formatPsc(psc));
    setSuggestions([]);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); handleSelect(suggestions[activeIdx]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const OKRES_LABEL = { SB: "Sabinov", PO: "Prešov", BJ: "Bardejov", HE: "Humenné", KK: "Kežmarok", LE: "Levoča", ML: "Medzilaborce", PP: "Poprad", SI: "Snina", SL: "St. Ľubovňa", SK: "Stropkov/Svidník", VT: "Vranov" };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        className={`h-10 pr-7 ${className || ""}`}
        placeholder="Prešov"
        style={style}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((item, idx) => {
            const [nazov, psc, okres] = item;
            return (
              <button
                key={`${nazov}-${psc}`}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-sm hover:bg-blue-50 transition-colors ${activeIdx === idx ? "bg-blue-50" : ""}`}
              >
                <span className="font-medium text-slate-800">{nazov}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs text-slate-500">{formatPsc(psc)}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1">{OKRES_LABEL[okres] || okres}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}