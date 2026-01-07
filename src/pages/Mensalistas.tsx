import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CustomerDialog } from '@/components/CustomerDialog';
import { PaymentDialog } from '@/components/PaymentDialog';
import { MensalistasDetailPanel } from '@/components/MensalistasDetailPanel';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useParking, MonthlyCustomer } from '@/contexts/ParkingContext';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { calculateCustomerStatus, getRowBackgroundColor } from '@/types/mensalistas';

// Helper function to format payment method display
const formatPaymentMethod = (method: string | undefined): string => {
  if (!method) return '-';

  const methodMap: Record<string, string> = {
    cash: 'Dinheiro',
    pix: 'Pix',
    debit_card: 'Cartão Débito',
    credit_card: 'Cartão Crédito',
    Dinheiro: 'Dinheiro',
    Pix: 'Pix',
    'Cartão Débito': 'Cartão Débito',
    'Cartão Crédito': 'Cartão Crédito',
  };

  return methodMap[method] || method;
};

export default function Mensalistas() {
  const { toast } = useToast();
  const { monthlyCustomers, deleteMonthlyCustomer } = useParking();
  const { hasPermission } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<MonthlyCustomer>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // --- AÇÕES ---
  const handleAddNew = () => {
    if (!hasPermission('manageMonthlyCustomers')) return;
    setSelectedCustomer(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (customer: MonthlyCustomer) => {
    if (!hasPermission('manageMonthlyCustomers')) return;
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleRegisterPayment = (customer: MonthlyCustomer) => {
    if (!hasPermission('manageMonthlyCustomers')) return;
    setSelectedCustomer(customer);
    setPaymentDialogOpen(true);
  };

  const handleDelete = async (customer: MonthlyCustomer) => {
    if (!hasPermission('manageMonthlyCustomers')) return;
    if (!confirm(`Deseja realmente remover o cliente ${customer.name}?`)) return;

    try {
      await deleteMonthlyCustomer(customer.id);
      toast({
        title: 'Cliente removido',
        description: 'O cliente foi excluído com sucesso',
        variant: 'default'
      });
    } catch (err) {
      console.error('Erro ao remover cliente:', err);
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover o cliente',
        variant: 'destructive'
      });
    }
  };

  // ESC key handler to deselect row
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCustomerId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle row click
  const handleRowClick = (customerId: string) => {
    setSelectedCustomerId(customerId);
  };

  const canManage = hasPermission('manageMonthlyCustomers');

  // Performance: Calculate status with useMemo to avoid re-calculation on every render
  const customersWithStatus = useMemo(() =>
    monthlyCustomers.map(customer => ({
      ...customer,
      statusInfo: calculateCustomerStatus(customer.dueDate)
    })),
    [monthlyCustomers]
  );

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customersWithStatus;

    const term = searchTerm.toLowerCase();
    return customersWithStatus.filter(customer =>
      customer.name.toLowerCase().includes(term) ||
      customer.plates.some(plate => plate.toLowerCase().includes(term)) ||
      customer.parkingSlot?.toString().includes(term)
    );
  }, [customersWithStatus, searchTerm]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const total = customersWithStatus.length;
    const emDia = customersWithStatus.filter(c => c.statusInfo.status === 'Em dia').length;
    const atrasados = customersWithStatus.filter(c =>
      c.statusInfo.status === 'Atrasado' || c.statusInfo.status === 'Atraso crítico'
    ).length;
    const totalRevenue = customersWithStatus.reduce((sum, c) => sum + c.value, 0);

    return { total, emDia, atrasados, totalRevenue };
  }, [customersWithStatus]);

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mensalistas</h1>
            <p className="text-muted-foreground mt-1">Gestão de clientes recorrentes</p>
            {!canManage && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  Somente leitura
                </Badge>
              </div>
            )}
          </div>
          {canManage && (
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Cliente
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Total de Clientes</div>
            <div className="text-2xl font-bold mt-1">{summary.total}</div>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Em Dia</div>
            <div className="text-2xl font-bold mt-1 text-green-600">{summary.emDia}</div>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Atrasados</div>
            <div className="text-2xl font-bold mt-1 text-red-600">{summary.atrasados}</div>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Receita Mensal</div>
            <div className="text-2xl font-bold mt-1">R$ {summary.totalRevenue.toFixed(2)}</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por nome, placa ou vaga..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          />
        </div>

        <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                    Placas
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                    Vaga Reservada
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Valor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                    Data de Contratação
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                    Próximo Vencimento
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                    Último Pagamento
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                    Método de Pagamento
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                      {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer, index) => {
                    const isSelected = selectedCustomerId === customer.id;
                    const rowBgColor = getRowBackgroundColor(customer.statusInfo.status, isSelected, index);

                    return (
                      <ContextMenu key={customer.id}>
                        <ContextMenuTrigger asChild>
                          <tr
                            className={`cursor-pointer transition-colors ${rowBgColor}`}
                            onClick={() => handleRowClick(customer.id)}
                          >
                            <td className="px-4 py-3 font-medium">{customer.name}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {customer.plates.map((plate: string, idx: number) => (
                                  <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                                    {plate}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                Vaga {customer.parkingSlot}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium">
                              R$ {customer.value.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {customer.contractDate && !isNaN(new Date(customer.contractDate).getTime())
                                ? format(new Date(customer.contractDate), 'dd/MM/yyyy', {
                                  locale: ptBR,
                                })
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {customer.dueDate && !isNaN(new Date(customer.dueDate).getTime())
                                ? format(new Date(customer.dueDate), 'dd/MM/yyyy', { locale: ptBR })
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {customer.lastPayment && !isNaN(new Date(customer.lastPayment).getTime())
                                ? format(new Date(customer.lastPayment), 'dd/MM/yyyy', {
                                  locale: ptBR,
                                })
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {customer.lastPaymentMethod ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-muted">
                                  {formatPaymentMethod(customer.lastPaymentMethod)}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.statusInfo.bgColor} ${customer.statusInfo.textColor}`}
                              >
                                {customer.statusInfo.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              {canManage && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRegisterPayment(customer);
                                  }}
                                >
                                  Registrar Pagamento
                                </Button>
                              )}
                            </td>
                          </tr>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          {canManage && (
                            <>
                              <ContextMenuItem onClick={() => handleEdit(customer)}>
                                Editar
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleRegisterPayment(customer)}>
                                Efetuar Pagamento
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => handleDelete(customer)}
                                className="text-destructive"
                              >
                                Remover
                              </ContextMenuItem>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedCustomerId && (() => {
          const selectedCustomer = monthlyCustomers.find(c => c.id === selectedCustomerId);
          if (!selectedCustomer) return null;
          const statusInfo = calculateCustomerStatus(selectedCustomer.dueDate);
          return (
            <MensalistasDetailPanel
              customer={selectedCustomer}
              statusInfo={statusInfo}
            />
          );
        })()}
      </div>

      <CustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={selectedCustomer} />
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        customer={selectedCustomer}
      />
    </div>
  );
}
