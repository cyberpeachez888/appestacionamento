import { useState, useEffect } from 'react';
import { useParking, Rate, VehicleType, RateType } from '@/contexts/ParkingContext';
import { useAuth } from '@/contexts/AuthContext';
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
import { Edit, Trash2, Plus, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VehicleTypeSelect } from '@/components/VehicleTypeSelect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PricingRulesManager } from '@/components/PricingRulesManager';

export default function Tarifas() {
  const { rates, addRate, updateRate, deleteRate } = useParking();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdvancedRules, setShowAdvancedRules] = useState<string | null>(null);

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
    } catch (error) {
      toast({
        title: 'Erro ao salvar tarifa',
        description: 'Tente novamente',
        variant: 'destructive',
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
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarifa?')) return;

    try {
      await deleteRate(id);
      toast({ title: 'Tarifa excluída com sucesso' });
    } catch (error) {
      toast({
        title: 'Erro ao excluir tarifa',
        variant: 'destructive',
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
  const filteredRates = rates.filter((rate) => rate.vehicleType === formData.vehicleType);

  const canManage = hasPermission('manageRates');

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Tarifas</h1>
          <p className="text-muted-foreground mt-2">
            Configure os valores e tipos de tarifas para cada tipo de veículo
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <Card className={!canManage ? 'opacity-50 pointer-events-none select-none' : ''}>
            <CardHeader>
              <CardTitle>{editingId ? 'Editar Tarifa' : 'Adicionar Nova Tarifa'}</CardTitle>
              <CardDescription>
                {editingId
                  ? 'Atualize as informações da tarifa selecionada'
                  : 'Preencha os campos abaixo para criar uma nova tarifa'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Tipo de Veículo</Label>
                  <VehicleTypeSelect
                    value={formData.vehicleType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, vehicleType: v as VehicleType })
                    }
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
                      required
                    />
                  </div>

                  <div>
                    <Label>Unidade</Label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="hora, dia, mês..."
                      required
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
                    min="0"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tempo de tolerância antes de cobrar a próxima fração
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  {canManage && (
                    <Button type="submit" className="flex-1">
                      <Plus className="h-4 w-4 mr-2" />
                      {editingId ? 'Atualizar Tarifa' : 'Adicionar Tarifa'}
                    </Button>
                  )}
                  {editingId && canManage && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* List Section */}
          <Card>
            <CardHeader>
              <CardTitle>Tarifas Cadastradas - {formData.vehicleType}</CardTitle>
              <CardDescription>
                {filteredRates.length}{' '}
                {filteredRates.length === 1 ? 'tarifa cadastrada' : 'tarifas cadastradas'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredRates.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">
                      Nenhuma tarifa cadastrada para {formData.vehicleType}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Use o formulário ao lado para adicionar a primeira tarifa
                    </p>
                  </div>
                ) : (
                  filteredRates.map((rate) => (
                    <div
                      key={rate.id}
                      className={`bg-muted/50 p-4 rounded-lg flex items-center justify-between transition-colors hover:bg-muted ${
                        editingId === rate.id ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {rate.vehicleType} - {rate.rateType}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          R$ {rate.value.toFixed(2)}/{rate.unit}
                          {rate.courtesyMinutes > 0 && ` • ${rate.courtesyMinutes}min cortesia`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {canManage && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowAdvancedRules(rate.id)}
                              title="Regras avançadas"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(rate)}
                              title="Editar tarifa"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(rate.id)}
                              title="Excluir tarifa"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Pricing Rules Section */}
        {showAdvancedRules && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                Regras Avançadas - {rates.find((r) => r.id === showAdvancedRules)?.rateType}
              </h2>
              <Button variant="outline" onClick={() => setShowAdvancedRules(null)}>
                Fechar
              </Button>
            </div>
            <PricingRulesManager
              rateId={showAdvancedRules}
              onClose={() => setShowAdvancedRules(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
