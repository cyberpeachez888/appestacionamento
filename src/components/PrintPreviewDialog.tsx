import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './PrintPreviewDialog.css';

interface PrinterConfig {
  printerModel: string;
  paperWidth: string;
  logoUrl: string;
  logoEnabled: boolean;
  headerText: string;
  footerText: string;
  fontSize: string;
  lineSpacing: string;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface CompanyInfo {
  name: string;
  legalName?: string;
  cnpj?: string;
  address?: string;
  phone?: string;
}

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printerConfig: PrinterConfig;
  companyInfo: CompanyInfo;
}

export default function PrintPreviewDialog({
  open,
  onOpenChange,
  printerConfig,
  companyInfo,
}: PrintPreviewDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  // Sample receipt data
  const sampleReceipt = {
    number: '000123',
    date: new Date(),
    plate: 'ABC-1234',
    vehicleType: 'Carro',
    entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    exitTime: new Date(),
    duration: '2h 00min',
    value: 20.0,
    paymentMethod: 'Dinheiro',
    operator: 'João Silva',
  };

  const fontSizeClass =
    {
      small: 'text-xs',
      normal: 'text-sm',
      large: 'text-base',
    }[printerConfig.fontSize] || 'text-sm';

  const lineSpacingClass =
    {
      compact: 'leading-tight',
      normal: 'leading-normal',
      relaxed: 'leading-relaxed',
    }[printerConfig.lineSpacing] || 'leading-normal';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Visualização de Impressão</DialogTitle>
          <DialogDescription>
            Preview do recibo configurado para {printerConfig.paperWidth}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          {/* Print Preview Container */}
          <div
            className={`thermal-receipt-preview ${printerConfig.paperWidth === '58mm' ? 'thermal-58mm' : 'thermal-80mm'} ${fontSizeClass} ${lineSpacingClass}`}
            style={{
              paddingTop: `${printerConfig.margins.top}px`,
              paddingBottom: `${printerConfig.margins.bottom}px`,
              paddingLeft: `${printerConfig.margins.left}px`,
              paddingRight: `${printerConfig.margins.right}px`,
            }}
          >
            {/* Logo */}
            {printerConfig.logoEnabled && printerConfig.logoUrl && (
              <div className="receipt-logo">
                <img src={printerConfig.logoUrl} alt="Logo" />
              </div>
            )}

            {/* Company Header */}
            <div className="receipt-header">
              <div className="company-name">{companyInfo.name}</div>
              {companyInfo.legalName && (
                <div className="company-legal">{companyInfo.legalName}</div>
              )}
              {companyInfo.cnpj && <div className="company-info">CNPJ: {companyInfo.cnpj}</div>}
              {companyInfo.address && <div className="company-info">{companyInfo.address}</div>}
              {companyInfo.phone && <div className="company-info">Tel: {companyInfo.phone}</div>}
              {printerConfig.headerText && (
                <div className="header-text">{printerConfig.headerText}</div>
              )}
            </div>

            <div className="receipt-divider">═══════════════════════════════</div>

            {/* Receipt Details */}
            <div className="receipt-body">
              <div className="receipt-title">RECIBO DE ESTACIONAMENTO</div>

              <div className="receipt-row">
                <span>Nº:</span>
                <span className="receipt-value">{sampleReceipt.number}</span>
              </div>

              <div className="receipt-row">
                <span>Data:</span>
                <span className="receipt-value">
                  {format(sampleReceipt.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>

              <div className="receipt-divider-light">-------------------------------</div>

              <div className="receipt-row">
                <span>Placa:</span>
                <span className="receipt-value font-bold">{sampleReceipt.plate}</span>
              </div>

              <div className="receipt-row">
                <span>Veículo:</span>
                <span className="receipt-value">{sampleReceipt.vehicleType}</span>
              </div>

              <div className="receipt-divider-light">-------------------------------</div>

              <div className="receipt-row">
                <span>Entrada:</span>
                <span className="receipt-value">
                  {format(sampleReceipt.entryTime, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
              </div>

              <div className="receipt-row">
                <span>Saída:</span>
                <span className="receipt-value">
                  {format(sampleReceipt.exitTime, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
              </div>

              <div className="receipt-row">
                <span>Permanência:</span>
                <span className="receipt-value">{sampleReceipt.duration}</span>
              </div>

              <div className="receipt-divider">═══════════════════════════════</div>

              <div className="receipt-row receipt-total">
                <span className="font-bold">VALOR:</span>
                <span className="receipt-value font-bold text-lg">
                  R$ {sampleReceipt.value.toFixed(2)}
                </span>
              </div>

              <div className="receipt-row">
                <span>Forma Pgto:</span>
                <span className="receipt-value">{sampleReceipt.paymentMethod}</span>
              </div>

              <div className="receipt-divider">═══════════════════════════════</div>

              <div className="receipt-row">
                <span>Operador:</span>
                <span className="receipt-value">{sampleReceipt.operator}</span>
              </div>
            </div>

            {/* Footer */}
            {printerConfig.footerText && (
              <div className="receipt-footer">
                <div className="footer-text">{printerConfig.footerText}</div>
              </div>
            )}

            <div className="receipt-cut-line">✂ - - - - - - - - - - - - - - - - - -</div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Teste
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
