import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, CheckCircle, FileText } from 'lucide-react';
import { VehicleDialog } from '@/components/VehicleDialog';
import { RatesDialog } from '@/components/RatesDialog';
import { ReceiptDialog } from '@/components/ReceiptDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function Operacional() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ratesDialogOpen, setRatesDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>();

  const fetchVehicles = async () => {
    try {
      const res = await fetch('http://localhost:3000/vehicles');
      const data = await res.json();
      setVehicles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRates = async () => {
    try {
      const res = await fetch('http://localhost:3000/rates');
      const data = await res.json();
      setRates(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchRates();
  }, []);

  const filteredVehicles = vehicles.filter(v =>
    filter === 'all' ? true : v.status === filter
  );

  const handleFinishExit = async (vehicle: any) => {
    const now = new Date();
    const exitDate = format(now, 'yyyy-MM-dd');
    const exitTime = format(now, 'HH:mm');

    const rate = rates.find(r => r.id === vehicle.rateId);
    if (!rate) return;

    // Simulação de cálculo de tarifa
    const totalValue = rate.value || 0;

    try {
      await fetch(`http://localhost:3000/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exitDate,
          exitTime,
          status: 'Concluído',
          totalValue,
        }),
      });
      toast({
        title: 'Saída registrada',
        description: `Valor total: R$ ${totalValue.toFixed(2)}`,
      });
      fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedVehicle(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Operacional</h1>
            <p className="text-muted-foreground mt-1">Controle de entradas e saídas</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setReceiptDialogOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Recibo Avulso
            </Button>
            <Button variant="outline" onClick={() => setRatesDialogOpen(true)}>
              Gerenciar Tarifas
            </Button>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Veículo
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            Todos
          </Button>
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
        </div>

        <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Placa</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Entrada</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Saída</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Valor</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum veículo registrado
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((vehicle, index) => (
                    <tr key={vehicle.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="px-4 py-3 font-medium">{vehicle.plate}</td>
                      <td className="px-4 py-3">{vehicle.vehicleType}</td>
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(vehicle.entryDate), 'dd/MM/yyyy', { locale: ptBR })} {vehicle.entryTime}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {vehicle.exitDate
                          ? `${format(new Date(vehicle.exitDate), 'dd/MM/yyyy', { locale: ptBR })} ${vehicle.exitTime}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            vehicle.status === 'Em andamento'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-success/10 text-success'
                          }`}
                        >
                          {vehicle.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {vehicle.totalValue > 0 ? `R$ ${vehicle.totalValue.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(vehicle)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {vehicle.status === 'Em andamento' && (
                          <Button size="sm" onClick={() => handleFinishExit(vehicle)}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Finalizar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <VehicleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicle={selectedVehicle}
        onSaved={fetchVehicles} // atualizar lista após salvar
      />
      
      <RatesDialog
        open={ratesDialogOpen}
        onOpenChange={setRatesDialogOpen}
        onSaved={fetchRates} // atualizar tarifas
      />

      <ReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
      />
    </div>
  );
}
