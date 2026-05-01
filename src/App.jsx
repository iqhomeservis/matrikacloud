import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import NovyZaznam from './pages/NovyZaznam';
import KnihaZaznamov from './pages/KnihaZaznamov';
import Nastavenia from './pages/Nastavenia';
import AuditLogPage from './pages/AuditLogPage';
import ZalohyIntegrita from './pages/ZalohyIntegrita';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gov-light">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-gov-blue rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Načítavam aplikáciu…</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<NovyZaznam />} />
        <Route path="/kniha" element={<KnihaZaznamov />} />
        <Route path="/nastavenia" element={<Nastavenia />} />
        <Route path="/audit" element={<AuditLogPage />} />
        <Route path="/zalohy" element={<ZalohyIntegrita />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App