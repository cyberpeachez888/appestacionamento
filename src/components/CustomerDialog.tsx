import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { addMonths } from 'date-fns';
import { useParking } from '@/contexts/ParkingContext';

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: any;
  onSaved?: () => void;
}

export function CustomerDialog({ open, onOpenChange, customer, onSaved }: CustomerDialogProps) {
  const { addMonthlyCustomer } = useParking();
  const [name, setName] = useState('');
  const [plates, setPlates] = useState<string[]>(['']);
  const [value, setValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');  // Adicionado
  const [paidAmount, setPaidAmount] = useState('');  // Adicionado
  const [change, setChange] = useState(0);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPlates(customer.plates);
      setValue(customer.value.toString());
    } else {
      setName('');
      setPlates(['']);
      setValue('150'); // Placeholder sugerido
      setPaymentMethod('Dinheiro');
      setPaidAmount('');
      setChange(0);
    }
  }, [customer]);

  const handlePlateChange = (index: number, value: string) => {
    const newPlates = [...plates];
    newPlates[index] = value.toUpperCase();
    setPlates(newPlates);
  };

  const addPlate = () => {
    setPlates([...plates, '']);
  };

  const removePlate = (index: number) => {
    if (plates.length > 1) {
      setPlates(plates.filter((_, i) => i !== index));
    }
  };

  // Calcula troco para Dinheiro
  useEffect(() => {
    if (paymentMethod === 'Dinheiro' && paidAmount && value) {
      const paid = parseFloat(paidAmount);
      const val = parseFloat(value);
      setChange(paid > val ? paid - val : 0);
    } else {
      setChange(0);
    }
  }, [paidAmount, value, paymentMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit chamado no dialog');  // Log de debug
    const validPlates = plates.filter(p => p.trim());
    if (!name.trim() || validPlates.length === 0 || !value) return;
    console.log('Dados válidos, preparando customerData');  // Log de debug
    const dueDate = addMonths(new Date(), 1).toISOString().split('T')[0];
    const customerData = {
      name: name.trim(),
      plates: validPlates,
      value: parseFloat(value),
      dueDate,
      status: 'Em dia' as const,
      paymentMethod,
      paidAmount: paymentMethod === 'Dinheiro' ? parseFloat(paidAmount) : undefined,
    };
    console.log('CustomerData preparado:', customerData);  // Log de debug
    try {
      await addMonthlyCustomer(customerData);
      console.log('addMonthlyCustomer chamado com sucesso');  // Log de debug
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{customer ? 'Editar Cliente' : 'Adicionar Cliente'}</DialogTitle>
          <DialogDescription>
            {customer ? 'Edite os dados do cliente mensalista.' : 'Adicione um novo cliente mensalista.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Placas</Label>
              <div className="col-span-3 space-y-2">
                {plates.map((plate, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={plate}
                      onChange={(e) => handlePlateChange(index, e.target.value)}
                      placeholder="ABC-1234"
                      required
                    />
                    {plates.length > 1 && (
                      <Button type="button" variant="outline" onClick={() => removePlate(index)}>
                        -
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addPlate}>
                  + Adicionar Placa
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">
                Valor
              </Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="150.00" // Placeholder sugerido
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                  <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMethod === 'Dinheiro' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="paidAmount" className="text-right">
                    Valor Pago
                  </Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="200.00"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Troco</Label>
                  <Input
                    value={`R$ ${change.toFixed(2)}`}
                    readOnly
                    className="col-span-3"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="submit">{customer ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}