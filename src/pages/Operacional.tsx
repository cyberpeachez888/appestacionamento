import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Edit,
  CheckCircle,
  Building2,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { VehicleDialog } from '@/components/VehicleDialog';
import { ExitConfirmationDialog } from '@/components/ExitConfirmationDialog';
import { ReimbursementReceiptDialog } from '@/components/ReimbursementReceiptDialog';
import { OperacionalDetailPanel } from '@/components/OperacionalDetailPanel';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { PaymentMethod } from '@/contexts/ParkingContext';
import { useParking } from '@/contexts/ParkingContext';
import { useAuth } from '@/contexts/AuthContext';

export default function Operacional() {
  // Função para desfazer finalização
  const handleUndoFinish = async (vehicle: any) => {
    try {
      await fetch(`${API_URL}/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'Em andamento',
          exitDate: null,
          exitTime: null,
          totalValue: null,
          paymentMethod: null,
        }),
      });
      toast({
        title: 'Finalização desfeita',
        description: 'O veículo voltou para o estado de entrada.',
      });
      fetchVehicles();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao desfazer finalização',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  };
  const { toast } = useToast();
  const { cashIsOpen, cashSession, companyConfig, monthlyCustomers } = useParking();
  const { user, hasPermission, token } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | string>('Em andamento');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>();
  const [exitingVehicle, setExitingVehicle] = useState<any>();
  const [exitingVehicleIsMonthly, setExitingVehicleIsMonthly] = useState(false);
  const [reimbursementDialogOpen, setReimbursementDialogOpen] = useState(false);
  const [reimbursementVehicle, setReimbursementVehicle] = useState<any>();
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  // companyConfig vem do contexto
  const [currentTime, setCurrentTime] = useState(new Date());

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchVehicles = async () => {
    try {
      const res = await fetch(`${API_URL}/vehicles`);
      const data = await res.json();
      setVehicles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRates = async () => {
    try {
      const res = await fetch(`${API_URL}/rates`);
      const data = await res.json();
      setRates(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Removido: companyConfig fornecido pelo contexto (com auth)

  useEffect(() => {
    fetchVehicles();
    fetchRates();
    // companyConfig já é carregado pelo ParkingContext
  }, []);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ESC key handler to deselect row
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedRowId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Removido listener: atualizações fluem pelo contexto

  const filteredVehicles = vehicles
    .filter((v) => (filter === 'all' ? true : v.status === filter))
    .sort((a, b) => {
      // Sort by entry date first
      const dateA = new Date(a.entryDate).getTime();
      const dateB = new Date(b.entryDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      // Then by entry time
      const timeA = a.entryTime || '00:00';
      const timeB = b.entryTime || '00:00';
      return timeA.localeCompare(timeB);
    });

  const calculateRateValue = (vehicle: any, rate: any, exitDate: Date): number => {
    const entry = new Date(`${vehicle.entryDate}T${vehicle.entryTime}`);
    const diffMinutes = Math.floor((exitDate.getTime() - entry.getTime()) / 60000);

    if (rate.rateType === 'Hora/Fração') {
      const hours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      let fractions = hours;
      if (remainingMinutes > (rate.courtesyMinutes || 0)) fractions += 1;
      return Math.max(fractions, 1) * rate.value;
    } else if (rate.rateType === 'Diária') {
      const days = Math.ceil(diffMinutes / (24 * 60));
      return days * rate.value;
    } else if (rate.rateType === 'Pernoite') {
      return rate.value;
    } else if (['Semanal', 'Quinzenal', 'Mensal'].includes(rate.rateType)) {
      const contractedMinutes = (vehicle.contractedDays || 30) * 24 * 60;
      if (diffMinutes <= contractedMinutes) return rate.value;
      const hourlyRate = rates.find(
        (r) => r.vehicleType === vehicle.vehicleType && r.rateType === 'Hora/Fração'
      );
      if (hourlyRate)
        return rate.value + Math.ceil((diffMinutes - contractedMinutes) / 60) * hourlyRate.value;
      return rate.value;
    }

    return rate.value;
  };

  const handleFinishExit = (vehicle: any) => {
    console.log('Clicou em finalizar saída', vehicle);
    if (!hasPermission('openCloseCash')) return;
    const isMonthly = monthlyCustomers.some((customer) =>
      customer.plates.some((plate) => plate.toUpperCase() === vehicle.plate.toUpperCase())
    );
    setExitingVehicle(vehicle);
    setExitingVehicleIsMonthly(isMonthly);
    setExitDialogOpen(true);
  };

  const handleConfirmExit = async (paymentMethod: PaymentMethod, receiptData?: any) => {
    console.log('Entrou em handleConfirmExit', exitingVehicle, token);
    if (!exitingVehicle) return;

    const now = new Date();
    const exitDate = format(now, 'yyyy-MM-dd');
    const exitTime = format(now, 'HH:mm');

    const rate = rates.find((r) => r.id === exitingVehicle.rateId);
    if (!rate) return;

    const baseValue = calculateRateValue(exitingVehicle, rate, now);
    const totalValue = exitingVehicleIsMonthly ? 0 : baseValue;

    // Log do token para diagnóstico
    console.log('Token usado na saída:', token);
    try {
      // Update vehicle exit
      await fetch(`${API_URL}/vehicles/${exitingVehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exitDate,
          exitTime,
          status: 'Concluído',
          totalValue,
          paymentMethod,
        }),
      });

      // Save receipt if requested
      if (receiptData) {
        await fetch(`${API_URL}/receipts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: exitingVehicle.id,
            receiptType: receiptData.receiptType,
            clientName: receiptData.clientName,
            clientCpf: receiptData.clientCpf,
            notes: receiptData.notes,
          }),
        });
      }

      toast({
        title: 'Saída registrada com sucesso',
        description: `Valor total: R$ ${totalValue.toFixed(2)} - ${paymentMethod}`,
      });
      fetchVehicles();
      setExitingVehicle(undefined);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao registrar saída',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  const handleOpenReimbursement = (vehicle: any) => {
    setReimbursementVehicle(vehicle);
    setReimbursementDialogOpen(true);
  };

  const handleReimbursementSubmit = async (payload: {
    clientName: string;
    clientCpf?: string;
    notes?: string;
  }) => {
    if (!reimbursementVehicle) return;

    try {
      await fetch(`${API_URL}/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: reimbursementVehicle.id,
          receiptType: 'individual_reembolso',
          clientName: payload.clientName,
          clientCpf: payload.clientCpf,
          notes: payload.notes,
        }),
      });

      toast({
        title: 'Recibo de reembolso gerado',
        description: `Solicitante: ${payload.clientName}`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao gerar recibo',
        description: 'Não foi possível registrar o recibo de reembolso.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (vehicle: any) => {
    if (!hasPermission('openCloseCash')) return;
    setSelectedVehicle(vehicle);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    if (!hasPermission('openCloseCash')) return;
    setSelectedVehicle(undefined);
    setDialogOpen(true);
  };

  const handleRemoveVehicle = async (vehicle: any) => {
    if (!hasPermission('openCloseCash')) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja remover o registro da placa ${vehicle.plate}?\n\nEsta ação não pode ser desfeita e afetará todos os relatórios e registros financeiros.`
    );

    if (!confirmed) return;

    try {
      await fetch(`${API_URL}/vehicles/${vehicle.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast({
        title: 'Registro removido',
        description: 'O registro foi excluído com sucesso.',
      });
      fetchVehicles();
      if (selectedRowId === vehicle.id) {
        setSelectedRowId(null);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao remover registro',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  // Calculate current value with excess hours for long-term rates
  const calculateCurrentValueWithDetails = (vehicle: any) => {
    const rate = rates.find((r) => r.id === vehicle.rateId);
    if (!rate) return { currentValue: 0, excessHours: 0, excessValue: 0 };

    const now = vehicle.exitDate && vehicle.exitTime
      ? new Date(`${vehicle.exitDate}T${vehicle.exitTime}`)
      : currentTime;

    const baseValue = calculateRateValue(vehicle, rate, now);

    // Calculate excess for long-term rates
    if (['Semanal', 'Quinzenal', 'Mensal'].includes(rate.rateType)) {
      const entry = new Date(`${vehicle.entryDate}T${vehicle.entryTime}`);
      const contractedMinutes = (vehicle.contractedDays || 30) * 24 * 60;
      const actualMinutes = Math.floor((now.getTime() - entry.getTime()) / 60000);
      const excessMinutes = Math.max(0, actualMinutes - contractedMinutes);

      const hourlyRate = rates.find(
        (r) => r.vehicleType === vehicle.vehicleType && r.rateType === 'Hora/Fração'
      );
      const excessValue = hourlyRate
        ? Math.ceil(excessMinutes / 60) * hourlyRate.value
        : 0;

      return {
        currentValue: baseValue,
        excessHours: excessMinutes,
        excessValue: excessValue,
      };
    }

    return { currentValue: baseValue, excessHours: 0, excessValue: 0 };
  };

  // Get date display for table
  const getDateDisplay = (vehicle: any) => {
    const rate = rates.find((r) => r.id === vehicle.rateId);
    if (!rate) return vehicle.entryDate ? format(new Date(vehicle.entryDate), 'dd/MM/yyyy', { locale: ptBR }) : '';

    const isLongTerm = ['Pernoite', 'Semanal', 'Quinzenal', 'Mensal'].includes(rate.rateType);

    if (!isLongTerm) {
      return vehicle.entryDate ? format(new Date(vehicle.entryDate), 'dd/MM/yyyy', { locale: ptBR }) : '';
    }

    // Long-term: show compact range
    if (!vehicle.entryDate) return '';
    const startDate = new Date(vehicle.entryDate);
    const endDate = vehicle.contractedEndDate
      ? new Date(vehicle.contractedEndDate)
      : new Date(startDate.getTime() + (vehicle.contractedDays || 7) * 24 * 60 * 60 * 1000);

    return `${format(startDate, 'dd/MM', { locale: ptBR })} – ${format(endDate, 'dd/MM', { locale: ptBR })}`;
  };

  const selectedVehicleForPanel = selectedRowId ? vehicles.find(v => v.id === selectedRowId) : null;
  const selectedRateForPanel = selectedVehicleForPanel ? rates.find(r => r.id === selectedVehicleForPanel.rateId) : null;
  const selectedValueDetails = selectedVehicleForPanel ? calculateCurrentValueWithDetails(selectedVehicleForPanel) : null;

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Professional Header with Company Info */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-l-4 border-primary rounded-lg p-6 mb-8 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              {/* Software Name */}
              <div>
                <h1 className="text-2xl font-bold text-primary">ProParking App 2025</h1>
                <p className="text-sm text-muted-foreground">Sistema de Gestão de Estacionamento</p>
              </div>

              {/* Company Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Empresa:</span>
                  <span>{companyConfig?.name || 'Carregando...'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Data:</span>
                  <span>{format(currentTime, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </div>

                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">CNPJ:</span>
                  <span>{companyConfig?.cnpj || 'Não configurado'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Hora:</span>
                  <span className="font-mono font-semibold text-primary">
                    {format(currentTime, 'HH:mm:ss')}
                  </span>
                </div>

                <div className="flex items-center gap-2 md:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Endereço:</span>
                  <span>{companyConfig?.address || 'Não configurado'}</span>
                </div>

                <div className="flex items-center gap-2 md:col-span-2">
                  <span className="font-medium">Operador:</span>
                  <span className="text-muted-foreground italic">
                    {user?.name || 'Sistema (autenticação em desenvolvimento)'}
                  </span>
                </div>

                {cashIsOpen && cashSession?.openedAt && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <span className="font-medium">Caixa aberto por:</span>
                    <span>
                      {cashSession.operatorName || '—'} —{' '}
                      {format(new Date(cashSession.openedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Primary Action */}
        <div className="flex items-center justify-between mb-6">
          {/* Primary Action Button - Left Side */}
          <Button
            size="lg"
            onClick={handleAddNew}
            className="font-semibold bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Registrar Entrada
          </Button>

          {/* Filter Buttons - Right Side */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'Em andamento' ? 'default' : 'outline'}
              onClick={() => setFilter('Em andamento')}
              size="sm"
            >
              Em andamento
            </Button>
            <Button
              variant={filter === 'Concluído' ? 'default' : 'outline'}
              onClick={() => setFilter('Concluído')}
              size="sm"
            >
              Concluídos
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              Todos
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Placa</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Entrada</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Saída</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Preview do Valor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Forma de Pagamento</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum veículo registrado
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((vehicle, index) => {
                    const valueDetails = calculateCurrentValueWithDetails(vehicle);
                    const isSelected = selectedRowId === vehicle.id;
                    return (
                      <tr
                        key={vehicle.id}
                        className={`cursor-pointer transition-colors ${isSelected
                          ? 'bg-primary/10 border-l-4 border-primary'
                          : index % 2 === 0
                            ? 'bg-background hover:bg-muted/30'
                            : 'bg-muted/20 hover:bg-muted/40'
                          }`}
                        onClick={() => setSelectedRowId(vehicle.id)}
                        onDoubleClick={() => handleOpenReimbursement(vehicle)}
                        title="Clique para selecionar | Clique duas vezes para acessar opções de reembolso"
                      >
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <span>{vehicle.plate}</span>
                            {monthlyCustomers.some((customer) =>
                              customer.plates.some(
                                (plate) => plate.toUpperCase() === vehicle.plate.toUpperCase()
                              )
                            ) && (
                                <span className="text-[11px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  Mensalista
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{vehicle.vehicleType}</td>
                        <td className="px-4 py-3 text-sm">
                          {getDateDisplay(vehicle)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {vehicle.entryTime || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {vehicle.exitTime || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${vehicle.status === 'Em andamento'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-success/10 text-success'
                              }`}
                          >
                            {vehicle.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {vehicle.status === 'Concluído' && vehicle.totalValue > 0
                            ? `R$ ${vehicle.totalValue.toFixed(2)}`
                            : `R$ ${valueDetails.currentValue.toFixed(2)}`}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {vehicle.paymentMethod || <span className="text-muted-foreground italic">(aguardando saída)</span>}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {hasPermission('openCloseCash') && (
                            <>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(vehicle); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => { e.stopPropagation(); handleRemoveVehicle(vehicle); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {vehicle.status === 'Em andamento' && hasPermission('openCloseCash') && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleFinishExit(vehicle); }}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Finalizar
                            </Button>
                          )}
                          {vehicle.status === 'Concluído' && hasPermission('openCloseCash') && (
                            <Button
                              size="sm"
                              variant="outline"
                              style={{ color: '#b45309', borderColor: '#fbbf24' }}
                              onClick={(e) => { e.stopPropagation(); handleUndoFinish(vehicle); }}
                            >
                              Desfazer Finalização
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedVehicleForPanel && selectedRateForPanel && selectedValueDetails && (
          <OperacionalDetailPanel
            vehicle={selectedVehicleForPanel}
            rate={selectedRateForPanel}
            currentValue={selectedValueDetails.currentValue}
            excessHours={selectedValueDetails.excessHours}
            excessValue={selectedValueDetails.excessValue}
          />
        )}
      </div>

      <VehicleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicle={selectedVehicle}
        onSaved={fetchVehicles}
      />

      <ExitConfirmationDialog
        open={exitDialogOpen}
        onOpenChange={setExitDialogOpen}
        vehicle={exitingVehicle}
        rate={exitingVehicle ? rates.find((r) => r.id === exitingVehicle.rateId) : undefined}
        calculatedValue={
          exitingVehicle && rates.find((r) => r.id === exitingVehicle.rateId)
            ? exitingVehicleIsMonthly
              ? 0
              : calculateRateValue(
                exitingVehicle,
                rates.find((r) => r.id === exitingVehicle.rateId),
                new Date()
              )
            : 0
        }
        onConfirm={handleConfirmExit}
        companyConfig={companyConfig}
        operatorName="Operador do Sistema"
        isMonthlyVehicle={exitingVehicleIsMonthly}
      />

      <ReimbursementReceiptDialog
        open={reimbursementDialogOpen}
        onOpenChange={(open) => {
          setReimbursementDialogOpen(open);
          if (!open) {
            setReimbursementVehicle(undefined);
          }
        }}
        vehicle={reimbursementVehicle}
        companyConfig={companyConfig}
        operatorName="Operador do Sistema"
        onSubmit={handleReimbursementSubmit}
      />
    </div>
  );
}
