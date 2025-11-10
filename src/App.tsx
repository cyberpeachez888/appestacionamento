import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ParkingProvider, useParking } from "./contexts/ParkingContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Sidebar } from "./components/Sidebar";
import Operacional from "./pages/Operacional";
import Mensalistas from "./pages/Mensalistas";
import Financeiro from "./pages/Financeiro";
import RelatoriosMensais from "./pages/RelatoriosMensais";
import Users from "./pages/Users";
import Configuracoes from "./pages/Configuracoes";
import Tarifas from "./pages/Tarifas";
import Integracoes from './pages/Integracoes';
import ModelosRecibos from './pages/ModelosRecibos';
import HorarioFuncionamento from './pages/HorarioFuncionamento';
import HorariosFeriados from './pages/HorariosFeriados';
import ConfiguracoesDashboard from './pages/ConfiguracoesDashboard';
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import CashRegisterClosedDialog from "./components/CashRegisterClosedDialog";

const queryClient = new QueryClient();

const Protected: React.FC<{ children: React.ReactNode; required?: string | string[] }> = ({ children, required }) => {
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
    const allowed = requiredArray.every(r => hasPermission(r));
    if (!allowed) {
      return (
        <div className="flex-1 p-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold">Acesso negado</h2>
            <p className="text-sm text-muted-foreground">Você não possui as permissões necessárias.</p>
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
            <div className="flex min-h-screen w-full">
              {/* Hide sidebar on login route */}
              <SidebarWrapper />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Protected required={["openCloseCash"]}><Operacional /></Protected>} />
                <Route path="/mensalistas" element={<Protected required={["manageMonthlyCustomers"]}><Mensalistas /></Protected>} />
                <Route path="/financeiro" element={<Protected required={["viewReports"]}><Financeiro /></Protected>} />
                <Route path="/relatorios-mensais" element={<Protected required={["viewReports"]}><RelatoriosMensais /></Protected>} />
                <Route path="/users" element={<Protected required={["manageUsers"]}><Users /></Protected>} />
                <Route path="/tarifas" element={<Protected required={["manageRates"]}><Tarifas /></Protected>} />
                <Route path="/integracoes" element={<Protected><Integracoes /></Protected>} />
                <Route path="/modelos-recibos" element={<Protected><ModelosRecibos /></Protected>} />
                <Route path="/horarios-feriados" element={<Protected required={["manageCompanyConfig"]}><HorariosFeriados /></Protected>} />
                <Route path="/configuracoes-dashboard" element={<Protected required={["viewReports"]}><ConfiguracoesDashboard /></Protected>} />
                {/* Configurações: leitura permitida sem manageCompanyConfig, somente bloqueia edição dentro da página */}
                <Route path="/configuracoes" element={<Protected><Configuracoes /></Protected>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </ParkingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

const SidebarWrapper: React.FC = () => {
  const location = useLocation();
  const onLogin = location.pathname === '/login';
  return onLogin ? null : <Sidebar />;
};

export default App;
