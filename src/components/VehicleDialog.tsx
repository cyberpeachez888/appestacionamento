import { useState, useEffect } from 'react';
import { useParking, Vehicle, VehicleType, RateType, PaymentMethod } from '@/contexts/ParkingContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');

  // Estados para Convênio
  const [convenioData, setConvenioData] = useState<any>(null);
  const [verificandoConvenio, setVerificandoConvenio] = useState(false);

  // Verificar placa quando tiver 7 caracteres
  useEffect(() => {
    const verificarPlaca = async () => {
      if (plate.length === 7 && !vehicle) { // Apenas na criação
        console.log('[VehicleDialog] 🔍 Verificando placa:', plate);
        setVerificandoConvenio(true);
        try {
          // FIX: Use correct token key 'auth:token' instead of 'token'
          const token = localStorage.getItem('auth:token') || sessionStorage.getItem('auth:token');
          const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/convenios/veiculos/verificar/${plate}`;

          console.log('[VehicleDialog] 📡 API URL:', apiUrl);
          console.log('[VehicleDialog] 🔑 Token exists:', !!token);

          const response = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          console.log('[VehicleDialog] 📬 Response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('[VehicleDialog] 📦 Response data:', data);

            if (data.autorizado) {
              setConvenioData(data);
              console.log('[VehicleDialog] ✅ Veículo AUTORIZADO:', data.nome_empresa);
              toast({
                title: 'Veículo de Convênio Identificado!',
                description: `${data.nome_empresa} - Convênio Corporativo`,
                className: 'bg-blue-50 border-blue-200 text-blue-800',
              });
            } else if (data.bloqueio) {
              console.log('[VehicleDialog] 🚫 Veículo BLOQUEADO:', data.message);
              setConvenioData({ ...data, bloqueado: true });
              toast({
                title: 'Entrada Bloqueada pelo Convênio',
                description: data.message,
                variant: 'destructive',
              });
            } else {
              console.log('[VehicleDialog] ⚠️ Veículo NÃO autorizado:', data.message);
              setConvenioData(null);
            }
          } else {
            const errorText = await response.text();
            console.error('[VehicleDialog] ❌ HTTP Error:', response.status, errorText);
          }
        } catch (error) {
          console.error('[VehicleDialog] ❌ Erro ao verificar convênio:', error);
        } finally {
          setVerificandoConvenio(false);
        }
      } else if (plate.length < 7) {
        setConvenioData(null);
      }
    };

    const timeoutId = setTimeout(verificarPlaca, 500);
    return () => clearTimeout(timeoutId);
  }, [plate, vehicle]);

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
      setPaymentMethod(vehicle.paymentMethod || '');
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
      setPaymentMethod('');
      setConvenioData(null);
    }
  }, [vehicle, open]);

  const availableRates = rates.filter((r) => r.vehicleType === vehicleType);
  const selectedRate = rates.find((r) => r.id === rateId);

  const calculateCurrentValue = () => {
    // Se for convênio, valor é zero ou calculado depois
    if (convenioData) return 0;

    // Suporte para cálculo em novos veículos (registro simultâneo)
    const currentVehicle = vehicle || {
      entryDate,
      entryTime,
      vehicleType,
      rateId,
    } as Vehicle;

    if (!exitDate || !exitTime || !selectedRate) return 0;
    return calculateRate(currentVehicle, selectedRate, exitDate, exitTime);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!plate || (!rateId && !convenioData) || !entryDate || !entryTime) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    // Validação de Forma de Pagamento para registro simultâneo
    if (exitTime && !paymentMethod && !convenioData) {
      toast({
        title: 'Forma de Pagamento obrigatória',
        description: 'Por favor, selecione a forma de pagamento para este registro.',
        variant: 'destructive',
      });
      return;
    }

    // Validação temporal para registro simultâneo
    if (exitDate && exitTime) {
      const entry = new Date(`${entryDate}T${entryTime}`);
      const exit = new Date(`${exitDate}T${exitTime}`);
      if (exit <= entry) {
        toast({
          title: 'Erro na data/hora',
          description: 'A hora de saída deve ser posterior à hora de entrada',
          variant: 'destructive',
        });
        return;
      }
    }

    const vehicleData = {
      plate: plate.toUpperCase(),
      vehicleType,
      rateId: rateId || (availableRates[0]?.id), // Fallback se for convênio
      entryDate,
      entryTime,
      exitDate: exitDate || undefined,
      exitTime: exitTime || undefined,
      status: (exitDate && exitTime ? 'Concluído' : 'Em andamento') as 'Em andamento' | 'Concluído',
      totalValue: exitDate && exitTime && selectedRate ? calculateCurrentValue() : 0,
      paymentMethod: (exitDate && exitTime)
        ? (convenioData ? 'Convênio' : (paymentMethod as PaymentMethod))
        : undefined,
      contractedDays: contractedDays ? parseInt(contractedDays) : undefined,
      contractedEndDate: undefined as string | undefined,
      contractedEndTime: undefined as string | undefined,
      metadata: convenioData ? {
        isConvenio: true,
        convenioId: convenioData.convenio_id,
        convenioNome: convenioData.nome_empresa
      } : undefined
    };

    // Calculate contracted end date/time for long-term rates
    if (requiresContractedDays && contractedDays && entryDate && entryTime) {
      const days = parseInt(contractedDays);
      const startDateTime = new Date(`${entryDate}T${entryTime}`);
      const endDateTime = new Date(startDateTime.getTime() + days * 24 * 60 * 60 * 1000);
      vehicleData.contractedEndDate = format(endDateTime, 'yyyy-MM-dd');
      vehicleData.contractedEndTime = format(endDateTime, 'HH:mm');
    }

    try {
      if (vehicle) {
        await updateVehicle(vehicle.id, vehicleData);
        toast({
          title: 'Veículo atualizado',
          description: 'As informações foram atualizadas com sucesso',
        });
      } else {
        // 1. Criar veículo no pátio (visualização)
        const newVehicle = await addVehicle(vehicleData);

        // 2. Se for convênio, registrar movimentação específica
        if (convenioData) {
          // FIX: Use correct token key 'auth:token'
          const token = localStorage.getItem('auth:token') || sessionStorage.getItem('auth:token');
          // Registrar entrada no módulo de convênios
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/convenios/${convenioData.convenio_id}/movimentacoes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              placa: plate.toUpperCase(),
              tipo_movimentacao: 'entrada',
              data_entrada: `${entryDate}T${entryTime}:00`
            })
          });
        }

        toast({
          title: 'Veículo adicionado',
          description: convenioData
            ? `Entrada registrada para convênio: ${convenioData.nome_empresa}`
            : 'O veículo foi registrado com sucesso',
        });
      }

      onSaved?.(); // Notify parent to refresh data
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao salvar veículo',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  const requiresContractedDays =
    selectedRate && ['Semanal', 'Quinzenal', 'Mensal'].includes(selectedRate.rateType);

  // Helper: Simplified form for convenio entry
  const isConvenioEntryOnly = convenioData && !convenioData.bloqueado && !vehicle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Editar Veículo' : 'Adicionar Veículo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {convenioData && (
            <div className={`border rounded-lg p-4 flex items-center gap-3 ${convenioData.bloqueado
              ? 'bg-red-50 border-red-200'
              : 'bg-blue-50 border-blue-200'
              }`}>
              <div className={`p-2 rounded-full ${convenioData.bloqueado ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                {convenioData.bloqueado ? (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
              </div>
              <div>
                <h4 className={`font-semibold ${convenioData.bloqueado ? 'text-red-900' : 'text-blue-900'}`}>
                  {convenioData.bloqueado ? 'Entrada Bloqueada' : 'Veículo de Convênio'}
                </h4>
                <p className={`text-sm ${convenioData.bloqueado ? 'text-red-700' : 'text-blue-700'}`}>
                  {convenioData.message || `${convenioData.nome_empresa} • Convênio Corporativo`}
                </p>
                {convenioData.observacoes && (
                  <p className={`text-xs mt-1 italic ${convenioData.bloqueado ? 'text-red-600' : 'text-blue-600'}`}>
                    Obs: {convenioData.observacoes}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className={isConvenioEntryOnly ? "space-y-4" : "grid grid-cols-2 gap-4"}>
            <div>
              <Label htmlFor="plate">Placa *</Label>
              <Input
                id="plate"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="ABC-1234"
                className="uppercase"
                disabled={isConvenioEntryOnly}
              />
            </div>

            {!isConvenioEntryOnly && (
              <div>
                <Label htmlFor="vehicleType">Tipo de Veículo *</Label>
                <VehicleTypeSelect
                  value={vehicleType}
                  onValueChange={(v) => setVehicleType(v as VehicleType)}
                />
              </div>
            )}
          </div>

          {!isConvenioEntryOnly && (
            <div>
              <Label htmlFor="rate">Tarifa {convenioData ? '(Opcional/Automática)' : '*'}</Label>
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
          )}

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

          <div className={isConvenioEntryOnly ? "space-y-4" : "grid grid-cols-2 gap-4"}>
            <div>
              <Label htmlFor="entryDate">Data de Entrada *</Label>
              <Input
                id="entryDate"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                disabled={isConvenioEntryOnly}
              />
            </div>

            <div>
              <Label htmlFor="entryTime">Hora de Entrada *</Label>
              <Input
                id="entryTime"
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                disabled={isConvenioEntryOnly}
              />
            </div>
          </div>

          {!isConvenioEntryOnly && (
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
                  onChange={(e) => {
                    setExitTime(e.target.value);
                    if (e.target.value && !exitDate) {
                      setExitDate(entryDate);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {exitTime && (!vehicle || vehicle.status === 'Em andamento') && (
            <div className="bg-blue-50 border-blue-200 border p-3 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-500">
              <span className="text-blue-600">ℹ️</span>
              <p className="text-sm text-blue-800">
                Ao informar a hora de saída, você está registrando entrada e saída simultâneas.
                O valor será calculado automaticamente.
              </p>
            </div>
          )}

          {exitTime && !convenioData && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-500">
              <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                  <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!isConvenioEntryOnly && exitDate && exitTime && (vehicle || plate) && selectedRate && (
            <div className="bg-muted p-4 rounded-lg animate-in zoom-in-95 duration-300">
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
            <Button type="submit" disabled={convenioData?.bloqueado || (!!exitTime && !paymentMethod && !convenioData)}>
              {vehicle ? 'Atualizar' : isConvenioEntryOnly ? 'Registrar Entrada' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
