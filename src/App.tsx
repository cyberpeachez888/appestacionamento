import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ParkingProvider, useParking } from './contexts/ParkingContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import Operacional from './pages/Operacional';
import Mensalistas from './pages/Mensalistas';
import Financeiro from './pages/Financeiro';
import RelatoriosMensais from './pages/RelatoriosMensais';
import Users from './pages/Users';
import Configuracoes from './pages/Configuracoes';
import Tarifas from './pages/Tarifas';
import Integracoes from './pages/Integracoes';
import ModelosRecibos from './pages/ModelosRecibos';
import HorarioFuncionamento from './pages/HorarioFuncionamento';
import HorariosFeriados from './pages/HorariosFeriados';
import ConfiguracoesDashboard from './pages/ConfiguracoesDashboard';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SetupWizard from './pages/SetupWizard';
import CashRegisterClosedDialog from './components/CashRegisterClosedDialog';
import { useEffect, useState } from 'react';

const queryClient = new QueryClient();

// Normalize API URL to always include /api (same logic as api.ts)
let apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Normalize: remove trailing slash, extract base URL (remove any existing paths), then add /api
if (apiBase.endsWith('/')) {
  apiBase = apiBase.slice(0, -1);
}

// If it's a full URL (starts with http:// or https://), extract just the origin
// This handles cases where VITE_API_URL might include paths like /health
if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
  try {
    const url = new URL(apiBase);
    apiBase = `${url.protocol}//${url.host}`;
  } catch (e) {
    // If URL parsing fails, try to extract origin manually
    const match = apiBase.match(/^(https?:\/\/[^\/]+)/);
    if (match) {
      apiBase = match[1];
    }
  }
}

// Ensure it ends with /api
if (!apiBase.endsWith('/api')) {
  apiBase = `${apiBase}/api`;
}

const API_URL = apiBase;

// Component to check if setup is needed
const SetupGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Skip check if already on setup page
    if (location.pathname === '/setup') {
      setLoading(false);
      return;
    }

    const checkSetup = async () => {
      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        // Silently proceed if timeout - backend may be hibernating
        setNeedsSetup(false);
        setLoading(false);
      }, 15000); // 15 second timeout (gives Render more time to wake up)

      try {
        const controller = new AbortController();
        const timeoutSignal = setTimeout(() => controller.abort(), 12000); // 12 second abort

        const url = `${API_URL}/setup/check-first-run`;
        
        const response = await fetch(url, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutSignal);
        clearTimeout(timeoutId);
        
        // Check if response is actually JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.warn('[SetupGuard] Non-JSON response - backend may be hibernating');
          throw new Error('Server returned non-JSON response');
        }
        
        const data = await response.json();
        setNeedsSetup(data.needsSetup || false);
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        // Silently handle errors - fail open to allow app to continue
        // This is expected when Render is hibernating or network is slow
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          // Request was aborted due to timeout - this is normal for hibernating services
          // No need to log as error, just proceed
        } else if (error.message?.includes('CORS') || error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
          // Network/CORS errors are expected when backend is hibernating
          // No need to log as error
        } else {
          // Only log unexpected errors
          console.warn('[SetupGuard] Setup check failed, proceeding anyway:', error.message || error);
        }
        
        // Assume setup is not needed if check fails (fail open)
        // This allows the app to continue even if backend is unavailable
        setNeedsSetup(false);
      } finally {
        setLoading(false);
      }
    };

    checkSetup();
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando configuração...</p>
        </div>
      </div>
    );
  }

  if (needsSetup && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};

const Protected: React.FC<{ children: React.ReactNode; required?: string | string[] }> = ({
  children,
  required,
}) => {
  const { cashIsOpen } = useParking();
  const { isAuthenticated, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Permission check (accept single or array; admins pass via hasPermission logic)
  if (required) {
    const requiredArray = Array.isArray(required) ? required : [required];
    const allowed = requiredArray.every((r) => hasPermission(r));
    if (!allowed) {
      return (
        <div className="flex-1 p-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold">Acesso negado</h2>
            <p className="text-sm text-muted-foreground">
              Você não possui as permissões necessárias.
            </p>
          </div>
        </div>
      );
    }
  }
  const isFinance = location.pathname === '/financeiro';
  const isReports = location.pathname === '/relatorios-mensais';
  const blocked = !cashIsOpen && !isFinance && !isReports;
  return (
    <>
      <CashRegisterClosedDialog open={blocked} />
      {blocked ? <Navigate to="/financeiro" replace /> : <>{children}</>}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ParkingProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SetupGuard>
              <LayoutWrapper>
                <Routes>
                  <Route path="/setup" element={<SetupWizard />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route
                    path="/"
                    element={
                      <Protected required={['openCloseCash']}>
                        <Operacional />
                      </Protected>
                    }
                  />
                  <Route
                    path="/mensalistas"
                    element={
                      <Protected required={['manageMonthlyCustomers']}>
                        <Mensalistas />
                      </Protected>
                    }
                  />
                  <Route
                    path="/financeiro"
                    element={
                      <Protected required={['viewReports']}>
                        <Financeiro />
                      </Protected>
                    }
                  />
                  <Route
                    path="/relatorios-mensais"
                    element={
                      <Protected required={['viewReports']}>
                        <RelatoriosMensais />
                      </Protected>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <Protected required={['manageUsers']}>
                        <Users />
                      </Protected>
                    }
                  />
                  <Route
                    path="/tarifas"
                    element={
                      <Protected required={['manageRates']}>
                        <Tarifas />
                      </Protected>
                    }
                  />
                  <Route
                    path="/integracoes"
                    element={
                      <Protected>
                        <Integracoes />
                      </Protected>
                    }
                  />
                  <Route
                    path="/modelos-recibos"
                    element={
                      <Protected>
                        <ModelosRecibos />
                      </Protected>
                    }
                  />
                  <Route
                    path="/horarios-feriados"
                    element={
                      <Protected required={['manageCompanyConfig']}>
                        <HorariosFeriados />
                      </Protected>
                    }
                  />
                  <Route
                    path="/configuracoes-dashboard"
                    element={
                      <Protected required={['viewReports']}>
                        <ConfiguracoesDashboard />
                      </Protected>
                    }
                  />
                  {/* Configurações: leitura permitida sem manageCompanyConfig, somente bloqueia edição dentro da página */}
                  <Route
                    path="/configuracoes"
                    element={
                      <Protected>
                        <Configuracoes />
                      </Protected>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </LayoutWrapper>
            </SetupGuard>
          </BrowserRouter>
        </TooltipProvider>
      </ParkingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

const SidebarWrapper: React.FC = () => {
  const location = useLocation();
  const onLoginOrSetup =
    location.pathname === '/login' ||
    location.pathname === '/setup' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password';
  return onLoginOrSetup ? null : <Sidebar />;
};

const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const onLoginOrSetup =
    location.pathname === '/login' ||
    location.pathname === '/setup' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password';

  // No flex layout for login/setup - full width centered
  if (onLoginOrSetup) {
    return <>{children}</>;
  }

  // Flex layout with sidebar for other pages
  return (
    <div className="flex min-h-screen w-full">
      <SidebarWrapper />
      {children}
    </div>
  );
};

export default App;
