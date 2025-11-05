import { useState } from 'react';
import { useParking, Rate, VehicleType, RateType } from '@/contexts/ParkingContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RatesDialog = ({ open, onOpenChange }: RatesDialogProps) => {
  const { rates, addRate, updateRate, deleteRate } = useParking();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vehicleType: 'Carro' as VehicleType,
    rateType: 'Hora/Fração' as RateType,
    value: '',
    unit: 'hora',
    courtesyMinutes: '10',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const rateData = {
      vehicleType: formData.vehicleType,
      rateType: formData.rateType,
      value: parseFloat(formData.value),
      unit: formData.unit,
      courtesyMinutes: parseInt(formData.courtesyMinutes),
    };

    if (editingId) {
      updateRate(editingId, rateData);
      toast({ title: 'Tarifa atualizada com sucesso' });
    } else {
      addRate(rateData);
      toast({ title: 'Tarifa adicionada com sucesso' });
    }

    resetForm();
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

  const handleDelete = (id: string) => {
    deleteRate(id);
    toast({ title: 'Tarifa excluída' });
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
                <Select
                  value={formData.vehicleType}
                  onValueChange={(v) => setFormData({ ...formData, vehicleType: v as VehicleType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Carro">Carro</SelectItem>
                    <SelectItem value="Moto">Moto</SelectItem>
                    <SelectItem value="Caminhonete">Caminhonete</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Ônibus">Ônibus</SelectItem>
                  </SelectContent>
                </Select>
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
            <h3 className="font-semibold mb-4">Tarifas Cadastradas</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rates.map((rate) => (
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
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
