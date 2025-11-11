import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentMethod } from '@/contexts/ParkingContext';
import { Printer, Calculator } from 'lucide-react';

interface ExitConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: any;
  rate: any;
  calculatedValue: number;
  onConfirm: (paymentMethod: PaymentMethod, receiptData?: any) => void;
  companyConfig?: {
    name: string;
    cnpj: string;
    address?: string;
  };
  operatorName?: string;
}

export const ExitConfirmationDialog = ({
  open,
  onOpenChange,
  vehicle,
  rate,
  calculatedValue,
  onConfirm,
  companyConfig,
  operatorName = 'Operador',
}: ExitConfirmationDialogProps) => {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Dinheiro');
  const [amountPaid, setAmountPaid] = useState('');
  const [change, setChange] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);

  // Receipt options
  const [receiptType, setReceiptType] = useState<'none' | 'simple' | 'reimbursement'>('simple');
  const [clientName, setClientName] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [notes, setNotes] = useState('');

  // Edição da hora de entrada
  const [isEditingEntryTime, setIsEditingEntryTime] = useState(false);
  const [editedEntryTime, setEditedEntryTime] = useState(vehicle?.entryTime || '');

  useEffect(() => {
    if (vehicle?.entryTime) setEditedEntryTime(vehicle.entryTime);
  }, [vehicle]);

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setPaymentMethod('Dinheiro');
      setAmountPaid('');
      setChange(0);
      setShowReceipt(false);
      setReceiptType('simple');
      setClientName('');
      setClientCpf('');
      setNotes('');
    }
  }, [open]);

  useEffect(() => {
    // Calculate change for cash payments
    if (paymentMethod === 'Dinheiro' && amountPaid) {
      const paid = parseFloat(amountPaid);
      if (!isNaN(paid)) {
        const changeValue = paid - calculatedValue;
        setChange(changeValue >= 0 ? changeValue : 0);
      } else {
        setChange(0);
      }
    } else {
      setChange(0);
    }
  }, [amountPaid, calculatedValue, paymentMethod]);

  const handleConfirmAndPrint = () => {
    if (paymentMethod === 'Dinheiro') {
      const paid = parseFloat(amountPaid);
      if (isNaN(paid) || paid < calculatedValue) {
        toast({
          title: 'Valor insuficiente',
          description: 'O valor pago deve ser maior ou igual ao valor total',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate reimbursement receipt fields
    if (receiptType === 'reimbursement') {
      if (!clientName.trim()) {
        toast({
          title: 'Nome obrigatório',
          description: 'Por favor, informe o nome do solicitante',
          variant: 'destructive',
        });
        return;
      }
    }

    setShowReceipt(true);
  };

  const handlePrint = async () => {
    const receiptData = receiptType !== 'none' ? {
      receiptType: receiptType === 'reimbursement' ? 'individual_reembolso' : 'simple',
      clientName: receiptType === 'reimbursement' ? clientName : null,
      clientCpf: receiptType === 'reimbursement' ? clientCpf : null,
      notes: receiptType === 'reimbursement' ? notes : null,
    } : null;

    window.print();
    onConfirm(paymentMethod, receiptData);
    onOpenChange(false);
  };

  const exitDate = new Date();
  // Se estiver editando, usa o valor editado
  const entryDateTime = vehicle ? new Date(`${vehicle.entryDate}T${isEditingEntryTime ? editedEntryTime : vehicle.entryTime}`) : new Date();
  const duration = vehicle ? Math.floor((exitDate.getTime() - entryDateTime.getTime()) / 60000) : 0;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (showReceipt) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md print:shadow-none">
          <div className="receipt-content space-y-4 p-4">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold">{companyConfig?.name || 'Estacionamento'}</h2>
              {companyConfig?.cnpj && (
                <p className="text-sm text-muted-foreground">CNPJ: {companyConfig.cnpj}</p>
              )}
              {companyConfig?.address && (
                <p className="text-xs text-muted-foreground">{companyConfig.address}</p>
              )}
              <p className="text-lg font-semibold mt-2">
                {receiptType === 'reimbursement' ? 'RECIBO DE REEMBOLSO' : 'COMPROVANTE DE SAÍDA'}
              </p>
            </div>

            {/* Vehicle Info */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Placa:</span>
                <span className="font-bold">{vehicle?.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Tipo:</span>
                <span>{vehicle?.vehicleType}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Tarifa:</span>
                <span>{rate?.rateType}</span>
              </div>
            </div>

            {/* Date & Time Info */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex justify-between">
                <span className="font-medium">Entrada:</span>
                <span>
                  {vehicle && format(entryDateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Saída:</span>
                <span>{format(exitDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Permanência:</span>
                <span>
                  {hours}h {minutes}min
                </span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex justify-between text-lg">
                <span className="font-bold">VALOR TOTAL:</span>
                <span className="font-bold">R$ {calculatedValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Forma de Pagamento:</span>
                <span>{paymentMethod}</span>
              </div>
              {paymentMethod === 'Dinheiro' && (
                <>
                  <div className="flex justify-between">
                    <span className="font-medium">Valor Pago:</span>
                    <span>R$ {parseFloat(amountPaid).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Troco:</span>
                    <span>R$ {change.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Reimbursement Info */}
            {receiptType === 'reimbursement' && (
              <div className="space-y-2 border-t pt-3 bg-muted/30 p-3 rounded">
                <h3 className="font-semibold text-sm">DADOS PARA REEMBOLSO</h3>
                <div className="flex justify-between">
                  <span className="font-medium">Solicitante:</span>
                  <span>{clientName}</span>
                </div>
                {clientCpf && (
                  <div className="flex justify-between">
                    <span className="font-medium">CPF:</span>
                    <span>{clientCpf}</span>
                  </div>
                )}
                {notes && (
                  <div className="mt-2">
                    <span className="font-medium">Observações:</span>
                    <p className="text-sm mt-1">{notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground border-t pt-3">
              <p>Operador: {operatorName}</p>
              <p className="mt-2">Obrigado pela preferência!</p>
              <p className="text-xs mt-2">{format(exitDate, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
            </div>
          </div>

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setShowReceipt(false)}>
              Voltar
            </Button>
            <Button onClick={handlePrint}>
              {receiptType === 'none' ? 'Confirmar' : (<><Printer className="h-4 w-4 mr-2" />Imprimir e Confirmar</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Saída do Veículo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Vehicle Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Placa:</span>
              <span className="font-bold">{vehicle?.plate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <span>{vehicle?.vehicleType}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Entrada:</span>
              {isEditingEntryTime ? (
                <input
                  type="time"
                  className="border rounded px-2 py-1 text-sm"
                  value={editedEntryTime}
                  onChange={e => setEditedEntryTime(e.target.value)}
                  onBlur={() => setIsEditingEntryTime(false)}
                  autoFocus
                  style={{ width: '90px' }}
                />
              ) : (
                <span
                  title="Duplo clique para editar hora"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onDoubleClick={() => setIsEditingEntryTime(true)}
                >
                  {vehicle && format(entryDateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Permanência:</span>
              <span>
                {hours}h {minutes}min
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-semibold">Valor Total:</span>
              <span className="text-2xl font-bold text-primary">R$ {calculatedValue.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger id="paymentMethod">
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

          {/* Cash Payment Calculator */}
          {paymentMethod === 'Dinheiro' && (
            <div className="space-y-3 p-4 border rounded-lg bg-background">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calculator className="h-4 w-4" />
                Calculadora de Troco
              </div>
              <div>
                <Label htmlFor="amountPaid">Valor Recebido *</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="text-lg"
                />
              </div>
              {amountPaid && (
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                  <span className="font-medium">Troco:</span>
                  <span className="text-xl font-bold text-success">R$ {change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Receipt Options */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <Label className="text-base font-semibold">Emitir recibo:</Label>
            <RadioGroup value={receiptType} onValueChange={(v) => setReceiptType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-normal cursor-pointer">
                  Não emitir
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="simple" id="simple" />
                <Label htmlFor="simple" className="font-normal cursor-pointer">
                  Recibo simples (padrão)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reimbursement" id="reimbursement" />
                <Label htmlFor="reimbursement" className="font-normal cursor-pointer">
                  Recibo de reembolso
                </Label>
              </div>
            </RadioGroup>

            {/* Reimbursement Fields */}
            {receiptType === 'reimbursement' && (
              <div className="space-y-3 mt-4 pt-4 border-t">
                <div>
                  <Label htmlFor="clientName">
                    Nome do Solicitante <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="clientCpf">CPF (opcional)</Label>
                  <Input
                    id="clientCpf"
                    value={clientCpf}
                    onChange={(e) => setClientCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Viagem a trabalho, Entrega de mercadorias..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Informações adicionais para fins de reembolso corporativo
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmAndPrint}>
            {receiptType === 'none' ? 'Confirmar' : (<><Printer className="h-4 w-4 mr-2" />Confirmar & Imprimir</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
