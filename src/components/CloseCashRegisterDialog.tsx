import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useParking } from '@/contexts/ParkingContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const CloseCashRegisterDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { cashSession, getTotalRevenue, closeCashRegister } = useParking();
  const [closingAmount, setClosingAmount] = useState<number>(0);

  const operatorName = cashSession?.operatorName || '';
  const now = new Date();

  const todayIso = format(now, 'yyyy-MM-dd');
  const todayStart = `${todayIso}`; // We'll treat as date-only in aggregator
  const prefill = useMemo(() => getTotalRevenue({ start: todayStart, end: todayStart }), [getTotalRevenue, todayStart]);

  useEffect(() => {
    if (open) setClosingAmount(prefill || 0);
  }, [open, prefill]);

  const handleClose = () => {
    closeCashRegister(closingAmount || 0, operatorName);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fechamento de Caixa</DialogTitle>
          <DialogDescription>Confirme os dados para fechar o caixa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Operador</label>
            <div className="text-sm">{operatorName || <span className="italic text-muted-foreground">(em branco até o login)</span>}</div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Data e Hora</label>
            <div className="text-sm">{format(now, "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })}</div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="closingAmount">Valor de Fechamento</label>
            <Input
              id="closingAmount"
              type="number"
              min={0}
              value={closingAmount}
              onChange={e => setClosingAmount(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Pré-preenchido com a receita total do dia.</p>
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleClose}>Fechar Caixa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CloseCashRegisterDialog;
