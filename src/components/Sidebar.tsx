import { NavLink } from 'react-router-dom';
import { Car, Users as UsersIcon, DollarSign, Receipt, Settings, FileText, Plug, FileCheck, Calendar, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParking } from '@/contexts/ParkingContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const Sidebar = () => {
  const { cashIsOpen } = useParking();
  const { user, logout, hasPermission, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  // Permission-gated nav items
  const navItems = [
    { to: '/', icon: Car, label: 'Operacional', perm: 'openCloseCash' },
    { to: '/mensalistas', icon: UsersIcon, label: 'Mensalistas', perm: 'manageMonthlyCustomers' },
    { to: '/financeiro', icon: DollarSign, label: 'Financeiro', perm: 'viewReports' },
    { to: '/relatorios-mensais', icon: FileText, label: 'Relatórios Mensais', perm: 'viewReports' },
    { to: '/users', icon: UsersIcon, label: 'Usuários', perm: 'manageUsers' },
    { to: '/tarifas', icon: Receipt, label: 'Gerenciar Tarifas', perm: 'manageRates' },
    { to: '/horarios-feriados', icon: Calendar, label: 'Horários e Feriados', perm: 'manageCompanyConfig' },
    { to: '/configuracoes-dashboard', icon: BarChart3, label: 'Dashboard Analytics', perm: 'viewReports' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações', perm: 'manageCompanyConfig' },
  ].filter(item => hasPermission(item.perm));

  // Add integrations for admins only
  if (isAdmin) {
    navItems.push({ to: '/integracoes', icon: Plug, label: 'Integrações', perm: '' });
    navItems.push({ to: '/modelos-recibos', icon: FileCheck, label: 'Modelos de Recibos', perm: '' });
  }

  return (
    <aside className="w-64 bg-sidebar-background text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-primary">
          Estacionamento
        </h1>
        <p className="text-sm text-sidebar-foreground/70 mt-1">Sistema de Gestão</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isFinance = item.to === '/financeiro';
          const isReports = item.to === '/relatorios-mensais';
          const disabled = !cashIsOpen && !isFinance && !isReports;
          return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                disabled ? 'opacity-50 pointer-events-none' : '',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex flex-col items-start gap-2">
          <div className="w-full flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{user?.name || '—'}</div>
              <div className="text-xs text-sidebar-foreground/60">{user?.role || ''}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                toast({ title: 'Sessão encerrada' });
                navigate('/login');
              }}
            >
              Sair
            </Button>
          </div>
          <p className="text-xs text-sidebar-foreground/60 text-center w-full">© 2024 Estacionamento</p>
        </div>
      </div>
    </aside>
  );
};
