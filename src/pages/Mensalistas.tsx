import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CustomerDialog } from '@/components/CustomerDialog';
import { PaymentDialog } from '@/components/PaymentDialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useToast } from '@/hooks/use-toast';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useParking } from '@/contexts/ParkingContext'; // Importar contexto

export default function Mensalistas() {
  const { toast } = useToast();
  const { monthlyCustomers, deleteMonthlyCustomer } = useParking(); // Usar dados do contexto
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>();

  // --- AÇÕES ---
  const handleAddNew = () => {
    setSelectedCustomer(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleRegisterPayment = (customer: any) => {
    setSelectedCustomer(customer);
    setPaymentDialogOpen(true);
  };

  const handleDelete = async (customer: any) => {
    if (!confirm(`Deseja realmente remover o cliente ${customer.name}?`)) return;

    try {
      await deleteMonthlyCustomer(customer.id); // Usar função do contexto
      toast({ title: 'Cliente removido', description: 'O cliente foi excluído com sucesso' });
    } catch (err) {
      console.error('Erro ao remover cliente:', err);
    }
  };

  const getCustomerStatus = (customer: any) => {
    return isPast(new Date(customer.dueDate)) ? 'Atrasado' : 'Em dia';
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mensalistas</h1>
            <p className="text-muted-foreground mt-1">Gestão de clientes recorrentes</p>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Cliente
          </Button>
        </div>

        <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Placas</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Valor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Data de Contratação</th>  {/* Nova coluna */}
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Próximo Vencimento</th>  {/* Renomeada */}
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Último Pagamento</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {monthlyCustomers.length === 0 ? ( // Usar monthlyCustomers do contexto
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">  {/* Atualizado colSpan para 8 */}
                      Nenhum cliente cadastrado
                    </td>
                  </tr>
                ) : (
                  monthlyCustomers.map((customer, index) => { // Usar monthlyCustomers do contexto
                    const status = getCustomerStatus(customer);
                    // Log de debug para contractDate
                    console.log('Cliente:', customer.name, 'contractDate:', customer.contractDate);
                    return (
                      <ContextMenu key={customer.id}>
                        <ContextMenuTrigger asChild>
                          <tr className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
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
                            <td className="px-4 py-3 font-medium">R$ {customer.value.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm">
                              {customer.contractDate ? format(new Date(customer.contractDate), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {format(new Date(customer.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {customer.lastPayment
                                ? format(new Date(customer.lastPayment), 'dd/MM/yyyy', { locale: ptBR })
                                : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  status === 'Em dia'
                                    ? 'bg-success/10 text-success'
                                    : 'bg-destructive/10 text-destructive'
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <Button size="sm" onClick={() => handleRegisterPayment(customer)}>
                                Registrar Pagamento
                              </Button>
                            </td>
                          </tr>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => handleEdit(customer)}>Editar</ContextMenuItem>
                          <ContextMenuItem onClick={() => handleRegisterPayment(customer)}>Efetuar Pagamento</ContextMenuItem>
                          <ContextMenuItem onClick={() => handleDelete(customer)} className="text-destructive">
                            Remover
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={selectedCustomer} />
      <PaymentDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} customer={selectedCustomer} />
    </div>
  );
}