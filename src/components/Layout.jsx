import { Outlet, Link, useLocation } from "react-router-dom";
import { BookOpen, PlusCircle, Settings, Shield, Archive, Menu, X } from "lucide-react";
import { useState } from "react";
import StatusBar from "./StatusBar";

const navItems = [
  { path: "/", label: "Nový záznam", icon: PlusCircle },
  { path: "/kniha", label: "Kniha záznamov", icon: BookOpen },
  { path: "/nastavenia", label: "Nastavenia", icon: Settings },
  { path: "/audit", label: "Audit log", icon: Shield },
  { path: "/zalohy", label: "Zálohy a integrita", icon: Archive },
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top header */}
      <header className="bg-gov-blue text-white shadow-lg z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1 rounded hover:bg-white/10 transition"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gov-gold rounded flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-gov-blue" />
              </div>
              <div>
                <div className="font-bold text-sm leading-tight">Digitálna matrika</div>
                <div className="text-xs text-blue-200 leading-tight">Asistent overovania</div>
              </div>
            </div>
          </div>
          <StatusBar />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav
          className={`
            fixed lg:static inset-y-0 left-0 z-40 w-56 bg-gov-dark text-white
            transform transition-transform duration-200 ease-in-out pt-14 lg:pt-0
            ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="p-2 space-y-0.5 mt-2">
            {navItems.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? "bg-gov-gold text-gov-blue"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Overlay for mobile */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}