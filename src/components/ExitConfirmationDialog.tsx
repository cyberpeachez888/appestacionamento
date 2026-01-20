import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentMethod } from '@/contexts/ParkingContext';
import { useAuth } from '@/contexts/AuthContext';
import { Printer, Calculator, AlertCircle, Check, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  generateThermalPreview,
  FALLBACK_COMPANY,
  ThermalReceiptTemplate,
  ThermalSampleData,
  formatCurrencyBR,
} from '@/lib/receiptPreview';

// Normalize API URL to always include /api (same logic as api.ts and App.tsx)
let apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Normalize: remove trailing slash, extract base URL (remove any existing paths), then add /api
if (apiBase.endsWith('/')) {
  apiBase = apiBase.slice(0, -1);
}

// If it's a full URL (starts with http:// or https://), extract just the origin
// This handles cases where VITE_API_URL might include paths like /health
if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
  try {
    const url = new URL(apiBase);
    apiBase = `${url.protocol}//${url.host}`;
  } catch (e) {
    // If URL parsing fails, try to extract origin manually
    const match = apiBase.match(/^(https?:\/\/[^\/]+)/);
    if (match) {
      apiBase = match[1];
    }
  }
}

// Ensure it ends with /api
if (!apiBase.endsWith('/api')) {
  apiBase = `${apiBase}/api`;
}

const API_URL = apiBase;

// Professional: Define explicit types for vehicle, rate, and receiptData
interface Vehicle {
  id?: string;
  plate: string;
  vehicleType: string;
  entryDate: string;
  entryTime: string;
}

interface Rate {
  rateType: string;
}

interface ReceiptData {
  receiptType: 'simple';
}

interface CompanyConfig {
  name: string;
  cnpj: string;
  address?: string;
  legalName?: string;
  phone?: string;
}

interface ExitConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  rate: Rate | null;
  calculatedValue: number;
  onConfirm: (paymentMethod: PaymentMethod, receiptData?: ReceiptData | null) => void;
  companyConfig?: CompanyConfig;
  operatorName?: string;
  isMonthlyVehicle?: boolean;
  isConvenioVagaExtra?: boolean;
  tipoVagaExtra?: 'paga' | 'cortesia';
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
  isMonthlyVehicle = false,
  isConvenioVagaExtra = false,
  tipoVagaExtra,
}: ExitConfirmationDialogProps) => {
  const { toast } = useToast();
  const { token } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Dinheiro');
  const [amountPaid, setAmountPaid] = useState('');
  const [change, setChange] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);

  // Detect vaga extra types
  const isVagaExtraPaga = isConvenioVagaExtra && tipoVagaExtra === 'paga';
  const isVagaExtraCortesia = isConvenioVagaExtra && tipoVagaExtra === 'cortesia';
  const requiresPayment = !isMonthlyVehicle && !isVagaExtraPaga && !isVagaExtraCortesia;

  // Receipt options
  const [receiptType, setReceiptType] = useState<'none' | 'simple'>('simple');

  // Edição da hora de entrada
  const [isEditingEntryTime, setIsEditingEntryTime] = useState(false);
  const [editedEntryTime, setEditedEntryTime] = useState(vehicle?.entryTime || '');
  const [ticketTemplate, setTicketTemplate] = useState<ThermalReceiptTemplate | null>(null);
  const [thermalPreview, setThermalPreview] = useState('');
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);

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
      setReceiptType(isMonthlyVehicle ? 'none' : 'simple');
    }
  }, [open, isMonthlyVehicle]);

  useEffect(() => {
    if (!open || isMonthlyVehicle) {
      return;
    }

    let ignore = false;

    const loadTemplate = async () => {
      setIsTemplateLoading(true);
      try {
        const url = `${API_URL}/receipt-templates/default/parking_ticket`;
        console.log('[ExitConfirmationDialog] Loading template from:', url, { hasToken: !!token });

        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        console.log('[ExitConfirmationDialog] Template response:', {
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get('content-type'),
        });

        if (!ignore) {
          if (response.ok) {
            const data = await response.json();
            console.log('[ExitConfirmationDialog] Template loaded:', data);
            setTicketTemplate(data);
          } else {
            const errorText = await response.text().catch(() => 'Unable to read error');
            console.error('[ExitConfirmationDialog] Failed to load template:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText.substring(0, 200),
            });
            setTicketTemplate(null);
          }
        }
      } catch (error) {
        if (!ignore) {
          console.error('[ExitConfirmationDialog] Error loading template:', error);
          setTicketTemplate(null);
        }
      } finally {
        if (!ignore) {
          setIsTemplateLoading(false);
        }
      }
    };

    loadTemplate();

    return () => {
      ignore = true;
    };
  }, [open, isMonthlyVehicle, API_URL, token]);

  useEffect(() => {
    // Calculate change for cash payments
    if (!isMonthlyVehicle && paymentMethod === 'Dinheiro' && amountPaid) {
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
  }, [amountPaid, calculatedValue, paymentMethod, isMonthlyVehicle]);

  const ticketSampleData = useMemo<ThermalSampleData | null>(() => {
    if (!ticketTemplate || !vehicle || isMonthlyVehicle) return null;
    const now = new Date();
    const entryDateTimeValue =
      vehicle.entryDate && (isEditingEntryTime ? editedEntryTime : vehicle.entryTime)
        ? new Date(
          `${vehicle.entryDate}T${isEditingEntryTime ? editedEntryTime : vehicle.entryTime
          }`
        )
        : null;
    const exitDateTimeValue = now;
    const durationMinutes =
      entryDateTimeValue !== null
        ? Math.max(Math.floor((exitDateTimeValue.getTime() - entryDateTimeValue.getTime()) / 60000), 0)
        : 0;
    const durationHours = Math.floor(durationMinutes / 60);
    const durationRest = durationMinutes % 60;

    const entryDateStr = entryDateTimeValue
      ? format(entryDateTimeValue, 'dd/MM/yyyy', { locale: ptBR })
      : '';
    const entryTimeStr = entryDateTimeValue
      ? format(entryDateTimeValue, 'HH:mm', { locale: ptBR })
      : '';
    const exitDateStr = format(exitDateTimeValue, 'dd/MM/yyyy', { locale: ptBR });
    const exitTimeStr = format(exitDateTimeValue, 'HH:mm', { locale: ptBR });
    const durationLabel = `${durationHours}h ${durationRest}min`;

    const derivedValues: Record<string, string> = {
      entrydate: entryDateStr,
      entrytime: entryTimeStr,
      exitdate: exitDateStr,
      exittime: exitTimeStr,
      duration: durationLabel,
      plate: vehicle.plate,
      paymentmethod: paymentMethod,
      value: formatCurrencyBR(calculatedValue),
      operator: operatorName,
    };

    const customFieldValues: Record<string, string> = {};
    ticketTemplate.customFields?.forEach((field) => {
      const normalized = field.name.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (normalized && derivedValues[normalized]) {
        customFieldValues[field.name] = derivedValues[normalized];
      } else if (field.defaultValue && !customFieldValues[field.name]) {
        customFieldValues[field.name] = field.defaultValue;
      }
    });

    return {
      receiptNumber: (vehicle.id || '').toString().slice(-6).padStart(6, '0'),
      issuedAt: now,
      vehicle: {
        plate: vehicle.plate,
        model: vehicle.vehicleType,
      },
      rate: rate?.rateType ? { name: rate.rateType } : undefined,
      payment: {
        amount: calculatedValue,
        method: paymentMethod,
        paidAt: now,
        receivedBy: operatorName,
      },
      customFieldValues,
    };
  }, [
    ticketTemplate,
    vehicle,
    rate,
    calculatedValue,
    paymentMethod,
    operatorName,
    isMonthlyVehicle,
    editedEntryTime,
    isEditingEntryTime,
  ]);

  useEffect(() => {
    if (!ticketTemplate || !ticketSampleData || isMonthlyVehicle) {
      console.log('[ExitConfirmationDialog] Cannot generate preview:', {
        hasTemplate: !!ticketTemplate,
        hasSampleData: !!ticketSampleData,
        isMonthlyVehicle,
      });
      setThermalPreview('');
      return;
    }
    console.log('[ExitConfirmationDialog] Generating thermal preview...');
    const preview = generateThermalPreview(
      ticketTemplate,
      ticketSampleData,
      companyConfig || FALLBACK_COMPANY
    );
    console.log('[ExitConfirmationDialog] Preview generated, length:', preview.length);
    setThermalPreview(preview);
  }, [ticketTemplate, ticketSampleData, companyConfig, isMonthlyVehicle]);

  const handleConfirmAndPrint = () => {
    // 🔴 CORREÇÃO CRÍTICA: Validar pagamento APENAS para veículos AVULSOS
    // Vagas extras (paga/cortesia) e mensalistas NÃO devem validar pagamento
    if (requiresPayment && paymentMethod === 'Dinheiro') {
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
    // Vagas extras, mensalistas e 'none' não emitem ticket
    if (isMonthlyVehicle || isVagaExtraPaga || isVagaExtraCortesia || receiptType === 'none') {
      onConfirm(paymentMethod, null);
      onOpenChange(false);
      return;
    }

    setShowReceipt(true);
  };

  const handlePrint = async () => {
    if (receiptType === 'simple') {
      const receiptData: ReceiptData = {
        receiptType: 'simple',
      };
      // Removed window.print() - no external print dialog
      onConfirm(paymentMethod, receiptData);
    } else {
      onConfirm(paymentMethod, null);
    }
    onOpenChange(false);
  };

  const exitDate = new Date();
  // Se estiver editando, usa o valor editado
  const entryDateTime = vehicle
    ? new Date(`${vehicle.entryDate}T${isEditingEntryTime ? editedEntryTime : vehicle.entryTime}`)
    : new Date();
  const duration = vehicle ? Math.floor((exitDate.getTime() - entryDateTime.getTime()) / 60000) : 0;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (showReceipt) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg print:shadow-none space-y-4">
          <DialogHeader>
            <DialogTitle>Pré-visualização do Ticket</DialogTitle>
          </DialogHeader>

          {isTemplateLoading ? (
            <div className="rounded border bg-muted/50 p-4 text-sm text-muted-foreground">
              Carregando template configurado...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded border bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[520px] overflow-auto">
                {thermalPreview || 'Preview indisponível para este template.'}
              </div>
              <p className="text-xs text-muted-foreground">
                Visualização baseada no template de impressora térmica configurado em Modelos de
                Recibos.
              </p>
            </div>
          )}

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setShowReceipt(false)}>
              Voltar
            </Button>
            <Button
              onClick={handlePrint}
              disabled={isTemplateLoading}
              title={isTemplateLoading ? 'Carregando template...' : thermalPreview ? 'Imprimir e confirmar saída' : 'Template não disponível, mas você pode continuar'}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir e Confirmar
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
          <DialogTitle className="flex items-center gap-2">
            {isVagaExtraCortesia && (
              <Badge className="bg-green-500 hover:bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                CORTESIA
              </Badge>
            )}
            {isVagaExtraPaga && (
              <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">
                <DollarSign className="h-3 w-3 mr-1" />
                EXTRA
              </Badge>
            )}
            {isVagaExtraPaga ? 'Finalizar Saída - Vaga Extra' :
              isVagaExtraCortesia ? 'Finalizar Saída - Cortesia' :
                'Confirmar Saída do Veículo'}
          </DialogTitle>
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
                  onChange={(e) => setEditedEntryTime(e.target.value)}
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
              <span className="text-2xl font-bold text-primary">
                R$ {calculatedValue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Vaga Extra Paga - Notice */}
          {isVagaExtraPaga && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Valor calculado:</strong> R$ {calculatedValue.toFixed(2)}<br />
                Este valor será incluído na fatura do convênio.<br />
                <span className="font-semibold">Cliente NÃO efetua pagamento agora.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Vaga Extra Cortesia - Notice */}
          {isVagaExtraCortesia && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Cortesia (R$ 0,00)</strong><br />
                Finalizar sem cobrança.
              </AlertDescription>
            </Alert>
          )}

          {!isMonthlyVehicle && requiresPayment && (
            <>
              {/* Payment Method */}
              <div>
                <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
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
            </>
          )}

          {/* Receipt Options - Only for regular vehicles */}
          {requiresPayment && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
              <Label className="text-base font-semibold">Emitir ticket de saída:</Label>
              <RadioGroup
                value={receiptType}
                onValueChange={(v) => setReceiptType(v as 'none' | 'simple')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="font-normal cursor-pointer">
                    Não emitir
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="simple" id="simple" />
                  <Label htmlFor="simple" className="font-normal cursor-pointer">
                    Imprimir ticket de saída
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmAndPrint}>
            {isVagaExtraPaga ? (
              'Finalizar e Faturar'
            ) : isVagaExtraCortesia ? (
              'Finalizar Cortesia'
            ) : isMonthlyVehicle || receiptType === 'none' ? (
              'Confirmar'
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Gerar pré-visualização
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
