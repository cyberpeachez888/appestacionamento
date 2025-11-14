import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer } from 'lucide-react';
import { CompanyConfig, Vehicle } from '@/contexts/ParkingContext';

interface ReimbursementReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  companyConfig?: CompanyConfig;
  operatorName?: string;
  onSubmit?: (payload: { clientName: string; clientCpf?: string; notes?: string }) => Promise<void>;
}

export function ReimbursementReceiptDialog({
  open,
  onOpenChange,
  vehicle,
  companyConfig,
  operatorName = 'Operador',
  onSubmit,
}: ReimbursementReceiptDialogProps) {
  const [clientName, setClientName] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [notes, setNotes] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setClientName('');
      setClientCpf('');
      setNotes('');
      setShowReceipt(false);
      setIsSubmitting(false);
    }
  }, [open]);

  const exitDate = useMemo(() => {
    return vehicle?.exitDate && vehicle?.exitTime
      ? new Date(`${vehicle.exitDate}T${vehicle.exitTime}`)
      : new Date();
  }, [vehicle]);

  const entryDateTime = useMemo(() => {
    return vehicle?.entryDate && vehicle?.entryTime
      ? new Date(`${vehicle.entryDate}T${vehicle.entryTime}`)
      : new Date();
  }, [vehicle]);

  const duration = useMemo(() => {
    if (!vehicle) return { hours: 0, minutes: 0 };
    const diff = exitDate.getTime() - entryDateTime.getTime();
    const totalMinutes = Math.max(Math.floor(diff / 60000), 0);
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  }, [vehicle, entryDateTime, exitDate]);

  const handleGeneratePreview = () => {
    if (!clientName.trim()) {
      return;
    }
    setShowReceipt(true);
  };

  const handlePrint = async () => {
    if (!vehicle) return;
    try {
      setIsSubmitting(true);
      if (onSubmit) {
        await onSubmit({
          clientName: clientName.trim(),
          clientCpf: clientCpf.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
      window.print();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!vehicle) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setShowReceipt(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Impressão para Reembolso</DialogTitle>
        </DialogHeader>

        {!showReceipt ? (
          <div className="space-y-4 mt-4">
            <div className="bg-muted/40 p-4 rounded border">
              <p className="text-sm text-muted-foreground mb-2">Dados do veículo</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Placa:</span>
                  <p className="font-semibold uppercase">{vehicle.plate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p>{vehicle.vehicleType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entrada:</span>
                  <p>
                    {vehicle.entryDate
                      ? format(new Date(vehicle.entryDate), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'}{' '}
                    {vehicle.entryTime}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Saída:</span>
                  <p>
                    {vehicle.exitDate
                      ? format(new Date(vehicle.exitDate), 'dd/MM/yyyy', { locale: ptBR })
                      : format(exitDate, 'dd/MM/yyyy', { locale: ptBR })}{' '}
                    {vehicle.exitTime || format(exitDate, 'HH:mm', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Permanência:</span>
                  <p>
                    {duration.hours}h {duration.minutes}min
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor total:</span>
                  <p>{vehicle.totalValue > 0 ? `R$ ${vehicle.totalValue.toFixed(2)}` : '—'}</p>
                </div>
              </div>
            </div>

            <div>
              <Label>
                Nome do solicitante <span className="text-destructive">*</span>
              </Label>
              <Input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>CPF (opcional)</Label>
              <Input
                value={clientCpf}
                onChange={(event) => setClientCpf(event.target.value)}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Motivo do reembolso, centro de custo, etc."
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              ref={receiptRef}
              className="bg-white text-black p-8 rounded-lg border-2 border-gray-300"
            >
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">{companyConfig?.name || 'Estacionamento'}</h2>
                {companyConfig?.cnpj && (
                  <p className="text-sm text-muted-foreground">CNPJ: {companyConfig.cnpj}</p>
                )}
                {companyConfig?.address && (
                  <p className="text-xs text-muted-foreground">{companyConfig.address}</p>
                )}
                <p className="text-lg font-semibold mt-2">RECIBO DE REEMBOLSO</p>
              </div>

              <div className="space-y-2 border-b py-3">
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
              </div>

              <div className="space-y-2 border-b py-3">
                <div className="flex justify-between">
                  <span className="font-medium">Placa:</span>
                  <span className="font-semibold uppercase">{vehicle.plate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Tipo:</span>
                  <span>{vehicle.vehicleType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Entrada:</span>
                  <span>
                    {format(entryDateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Saída:</span>
                  <span>{format(exitDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Permanência:</span>
                  <span>
                    {duration.hours}h {duration.minutes}min
                  </span>
                </div>
              </div>

              <div className="space-y-2 border-b py-3">
                <div className="flex justify-between">
                  <span className="font-medium">Valor Pago:</span>
                  <span className="font-semibold">
                    {vehicle.totalValue > 0 ? `R$ ${vehicle.totalValue.toFixed(2)}` : 'R$ 0,00'}
                  </span>
                </div>
              </div>

              {notes && (
                <div className="mt-4">
                  <p className="font-medium">Observações:</p>
                  <p className="text-sm mt-1">{notes}</p>
                </div>
              )}

              <div className="text-center text-sm text-muted-foreground border-t pt-4 mt-6">
                <p>Operador: {operatorName}</p>
                <p className="mt-2">Documento gerado para fins de reembolso corporativo.</p>
                <p className="text-xs mt-2">
                  {format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!showReceipt ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGeneratePreview} disabled={!clientName.trim()}>
                Gerar prévia
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowReceipt(false)}>
                Voltar
              </Button>
              <Button onClick={handlePrint} disabled={isSubmitting}>
                <Printer className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Registrando...' : 'Imprimir e Registrar'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

