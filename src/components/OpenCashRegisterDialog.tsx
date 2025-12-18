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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, User } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  totalRevenue?: number; // Receita total em caixa para sugerir valor de abertura
};

export const OpenCashRegisterDialog: React.FC<Props> = ({ open, onOpenChange, onSuccess, totalRevenue = 0 }) => {
  const { openCashRegister, lastClosingAmount } = useParking();
  const { user: authUser } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (open) {
      // Update time when dialog opens
      setNow(new Date());

      // Suggest based on total revenue in cash (if available) or last closing amount
      // Priority: totalRevenue > lastClosingAmount > 0
      const suggestedAmount = totalRevenue > 0 ? totalRevenue : (lastClosingAmount || 0);
      setAmount(suggestedAmount > 0 ? suggestedAmount.toFixed(2) : '');
    }
  }, [open, lastClosingAmount, totalRevenue]);

  // Update clock every minute when dialog is open
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [open]);

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
      if (onSuccess) onSuccess();
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
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Abertura de Caixa
          </DialogTitle>
          <DialogDescription>Confirme os dados para iniciar o turno.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 p-3 bg-muted/40 rounded-lg border border-border/50">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Data
              </label>
              <div className="text-sm font-semibold">
                {format(now, 'dd/MM/yyyy')}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 p-3 bg-muted/40 rounded-lg border border-border/50">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Hora
              </label>
              <div className="text-sm font-semibold">
                {format(now, 'HH:mm')}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
            <label className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
              <User className="h-3 w-3" /> Operador
            </label>
            <div className="text-sm font-bold text-blue-900">
              {authUser?.name || 'Não identificado'}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="openingAmount">
              Valor de Abertura (Fundo de Caixa)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
              <Input
                id="openingAmount"
                type="number"
                min={0}
                step="0.01"
                className="pl-10 h-12 text-lg font-bold"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={lastClosingAmount > 0 ? lastClosingAmount.toFixed(2) : '0.00'}
              />
            </div>
            <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-dashed">
              {totalRevenue > 0
                ? `Sugerido: R$ ${totalRevenue.toFixed(2)} (receita total em caixa).`
                : lastClosingAmount > 0
                  ? `Sugerido: R$ ${lastClosingAmount.toFixed(2)} (último fechamento).`
                  : 'Nenhum valor sugerido. Informe o valor inicial.'}
            </p>
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-end gap-2 sm:gap-0 sm:space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleOpen} disabled={loading} className="px-8">
            {loading ? 'Abrindo...' : 'Abrir Caixa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpenCashRegisterDialog;
