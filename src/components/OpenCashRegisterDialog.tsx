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
};

export const OpenCashRegisterDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { openCashRegister, lastClosingAmount } = useParking();
  const { user: authUser } = useAuth();
  const [amount, setAmount] = useState<number>(lastClosingAmount || 0);

  useEffect(() => {
    if (open) setAmount(lastClosingAmount || 0);
  }, [open, lastClosingAmount]);

  const handleOpen = () => {
    const operator = authUser?.name || '';
    openCashRegister(amount || 0, operator);
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
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Pré-preenchido com o último valor de fechamento.
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
