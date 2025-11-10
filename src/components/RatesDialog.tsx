import { useState } from 'react';
import { useParking, Rate, VehicleType, RateType } from '@/contexts/ParkingContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VehicleTypeSelect } from '@/components/VehicleTypeSelect';

interface RatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export const RatesDialog = ({ open, onOpenChange, onSaved }: RatesDialogProps) => {
  const { rates, addRate, updateRate, deleteRate } = useParking();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  console.log('RatesDialog rendered, rates:', rates);
  const [formData, setFormData] = useState({
    vehicleType: 'Carro' as VehicleType,
    rateType: 'Hora/Fração' as RateType,
    value: '',
    unit: 'hora',
    courtesyMinutes: '10',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rateData = {
      vehicleType: formData.vehicleType,
      rateType: formData.rateType,
      value: parseFloat(formData.value),
      unit: formData.unit,
      courtesyMinutes: parseInt(formData.courtesyMinutes),
    };

    try {
      if (editingId) {
        await updateRate(editingId, rateData);
        toast({ title: 'Tarifa atualizada com sucesso' });
      } else {
        await addRate(rateData);
        toast({ title: 'Tarifa adicionada com sucesso' });
      }
      resetForm();
      onSaved?.(); // Notify parent to refresh data
    } catch (error) {
      toast({ 
        title: 'Erro ao salvar tarifa',
        description: 'Tente novamente',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (rate: Rate) => {
    setEditingId(rate.id);
    setFormData({
      vehicleType: rate.vehicleType,
      rateType: rate.rateType,
      value: rate.value.toString(),
      unit: rate.unit,
      courtesyMinutes: rate.courtesyMinutes.toString(),
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRate(id);
      toast({ title: 'Tarifa excluída' });
      onSaved?.(); // Notify parent to refresh data
    } catch (error) {
      toast({ 
        title: 'Erro ao excluir tarifa',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      vehicleType: 'Carro',
      rateType: 'Hora/Fração',
      value: '',
      unit: 'hora',
      courtesyMinutes: '10',
    });
  };

  // Filter rates by selected vehicle type
  const filteredRates = rates.filter(rate => rate.vehicleType === formData.vehicleType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Tarifas</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-4">
              {editingId ? 'Editar Tarifa' : 'Adicionar Nova Tarifa'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Tipo de Veículo</Label>
                <VehicleTypeSelect
                  value={formData.vehicleType}
                  onValueChange={(v) => setFormData({ ...formData, vehicleType: v as VehicleType })}
                />
              </div>

              <div>
                <Label>Tipo de Tarifa</Label>
                <Select
                  value={formData.rateType}
                  onValueChange={(v) => setFormData({ ...formData, rateType: v as RateType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hora/Fração">Hora/Fração</SelectItem>
                    <SelectItem value="Diária">Diária</SelectItem>
                    <SelectItem value="Pernoite">Pernoite</SelectItem>
                    <SelectItem value="Semanal">Semanal</SelectItem>
                    <SelectItem value="Quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label>Unidade</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="hora, dia, mês..."
                  />
                </div>
              </div>

              <div>
                <Label>Minutos de Cortesia</Label>
                <Input
                  type="number"
                  value={formData.courtesyMinutes}
                  onChange={(e) => setFormData({ ...formData, courtesyMinutes: e.target.value })}
                  placeholder="10"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingId ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </div>

          <div>
            <h3 className="font-semibold mb-4">
              Tarifas Cadastradas - {formData.vehicleType}
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredRates.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Nenhuma tarifa cadastrada para {formData.vehicleType}
                </p>
              ) : (
                filteredRates.map((rate) => (
                <div
                  key={rate.id}
                  className="bg-muted/50 p-3 rounded-lg flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="font-medium">{rate.vehicleType} - {rate.rateType}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {rate.value.toFixed(2)}/{rate.unit}
                      {rate.courtesyMinutes > 0 && ` • ${rate.courtesyMinutes}min cortesia`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(rate)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(rate.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
