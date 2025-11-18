import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useParking } from '@/contexts/ParkingContext';
import { useAuth } from '@/contexts/AuthContext';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalRevenue?: number; // Receita total em caixa para sugerir valor de abertura
};

export const OpenCashRegisterDialog: React.FC<Props> = ({ open, onOpenChange, totalRevenue = 0 }) => {
  const { openCashRegister, lastClosingAmount } = useParking();
  const { user: authUser } = useAuth();
  const [amount, setAmount] = useState<string>('');

  useEffect(() => {
    if (open) {
      // Suggest based on total revenue in cash (if available) or last closing amount
      // Priority: totalRevenue > lastClosingAmount > 0
      const suggestedAmount = totalRevenue > 0 ? totalRevenue : (lastClosingAmount || 0);
      setAmount(suggestedAmount > 0 ? suggestedAmount.toFixed(2) : '');
    }
  }, [open, lastClosingAmount, totalRevenue]);

  const handleOpen = () => {
    const operator = authUser?.name || '';
    const numericAmount = amount ? Number(amount) : (lastClosingAmount || 0);
    openCashRegister(numericAmount, operator);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abertura de Caixa</DialogTitle>
          <DialogDescription>Informe o valor inicial do caixa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Operador</label>
            <div className="text-sm text-muted-foreground italic">
              (será preenchido após implementação de login)
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="openingAmount">
              Valor de Abertura
            </label>
            <Input
              id="openingAmount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={lastClosingAmount > 0 ? lastClosingAmount.toFixed(2) : '0.00'}
            />
            <p className="text-xs text-muted-foreground">
              {totalRevenue > 0
                ? `Sugerido: R$ ${totalRevenue.toFixed(2)} (receita total em caixa). Você pode editar este valor.`
                : lastClosingAmount > 0
                  ? `Sugerido: R$ ${lastClosingAmount.toFixed(2)} (último fechamento). Você pode editar este valor.`
                  : 'Nenhum valor sugerido. Informe o valor inicial.'}
            </p>
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleOpen}>Abrir Caixa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpenCashRegisterDialog;
