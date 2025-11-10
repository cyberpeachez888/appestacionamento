import { useState, useEffect } from 'react';
import { useParking, Vehicle, VehicleType, RateType } from '@/contexts/ParkingContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { VehicleTypeSelect } from '@/components/VehicleTypeSelect';

interface VehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle;
  onSaved?: () => void;
}

export const VehicleDialog = ({ open, onOpenChange, vehicle, onSaved }: VehicleDialogProps) => {
  const { addVehicle, updateVehicle, rates, calculateRate } = useParking();
  const { toast } = useToast();
  
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Carro');
  const [rateId, setRateId] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [contractedDays, setContractedDays] = useState('');

  useEffect(() => {
    if (vehicle) {
      setPlate(vehicle.plate);
      setVehicleType(vehicle.vehicleType);
      setRateId(vehicle.rateId);
      setEntryDate(vehicle.entryDate);
      setEntryTime(vehicle.entryTime);
      setExitDate(vehicle.exitDate || '');
      setExitTime(vehicle.exitTime || '');
      setContractedDays(vehicle.contractedDays?.toString() || '');
    } else {
      const now = new Date();
      setPlate('');
      setVehicleType('Carro');
      setRateId('');
      setEntryDate(format(now, 'yyyy-MM-dd'));
      setEntryTime(format(now, 'HH:mm'));
      setExitDate('');
      setExitTime('');
      setContractedDays('');
    }
  }, [vehicle, open]);

  const availableRates = rates.filter(r => r.vehicleType === vehicleType);
  const selectedRate = rates.find(r => r.id === rateId);

  const calculateCurrentValue = () => {
    if (!vehicle || !exitDate || !exitTime || !selectedRate) return 0;
    return calculateRate(vehicle, selectedRate, exitDate, exitTime);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!plate || !rateId || !entryDate || !entryTime) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    const vehicleData = {
      plate: plate.toUpperCase(),
      vehicleType,
      rateId,
      entryDate,
      entryTime,
      exitDate: exitDate || undefined,
      exitTime: exitTime || undefined,
      status: (exitDate && exitTime ? 'Concluído' : 'Em andamento') as 'Em andamento' | 'Concluído',
      totalValue: exitDate && exitTime && selectedRate ? calculateCurrentValue() : 0,
      contractedDays: contractedDays ? parseInt(contractedDays) : undefined,
    };

    try {
      if (vehicle) {
        await updateVehicle(vehicle.id, vehicleData);
        toast({
          title: 'Veículo atualizado',
          description: 'As informações foram atualizadas com sucesso',
        });
      } else {
        await addVehicle(vehicleData);
        toast({
          title: 'Veículo adicionado',
          description: 'O veículo foi registrado com sucesso',
        });
      }
      
      onSaved?.(); // Notify parent to refresh data
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro ao salvar veículo',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  const requiresContractedDays = selectedRate && ['Semanal', 'Quinzenal', 'Mensal'].includes(selectedRate.rateType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Editar Veículo' : 'Adicionar Veículo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plate">Placa *</Label>
              <Input
                id="plate"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="ABC-1234"
                className="uppercase"
              />
            </div>

            <div>
              <Label htmlFor="vehicleType">Tipo de Veículo *</Label>
              <VehicleTypeSelect
                value={vehicleType}
                onValueChange={(v) => setVehicleType(v as VehicleType)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="rate">Tarifa *</Label>
            <Select value={rateId} onValueChange={setRateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma tarifa" />
              </SelectTrigger>
              <SelectContent>
                {availableRates.map((rate) => (
                  <SelectItem key={rate.id} value={rate.id}>
                    {rate.rateType} - R$ {rate.value.toFixed(2)}/{rate.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requiresContractedDays && (
            <div>
              <Label htmlFor="contractedDays">Dias Contratados *</Label>
              <Input
                id="contractedDays"
                type="number"
                value={contractedDays}
                onChange={(e) => setContractedDays(e.target.value)}
                placeholder="30"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entryDate">Data de Entrada *</Label>
              <Input
                id="entryDate"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="entryTime">Hora de Entrada *</Label>
              <Input
                id="entryTime"
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="exitDate">Data de Saída</Label>
              <Input
                id="exitDate"
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="exitTime">Hora de Saída</Label>
              <Input
                id="exitTime"
                type="time"
                value={exitTime}
                onChange={(e) => setExitTime(e.target.value)}
              />
            </div>
          </div>

          {exitDate && exitTime && vehicle && selectedRate && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Valor calculado:</p>
              <p className="text-2xl font-bold text-primary">
                R$ {calculateCurrentValue().toFixed(2)}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {vehicle ? 'Atualizar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
