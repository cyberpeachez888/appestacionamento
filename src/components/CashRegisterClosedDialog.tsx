import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const CashRegisterClosedDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const goToFinance = () => {
    if (location.pathname !== '/financeiro') navigate('/financeiro');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="sm:max-w-md" aria-describedby="cash-register-closed-description">
        <DialogHeader>
          <DialogTitle>Caixa Fechado</DialogTitle>
          <DialogDescription id="cash-register-closed-description">
            O caixa está fechado no momento. Abra o caixa para continuar utilizando o sistema.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2">
          <Button onClick={goToFinance}>
            Abrir Caixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CashRegisterClosedDialog;
