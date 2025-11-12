import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface VehicleType {
  id: string;
  name: string;
  isDefault: boolean;
}

interface VehicleTypeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function VehicleTypeSelect({ value, onValueChange, placeholder = "Selecione o tipo" }: VehicleTypeSelectProps) {
  const { toast } = useToast();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchVehicleTypes = async () => {
    try {
      const data = await api.getVehicleTypes();
      console.log('Vehicle types fetched:', data); // Debug log
      setVehicleTypes(data || []);
    } catch (err) {
      console.error('Error fetching vehicle types:', err);
      // Set default types if fetch fails
      setVehicleTypes([
        { id: '1', name: 'Carro', isDefault: true },
        { id: '2', name: 'Moto', isDefault: true },
        { id: '3', name: 'Caminhonete', isDefault: true },
      ]);
      toast({
        title: 'Aviso',
        description: 'Não foi possível carregar tipos de veículos. Usando tipos padrão.',
        variant: 'default',
      });
    }
  };

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  const handleCreateType = async () => {
    if (!newTypeName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite o nome do tipo de veículo',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const newType = await api.createVehicleType(newTypeName.trim());
      toast({
        title: 'Tipo criado com sucesso',
        description: `${newType.name} foi adicionado à lista`,
      });
      
      await fetchVehicleTypes();
      onValueChange(newType.name);
      setDialogOpen(false);
      setNewTypeName('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: 'Erro ao criar tipo',
        description: message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {vehicleTypes.map((type) => (
                <SelectItem key={type.id} value={type.name}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setDialogOpen(true)}
          title="Adicionar novo tipo de veículo"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Tipo de Veículo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="typeName">Nome do Tipo *</Label>
              <Input
                id="typeName"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Ex: Caminhão, Bicicleta, etc."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateType();
                  }
                }}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setNewTypeName('');
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateType} disabled={loading}>
              {loading ? 'Salvando...' : 'Confirmar & Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
