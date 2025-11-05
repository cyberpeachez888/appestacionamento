import { NavLink } from 'react-router-dom';
import { Car, Users, DollarSign, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
  const navItems = [
    { to: '/', icon: Car, label: 'Operacional' },
    { to: '/mensalistas', icon: Users, label: 'Mensalistas' },
    { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
  ];

  return (
    <aside className="w-64 bg-sidebar-background text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-primary">
          Estacionamento
        </h1>
        <p className="text-sm text-sidebar-foreground/70 mt-1">Sistema de Gestão</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60 text-center">
          © 2024 Estacionamento
        </p>
      </div>
    </aside>
  );
};
