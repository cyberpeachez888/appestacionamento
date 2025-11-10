import { useState, useRef, useEffect } from 'react';
import { useParking, PaymentMethod } from '@/contexts/ParkingContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReceiptTemplate {
  showCompanyName?: boolean;
  showCompanyDetails?: boolean;
  showReceiptNumber?: boolean;
  showDate?: boolean;
  showTime?: boolean;
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

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReceiptDialog = ({ open, onOpenChange }: ReceiptDialogProps) => {
  const { companyConfig } = useParking();
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    plate: '',
    value: '',
    paymentMethod: 'Dinheiro' as PaymentMethod,
    observation: '',
    issuedBy: '',
  });

  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState(0);
  const [template, setTemplate] = useState<ReceiptTemplate | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      fetchTemplate();
    }
  }, [open]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch('http://localhost:3000/receipt-templates/default/general_receipt', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
        
        // Initialize custom field values
        const initialValues: Record<string, string> = {};
        if (data.customFields) {
          data.customFields.forEach((field: any) => {
            initialValues[field.name] = field.defaultValue || '';
          });
        }
        setCustomFieldValues(initialValues);
      }
    } catch (err) {
      console.error('Error fetching template:', err);
    }
  };

  const handleGenerate = () => {
    if (!formData.plate || !formData.value) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha placa e valor',
        variant: 'destructive',
      });
      return;
    }

    setReceiptNumber(companyConfig.receiptCounter);
    setShowReceipt(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const resetForm = () => {
    setFormData({
      plate: '',
      value: '',
      paymentMethod: 'Dinheiro',
      observation: '',
      issuedBy: '',
    });
    setShowReceipt(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emitir Recibo Avulso</DialogTitle>
        </DialogHeader>

        {!showReceipt ? (
          <form className="space-y-4 mt-4">
            <div>
              <Label>Placa do Veículo *</Label>
              <Input
                value={formData.plate}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                placeholder="ABC-1234"
                className="uppercase"
              />
            </div>

            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Forma de Pagamento</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(v) => setFormData({ ...formData, paymentMethod: v as PaymentMethod })}
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

            <div>
              <Label>Observação</Label>
              <Textarea
                value={formData.observation}
                onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                placeholder="Reembolso, Documento interno, etc."
                rows={3}
              />
            </div>

            <div>
              <Label>Emitido por</Label>
              <Input
                value={formData.issuedBy}
                onChange={(e) => setFormData({ ...formData, issuedBy: e.target.value })}
                placeholder="Nome do operador"
              />
            </div>

            {/* Custom Fields from Template */}
            {template?.customFields?.map((field) => (
              <div key={field.name}>
                <Label>{field.label} {field.required && '*'}</Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    value={customFieldValues[field.name] || ''}
                    onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.value })}
                    placeholder={field.label}
                    rows={3}
                  />
                ) : (
                  <Input
                    type={field.type}
                    value={customFieldValues[field.name] || ''}
                    onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.value })}
                    placeholder={field.label}
                  />
                )}
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleGenerate}>
                Gerar Recibo
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <div ref={receiptRef} className="bg-white text-black p-8 rounded-lg border-2 border-gray-300">
              {/* Header */}
              {template?.showCompanyName !== false && (
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold" style={{ color: template?.primaryColor || '#000000' }}>
                    {companyConfig.name}
                  </h2>
                  {template?.showCompanyDetails !== false && (
                    <>
                      {companyConfig.legalName && <p className="text-sm">{companyConfig.legalName}</p>}
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
                </div>
              )}

              {/* Receipt Body */}
              <div className="space-y-3 mb-6">
                {template?.showDate !== false && (
                  <p><strong>Data:</strong> {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</p>
                )}
                {template?.showTime !== false && (
                  <p><strong>Horário:</strong> {format(new Date(), "HH:mm", { locale: ptBR })}</p>
                )}
                {template?.showPlate !== false && formData.plate && (
                  <p><strong>Placa:</strong> {formData.plate}</p>
                )}
                {template?.showValue !== false && (
                  <p><strong>Valor Pago:</strong> R$ {parseFloat(formData.value).toFixed(2)}</p>
                )}
                {template?.showPaymentMethod !== false && (
                  <p><strong>Forma de Pagamento:</strong> {formData.paymentMethod}</p>
                )}
                
                {/* Custom Fields */}
                {template?.customFields?.map((field) => {
                  const value = field.name === 'description' ? formData.observation : 
                                field.name === 'issuedBy' ? formData.issuedBy :
                                customFieldValues[field.name];
                  if (!value) return null;
                  return (
                    <p key={field.name}>
                      <strong>{field.label}:</strong> {value}
                    </p>
                  );
                })}
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
                <div className="mt-4 text-center text-sm text-gray-600">
                  {template.footerText}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handlePrint} className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Novo Recibo
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
