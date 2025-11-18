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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const operator = authUser?.name || '';
      if (!operator) {
        throw new Error('Operador não identificado. Faça login novamente.');
      }
      
      const numericAmount = amount ? Number(amount) : (lastClosingAmount || 0);
      
      if (isNaN(numericAmount) || numericAmount < 0) {
        throw new Error('Valor inválido. Informe um valor maior ou igual a zero.');
      }
      
      await openCashRegister(numericAmount, operator);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao abrir caixa. Tente novamente.');
      console.error('Erro ao abrir caixa:', err);
    } finally {
      setLoading(false);
    }
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
            <div className="text-sm text-muted-foreground">
              {authUser?.name || 'Não identificado'}
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
          {error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleOpen} disabled={loading}>
            {loading ? 'Abrindo...' : 'Abrir Caixa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpenCashRegisterDialog;
