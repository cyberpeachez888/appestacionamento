import { useState, useEffect, useRef } from 'react';
import { useParking, MonthlyCustomer, PaymentMethod } from '@/contexts/ParkingContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReceiptTemplate {
  showCompanyName?: boolean;
  showCompanyDetails?: boolean;
  showReceiptNumber?: boolean;
  showDate?: boolean;
  showPlate?: boolean;
  showValue?: boolean;
  showPaymentMethod?: boolean;
  showSignatureLine?: boolean;
  termsAndConditions?: string;
  footerText?: string;
  primaryColor?: string;
  customFields?: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    defaultValue: string;
  }>;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: MonthlyCustomer;
  onSaved?: () => void; // Adicionado para callback de atualização
}

export const PaymentDialog = ({ open, onOpenChange, customer, onSaved }: PaymentDialogProps) => {
  const { registerPayment, companyConfig } = useParking();
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Dinheiro');
  const [amountReceived, setAmountReceived] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState(0);
  const [template, setTemplate] = useState<ReceiptTemplate | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setPaymentMethod('Dinheiro');
      setAmountReceived('');
      setShowReceipt(false);
      fetchTemplate();
    }
  }, [open]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch('http://localhost:3000/receipt-templates/default/monthly_payment', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);

        // Professional: Use explicit type for custom fields
        type CustomField = {
          name: string;
          label: string;
          type: string;
          required: boolean;
          defaultValue: string;
        };
        const initialValues: Record<string, string> = {};
        if (Array.isArray(data.customFields)) {
          (data.customFields as CustomField[]).forEach((field) => {
            initialValues[field.name] = field.defaultValue || '';
          });
        }
        // Set reference month to current month
        initialValues.referenceMonth = format(new Date(), 'MMMM/yyyy', { locale: ptBR });
        setCustomFieldValues(initialValues);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error fetching template:', message);
    }
  };

  const calculateChange = () => {
    if (!customer || !amountReceived) return 0;
    return parseFloat(amountReceived) - customer.value;
  };

  const handleConfirm = async () => {
    if (!customer || !paymentDate) return;

    const receiptNum = await registerPayment(customer.id, {
      date: paymentDate,
      value: customer.value,
      method: paymentMethod,
    });

    setReceiptNumber(receiptNum);
    setShowReceipt(true);

    toast({
      title: 'Pagamento registrado',
      description: 'O recibo foi gerado automaticamente',
    });

    // Chama callback para atualizar lista
    if (onSaved) onSaved();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    onOpenChange(false);
    setShowReceipt(false);
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento - {customer.name}</DialogTitle>
        </DialogHeader>

        {!showReceipt ? (
          <form className="space-y-4 mt-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Valor a receber:</p>
              <p className="text-2xl font-bold text-primary">R$ {customer.value.toFixed(2)}</p>
            </div>

            <div>
              <Label htmlFor="paymentDate">Data do Pagamento</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger>
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
              <div>
                <Label htmlFor="amountReceived">Valor Recebido (R$)</Label>
                <Input
                  id="amountReceived"
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                />
                {amountReceived && (
                  <p className="text-sm mt-2 text-muted-foreground">
                    Troco: R$ {calculateChange().toFixed(2)}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirm}>
                Confirmar Pagamento
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <div
              ref={receiptRef}
              className="bg-white text-black p-8 rounded-lg border-2 border-gray-300"
            >
              {/* Header */}
              {template?.showCompanyName !== false && (
                <div className="text-center mb-6">
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: template?.primaryColor || '#000000' }}
                  >
                    {companyConfig.name}
                  </h2>
                  {template?.showCompanyDetails !== false && (
                    <>
                      {companyConfig.legalName && (
                        <p className="text-sm">{companyConfig.legalName}</p>
                      )}
                      {companyConfig.cnpj && <p className="text-sm">CNPJ: {companyConfig.cnpj}</p>}
                      {companyConfig.address && <p className="text-sm">{companyConfig.address}</p>}
                      {companyConfig.phone && <p className="text-sm">Tel: {companyConfig.phone}</p>}
                    </>
                  )}
                </div>
              )}

              {/* Receipt Number */}
              {template?.showReceiptNumber !== false && (
                <div className="border-t-2 border-b-2 border-gray-300 py-4 my-4">
                  <h3 className="text-xl font-bold text-center">
                    RECIBO Nº {receiptNumber.toString().padStart(6, '0')}
                  </h3>
                  <p className="text-center text-sm mt-1">Mensalista</p>
                </div>
              )}

              {/* Receipt Body */}
              <div className="space-y-3 mb-6">
                <p>
                  <strong>Cliente:</strong> {customer.name}
                </p>
                {template?.showPlate !== false && (
                  <p>
                    <strong>Placas:</strong> {customer.plates.join(', ')}
                  </p>
                )}
                {template?.showDate !== false && (
                  <p>
                    <strong>Data do Pagamento:</strong>{' '}
                    {format(new Date(paymentDate), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                )}
                {template?.showPaymentMethod !== false && (
                  <p>
                    <strong>Forma de Pagamento:</strong> {paymentMethod}
                  </p>
                )}
                {template?.showValue !== false && (
                  <p>
                    <strong>Valor Pago:</strong> R$ {customer.value.toFixed(2)}
                  </p>
                )}

                {/* Custom Fields */}
                {template?.customFields?.map((field) => (
                  <p key={field.name}>
                    <strong>{field.label}:</strong> {customFieldValues[field.name] || '-'}
                  </p>
                ))}
              </div>

              {/* Signature Line */}
              {template?.showSignatureLine !== false && (
                <div className="mt-8 pt-4 border-t border-gray-300">
                  <p className="text-center">_______________________________</p>
                  <p className="text-center text-sm mt-1">Assinatura do Responsável</p>
                </div>
              )}

              {/* Terms and Conditions */}
              {template?.termsAndConditions && (
                <div className="mt-6 p-3 bg-yellow-50 border border-yellow-300 rounded">
                  <p className="text-xs text-center">
                    <strong>ATENÇÃO:</strong> {template.termsAndConditions}
                  </p>
                </div>
              )}

              {/* Footer Text */}
              {template?.footerText && (
                <div className="mt-4 text-center text-sm text-gray-600">{template.footerText}</div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handlePrint} className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
