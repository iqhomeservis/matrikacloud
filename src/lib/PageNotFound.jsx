import { Link } from 'react-router-dom';

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="text-center space-y-5">
        <div className="text-7xl">🔍</div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Stránka nenájdená</h1>
          <p className="text-slate-500">Požadovaná stránka neexistuje.</p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gov-blue text-white rounded-lg hover:bg-gov-blue/90 transition font-medium text-sm"
        >
          ← Späť na hlavnú stránku
        </Link>
      </div>
    </div>
  );
}