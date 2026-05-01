export default function SourceBadge({ source }) {
  if (!source) return null;
  
  const config = {
    eID_NFC: { label: "čip + cert.", color: "bg-green-100 text-green-800 border-green-200", dot: "bg-green-500" },
    ePass_NFC: { label: "NFC čip", color: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500" },
    MANUAL: { label: "manuálne", color: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  };

  const c = config[source] || config.MANUAL;

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}