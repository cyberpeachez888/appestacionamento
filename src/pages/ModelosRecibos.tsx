import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Copy, Pencil, Trash2, Star, Maximize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FALLBACK_COMPANY,
  formatCurrencyBR,
  formatDateBR,
  formatTimeBR,
  wrapText,
  resolveCustomFieldValue,
  generateThermalPreview,
  toDate,
} from '@/lib/receiptPreview';

interface ReceiptTemplate {
  id: string;
  templateName: string;
  templateType: 'parking_ticket' | 'monthly_payment' | 'general_receipt' | string; // Permite tipos customizados
  description: string;
  isDefault: boolean;
  isActive: boolean;
  layout?: any;

  // Header
  showLogo: boolean;
  showCompanyName: boolean;
  showCompanyDetails: boolean;
  headerText?: string;

  // Body fields
  showReceiptNumber: boolean;
  showDate: boolean;
  showTime: boolean;
  showPlate: boolean;
  showVehicleType: boolean;
  showEntryTime: boolean;
  showExitTime: boolean;
  showDuration: boolean;
  showRate: boolean;
  showValue: boolean;
  showPaymentMethod: boolean;
  showOperator: boolean;

  // Custom fields
  customFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'textarea';
    required: boolean;
    defaultValue: string;
  }>;

  // Footer
  showQrCode: boolean;
  qrCodeData?: string;
  showBarcode: boolean;
  barcodeData?: string;
  barcodeType: string;
  termsAndConditions?: string;
  footerText?: string;
  showSignatureLine: boolean;

  // Styling
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;

  // Email/WhatsApp
  emailSubject?: string;
  emailBodyHtml?: string;
  emailBodyText?: string;
  whatsappMessage?: string;

  // Custom Template Text (texto livre editável)
  customTemplateText?: string;
  // Para parking_ticket: templates separados para entrada e saída
  customTemplateTextEntry?: string;
  customTemplateTextExit?: string;

  availableVariables: string[];
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function getReferenceLabel(date: Date) {
  return `${MONTH_NAMES[date.getMonth()]}/${date.getFullYear()}`;
}

// Função para gerar modelo padrão de template baseado no tipo
function generateDefaultTemplateText(
  templateType: 'parking_ticket' | 'monthly_payment' | 'general_receipt' | string,
  companyConfig: any | null
): string {
  const company = companyConfig || FALLBACK_COMPANY;
  const separator = '--------------------------------';

  // Tipos customizados não têm template padrão - retornar template básico
  const isCustomType = !['parking_ticket', 'monthly_payment', 'general_receipt'].includes(templateType);
  if (isCustomType) {
    // Template básico para tipos customizados
    return `${separator}
🚗 PROPARKING APP - 2025
Sistema de Gestão de Estacionamento
${separator}
${company.name || 'Nome da Empresa'}
${company.legalName || 'Razão Social'}
CNPJ: ${company.cnpj || '00.000.000/0000-00'}
${company.address || 'Endereço da Empresa'}
Tel: ${company.phone || '(00) 0000-0000'}
${separator}

RECIBO: {{receiptNumber}}
Data: {{date}}
Hora: {{time}}

${separator}
Documento sem validade fiscal
${separator}
Obrigado pela preferência!
© 2025 ProParking App
`;
  }

  if (templateType === 'monthly_payment') {
    return `${separator}
🚗 PROPARKING APP - 2025
Sistema de Gestão de Estacionamento
${separator}
${company.name || 'Nome da Empresa'}
${company.legalName || 'Razão Social'}
CNPJ: ${company.cnpj || '00.000.000/0000-00'}
${company.address || 'Endereço da Empresa'}
Tel: ${company.phone || '(00) 0000-0000'}
${separator}

RECIBO: {{receiptNumber}}
Data: {{date}}
Hora: {{time}}

CLIENTE: {{customerName}}
CPF/CNPJ: {{customerDocument}}
Telefone: {{customerPhone}}
Email: {{customerEmail}}

PLANO: {{planName}}
Referência: {{reference}}
Contrato: {{contractNumber}}
Período: {{contractPeriod}}
Vaga: {{parkingSlot}}

Vencimento: {{dueDate}}
Valor: {{value}}
Pagamento: {{paymentMethod}}
Data Pagamento: {{paymentDate}}
Operador: {{operator}}

${separator}
Documento sem validade fiscal
${separator}
Obrigado pela preferência!
© 2025 ProParking App
`;
  }

  // general_receipt
  return `${separator}
🚗 PROPARKING APP - 2025
Sistema de Gestão de Estacionamento
${separator}
${company.name || 'Nome da Empresa'}
${company.legalName || 'Razão Social'}
CNPJ: ${company.cnpj || '00.000.000/0000-00'}
${company.address || 'Endereço da Empresa'}
Tel: ${company.phone || '(00) 0000-0000'}
${separator}

RECIBO DE REEMBOLSO: {{receiptNumber}}
Data: {{date}}
Hora: {{time}}

SOLICITANTE: {{recipientName}}
CPF: {{recipientCpf}}

Placa: {{plate}}
Valor: {{value}}
Pagamento: {{paymentMethod}}
Emitido por: {{issuedBy}}

Descrição:
{{description}}

Observações:
{{notes}}

${separator}
Documento sem validade fiscal
${separator}
Obrigado pela preferência!
© 2025 ProParking App
`;
}

// Função para gerar modelos padrão separados para entrada e saída (parking_ticket)
function generateDefaultTemplateTextParking(
  companyConfig: any | null
): { entry: string; exit: string } {
  const company = companyConfig || FALLBACK_COMPANY;
  const separator = '--------------------------------';

  const entryTemplate = `${separator}
🚗 PROPARKING APP - 2025
Sistema de Gestão de Estacionamento
${separator}
${company.name || 'Nome da Empresa'}
${company.legalName || 'Razão Social'}
CNPJ: ${company.cnpj || '00.000.000/0000-00'}
${company.address || 'Endereço da Empresa'}
Tel: ${company.phone || '(00) 0000-0000'}
${separator}

TICKET DE ENTRADA
RECIBO: {{receiptNumber}}
Data: {{date}}
Hora: {{time}}
Placa: {{plate}}
Tipo: {{vehicleType}}
Entrada: {{entryTime}}
Operador: {{operator}}

${separator}
Documento sem validade fiscal
${separator}
Obrigado pela preferência!
© 2025 ProParking App
`;

  const exitTemplate = `${separator}
🚗 PROPARKING APP - 2025
Sistema de Gestão de Estacionamento
${separator}
${company.name || 'Nome da Empresa'}
${company.legalName || 'Razão Social'}
CNPJ: ${company.cnpj || '00.000.000/0000-00'}
${company.address || 'Endereço da Empresa'}
Tel: ${company.phone || '(00) 0000-0000'}
${separator}

TICKET DE SAÍDA
RECIBO: {{receiptNumber}}
Data: {{date}}
Hora: {{time}}
Placa: {{plate}}
Tipo: {{vehicleType}}

Entrada: {{entryTime}}
Saída: {{exitTime}}
Duração: {{duration}}

Tarifa: {{rate}}
Valor: {{value}}
Pagamento: {{paymentMethod}}
Operador: {{operator}}

${separator}
Documento sem validade fiscal
${separator}
Obrigado pela preferência!
© 2025 ProParking App
`;

  return { entry: entryTemplate, exit: exitTemplate };
}

function buildSampleData(
  templateType: string,
  template: ReceiptTemplate,
  companyConfig: any | null
) {
  const company = companyConfig || FALLBACK_COMPANY;
  const now = new Date();

  if (templateType === 'monthly_payment') {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 20);
    const contractStart = new Date(now);
    contractStart.setMonth(contractStart.getMonth() - 1);
    const contractEnd = new Date(contractStart);
    contractEnd.setMonth(contractEnd.getMonth() + 1);

    const sample = {
      receiptNumber: '000321',
      issuedAt: now,
      customer: {
        name: 'João Henrique Souza',
        document: 'CPF 123.456.789-00',
        phone: '(11) 91234-5678',
        email: 'joao.souza@email.com',
      },
      vehicle: {
        plate: 'ABC-1D23',
        model: 'SUV',
        color: 'Prata',
      },
      plan: {
        name: 'Mensalidade Premium 24h',
        description: 'Acesso 24h, vaga coberta, 1 veículo cadastrado',
        reference: getReferenceLabel(now),
      },
      payment: {
        method: 'Pix',
        amount: 420.5,
        dueDate,
        paidAt: now,
        status: 'Pago',
        transactionId: 'PIX-9F3A2',
        receivedBy: 'Maria Operadora',
      },
      contract: {
        start: contractStart,
        end: contractEnd,
        number: 'CN-2025-083',
      },
      slot: 'Vaga 12 - Setor B',
      notes: 'Tag 0152 liberada. Vaga exclusiva na área coberta.',
      company,
      customFieldValues: {
        referenceMonth: getReferenceLabel(now),
        contractNumber: 'CN-2025-083',
        contractStart: formatDateBR(contractStart),
        contractEnd: formatDateBR(contractEnd),
        contractPeriod: `${formatDateBR(contractStart)} a ${formatDateBR(contractEnd)}`,
        parkingSlot: 'Vaga 12 - Setor B',
        customerName: 'João Henrique Souza',
        customerDocument: 'CPF 123.456.789-00',
        customerPhone: '(11) 91234-5678',
        customerEmail: 'joao.souza@email.com',
        description: 'Mensalidade do plano premium com vaga coberta e tag de acesso.',
      },
    };

    if (Array.isArray(template.customFields)) {
      template.customFields.forEach((field, index) => {
        if (!sample.customFieldValues[field.name]) {
          sample.customFieldValues[field.name] =
            field.defaultValue || `Valor de exemplo ${index + 1}`;
        }
      });
    }

    return sample;
  }

  // For parking_ticket, create separate samples for entry and exit
  if (templateType === 'parking_ticket') {
    const entryTime = new Date(now);
    entryTime.setHours(entryTime.getHours() - 2);
    const exitTime = new Date(now);

    const entrySample = {
      receiptNumber: 'ENT-001',
      issuedAt: entryTime,
      vehicle: {
        plate: 'ABC-1234',
        vehicleType: 'Carro',
        entryTime: entryTime,
      },
      payment: {
        method: 'Não aplicável',
        amount: 0,
        paidAt: entryTime,
      },
      operator: 'Operador Exemplo',
      company,
      customFieldValues: {},
    };

    const exitSample = {
      receiptNumber: 'SAI-001',
      issuedAt: exitTime,
      vehicle: {
        plate: 'ABC-1234',
        vehicleType: 'Carro',
        entryTime: entryTime,
        exitTime: exitTime,
        duration: '2h 15min',
      },
      payment: {
        method: 'Dinheiro',
        amount: 15.0,
        paidAt: exitTime,
      },
      operator: 'Operador Exemplo',
      company,
      customFieldValues: {},
    };

    if (Array.isArray(template.customFields)) {
      template.customFields.forEach((field, index) => {
        entrySample.customFieldValues[field.name] =
          field.defaultValue || `Valor de exemplo ${index + 1}`;
        exitSample.customFieldValues[field.name] =
          field.defaultValue || `Valor de exemplo ${index + 1}`;
      });
    }

    return { entry: entrySample, exit: exitSample };
  }

  const sample = {
    receiptNumber: '000145',
    issuedAt: now,
    customer: {
      name: 'Cliente Exemplo',
      document: 'CPF 000.000.000-00',
    },
    vehicle: {
      plate: 'XYZ-9A88',
    },
    payment: {
      method: 'Dinheiro',
      amount: 35.9,
      paidAt: now,
    },
    notes: 'Recibo gerado para demonstração.',
    company,
    customFieldValues: {},
  };

  if (Array.isArray(template.customFields)) {
    template.customFields.forEach((field, index) => {
      sample.customFieldValues[field.name] =
        field.defaultValue || `Valor de exemplo ${index + 1}`;
    });
  }

  return sample;
}

function PdfPreview({
  template,
  sample,
  company,
}: {
  template: ReceiptTemplate;
  sample: any;
  company: any;
}) {
  const primaryColor = template.primaryColor || '#000000';
  const secondaryColor = template.secondaryColor || '#666666';
  const fontFamily = template.fontFamily || 'Arial, sans-serif';
  const companyInfo = company || FALLBACK_COMPANY;
  const customFields = (template.customFields || [])
    .map((field) => ({
      label: field.label || field.name,
      value: resolveCustomFieldValue(field, sample),
    }))
    .filter((field) => field.value);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="mx-auto w-full max-w-[480px] rounded-lg border bg-white shadow"
        style={{ fontFamily }}
      >
        <div
          className="border-b p-6 text-center"
          style={{ borderColor: `${secondaryColor}55` }}
        >
          {template.showLogo && (
            <div className="mb-3 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-muted-foreground/60 text-[10px] text-muted-foreground">
                LOGO
              </div>
            </div>
          )}

          {template.showCompanyName && (
            <h2 className="text-xl font-bold" style={{ color: primaryColor }}>
              {companyInfo?.name || FALLBACK_COMPANY.name}
            </h2>
          )}

          {template.showCompanyDetails && (
            <div className="mt-2 text-xs text-muted-foreground">
              {companyInfo?.legalName && <p>{companyInfo.legalName}</p>}
              {companyInfo?.cnpj && <p>CNPJ: {companyInfo.cnpj}</p>}
              {companyInfo?.address && <p>{companyInfo.address}</p>}
              {companyInfo?.phone && <p>Tel: {companyInfo.phone}</p>}
            </div>
          )}

          {template.headerText && (
            <p className="mt-3 text-sm text-muted-foreground">{template.headerText}</p>
          )}
        </div>

        <div className="space-y-6 p-6 text-sm text-slate-700">
          <section className="grid grid-cols-2 gap-4">
            {template.showReceiptNumber && sample.receiptNumber && (
              <div>
                <p className="text-xs uppercase text-muted-foreground">Recibo</p>
                <p className="font-medium">#{sample.receiptNumber}</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase text-muted-foreground">Data de Emissão</p>
              <p className="font-medium">
                {formatDateBR(sample.payment?.paidAt || sample.issuedAt)}
              </p>
              {template.showTime && (
                <p className="text-xs text-muted-foreground">
                  {formatTimeBR(sample.payment?.paidAt || sample.issuedAt)}
                </p>
              )}
            </div>
            {template.templateType === 'monthly_payment' && sample.payment?.dueDate && (
              <div>
                <p className="text-xs uppercase text-muted-foreground">Vencimento</p>
                <p className="font-medium">{formatDateBR(sample.payment.dueDate)}</p>
              </div>
            )}
            {template.showPaymentMethod && (
              <div>
                <p className="text-xs uppercase text-muted-foreground">Pagamento</p>
                <p className="font-medium">{sample.payment?.method}</p>
              </div>
            )}
            {template.showPlate && sample.vehicle?.plate && (
              <div>
                <p className="text-xs uppercase text-muted-foreground">Placa</p>
                <p className="font-medium">{sample.vehicle.plate}</p>
              </div>
            )}
            {template.templateType === 'monthly_payment' && sample.slot && (
              <div>
                <p className="text-xs uppercase text-muted-foreground">Vaga</p>
                <p className="font-medium">{sample.slot}</p>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-dashed border-muted-foreground/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">Resumo do Pagamento</p>
            <p className="text-2xl font-semibold" style={{ color: primaryColor }}>
              {formatCurrencyBR(sample.payment?.amount)}
            </p>
            {template.templateType === 'monthly_payment' && sample.plan?.reference && (
              <p className="text-xs text-muted-foreground">
                Referência: {sample.plan.reference}
              </p>
            )}
            {template.templateType === 'monthly_payment' && sample.plan?.name && (
              <p className="text-sm text-muted-foreground">{sample.plan.name}</p>
            )}
            {template.showOperator && sample.payment?.receivedBy && (
              <p className="text-xs text-muted-foreground">
                Recebido por: {sample.payment.receivedBy}
              </p>
            )}
            {sample.payment?.transactionId && (
              <p className="text-xs text-muted-foreground">
                Transação: {sample.payment.transactionId}
              </p>
            )}
          </section>

          <section className="grid gap-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Cliente</p>
              <p className="font-medium">{sample.customer?.name}</p>
              {sample.customer?.document && (
                <p className="text-xs text-muted-foreground">{sample.customer.document}</p>
              )}
              {sample.customer?.phone && (
                <p className="text-xs text-muted-foreground">{sample.customer.phone}</p>
              )}
            </div>

            {template.customFields?.length > 0 && customFields.length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase text-muted-foreground">Informações</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {customFields.map((field) => (
                    <div key={field.label} className="rounded bg-muted px-3 py-2 text-xs">
                      <p className="font-medium text-muted-foreground">{field.label}</p>
                      <p className="text-slate-700">{field.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {sample.notes && (
            <section className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-slate-600">Observações</p>
              <p>{sample.notes}</p>
            </section>
          )}

          {template.termsAndConditions && (
            <section className="rounded-lg border border-dashed border-muted-foreground/60 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-slate-600">Termos e Condições</p>
              <p>{template.termsAndConditions}</p>
            </section>
          )}

          {(template.showQrCode || template.showBarcode) && (
            <section className="flex flex-col items-center gap-4">
              {template.showQrCode && (
                <div className="flex h-28 w-28 items-center justify-center rounded border border-dashed border-muted-foreground/70 text-[10px] text-muted-foreground">
                  QR CODE
                </div>
              )}
              {template.showBarcode && (
                <div className="flex h-16 w-full max-w-[320px] items-center justify-center rounded border border-dashed border-muted-foreground/70 text-[10px] text-muted-foreground">
                  BARRAS ({template.barcodeType || 'CODE128'})
                </div>
              )}
            </section>
          )}

          {template.showSignatureLine && (
            <section className="pt-6">
              <div className="border-t border-dashed border-muted-foreground/60 pt-3 text-center text-xs text-muted-foreground">
                Assinatura do Responsável
              </div>
            </section>
          )}
        </div>

        {template.footerText && (
          <div className="px-6 pb-6 text-center text-xs text-muted-foreground">
            {template.footerText}
          </div>
        )}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Este preview representa o modelo em PDF enviado por e-mail/WhatsApp ao cliente.
      </p>
    </div>
  );
}

export default function ModelosRecibos() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReceiptTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<ReceiptTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ReceiptTemplate | null>(null);
  const [previewSampleData, setPreviewSampleData] = useState<any | null>(null);
  const [thermalPreview, setThermalPreview] = useState('');
  const [thermalPreviewEntry, setThermalPreviewEntry] = useState('');
  const [thermalPreviewExit, setThermalPreviewExit] = useState('');
  const [companyConfig, setCompanyConfig] = useState<any | null>(null);
  const [previewTab, setPreviewTab] = useState<'thermal' | 'pdf'>('thermal');

  const [isCreatingCustomType, setIsCreatingCustomType] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');
  const [formData, setFormData] = useState<Partial<ReceiptTemplate>>({
    templateName: '',
    templateType: 'general_receipt',
    description: '',
    isActive: true,
    isDefault: false,
    showLogo: true,
    showCompanyName: true,
    showCompanyDetails: true,
    showReceiptNumber: true,
    showDate: true,
    showTime: true,
    showPlate: true,
    showValue: true,
    showPaymentMethod: true,
    showSignatureLine: true,
    showVehicleType: false,
    showEntryTime: false,
    showExitTime: false,
    showDuration: false,
    showRate: false,
    showOperator: false,
    showQrCode: false,
    showBarcode: false,
    barcodeType: 'CODE128',
    primaryColor: '#000000',
    secondaryColor: '#666666',
    fontFamily: 'Arial',
    customFields: [],
  });

  useEffect(() => {
    fetchTemplates();
  }, [selectedType]);

  useEffect(() => {
    const loadCompanyConfig = async () => {
      try {
        const config = await api.getCompanyConfig();
        setCompanyConfig(config);
      } catch (err) {
        console.error('Erro ao carregar configuração da empresa:', err);
      }
    };

    loadCompanyConfig();
  }, []);

  useEffect(() => {
    if (!previewTemplate) {
      setPreviewSampleData(null);
      setThermalPreview('');
      setThermalPreviewEntry('');
      setThermalPreviewExit('');
      return;
    }

    const sample = buildSampleData(previewTemplate.templateType, previewTemplate, companyConfig);
    setPreviewSampleData(sample);

    // For parking_ticket, generate separate previews for entry and exit
    if (previewTemplate.templateType === 'parking_ticket' && sample && typeof sample === 'object' && 'entry' in sample && 'exit' in sample) {
      const parkingSample = sample as { entry: any; exit: any };
      setThermalPreviewEntry(generateThermalPreview(previewTemplate, parkingSample.entry, companyConfig));
      setThermalPreviewExit(generateThermalPreview(previewTemplate, parkingSample.exit, companyConfig));
      setThermalPreview(''); // Clear single preview
    } else {
      // Type guard: sample is ThermalSampleData (not parking_ticket format)
      const singleSample = sample as any;
      setThermalPreview(generateThermalPreview(previewTemplate, singleSample, companyConfig));
      setThermalPreviewEntry('');
      setThermalPreviewExit('');
    }
  }, [previewTemplate, companyConfig]);

  const fetchTemplates = async () => {
    try {
      const data = await api.getReceiptTemplates(selectedType);
      const normalized = Array.isArray(data) ? data : [];
      setTemplates(normalized);
      setPreviewTemplate((current) => {
        if (!normalized.length) {
          return null;
        }
        if (current) {
          const existing = normalized.find((template) => template.id === current.id);
          if (existing) {
            return existing;
          }
        }
        const preferred =
          normalized.find((template) => template.templateType !== 'parking_ticket') ||
          normalized[0];
        return preferred;
      });
    } catch (err) {
      console.error('Error fetching templates:', err);
      setTemplates([]); // Set empty array on error
      setPreviewTemplate(null);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar modelos de recibo',
      });
    }
  };

  const handlePreview = (template: ReceiptTemplate) => {
    setPreviewTemplate(template);
    setPreviewTab('thermal');
    setPreviewDialogOpen(true);
  };

  const handleInlinePreviewSelection = (templateId: string) => {
    if (!templateId) {
      setPreviewTemplate(null);
      return;
    }
    const collection = Array.isArray(templates) ? templates : [];
    const template = collection.find((item) => item.id === templateId) || null;
    setPreviewTemplate(template);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsCreatingCustomType(false);
    setCustomTypeName('');
    const defaultType = 'general_receipt';
    const defaultTemplateText = generateDefaultTemplateText(defaultType, companyConfig);
    const formDataBase: Partial<ReceiptTemplate> = {
      templateName: '',
      templateType: defaultType,
      description: '',
      isActive: true,
      isDefault: false,
      showLogo: true,
      showCompanyName: true,
      showCompanyDetails: true,
      showReceiptNumber: true,
      showDate: true,
      showTime: true,
      showPlate: true,
      showValue: true,
      showPaymentMethod: true,
      showSignatureLine: true,
      showVehicleType: false,
      showEntryTime: false,
      showExitTime: false,
      showDuration: false,
      showRate: false,
      showOperator: false,
      showQrCode: false,
      showBarcode: false,
      barcodeType: 'CODE128',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      fontFamily: 'Arial',
      customFields: [],
      customTemplateText: defaultTemplateText,
    };
    setFormData(formDataBase);
    setDialogOpen(true);
  };

  const handleEdit = (template: ReceiptTemplate) => {
    setEditingTemplate(template);
    // Verificar se é tipo customizado (não é um dos 3 padrões)
    const isCustomType = !['parking_ticket', 'monthly_payment', 'general_receipt'].includes(template.templateType);
    setIsCreatingCustomType(isCustomType);
    setCustomTypeName(isCustomType ? template.templateType : '');
    
    // Se não tiver customTemplateText, gerar o padrão baseado no tipo
    const templateData = { ...template };
    if (template.templateType === 'parking_ticket') {
      // Para parking_ticket, usar templates separados para entrada e saída
      if (!templateData.customTemplateTextEntry || !templateData.customTemplateTextExit) {
        const defaultParking = generateDefaultTemplateTextParking(companyConfig);
        templateData.customTemplateTextEntry = templateData.customTemplateTextEntry || defaultParking.entry;
        templateData.customTemplateTextExit = templateData.customTemplateTextExit || defaultParking.exit;
      }
    } else if (!isCustomType) {
      // Para tipos padrão (não customizados), usar customTemplateText único
      if (!templateData.customTemplateText) {
        templateData.customTemplateText = generateDefaultTemplateText(
          template.templateType,
          companyConfig
        );
      }
    }
    // Para tipos customizados, manter o customTemplateText como está (pode estar vazio)
    setFormData(templateData);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    // Validar tipo customizado se estiver criando
    if (isCreatingCustomType && (!customTypeName || customTypeName.trim() === '')) {
      toast({
        title: 'Erro',
        description: 'Digite o nome do tipo de recibo',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.templateName || !formData.templateType || formData.templateType.trim() === '') {
      toast({
        title: 'Erro',
        description: 'Nome e tipo são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (editingTemplate) {
        await api.updateReceiptTemplate(editingTemplate.id, formData);
      } else {
        await api.createReceiptTemplate(formData);
      }

      toast({
        title: 'Sucesso',
        description: editingTemplate ? 'Template atualizado' : 'Template criado',
      });
      setDialogOpen(false);
      fetchTemplates();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível salvar o template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;

    setLoading(true);
    try {
      await api.deleteReceiptTemplate(deletingTemplate.id);

      toast({
        title: 'Template excluído',
        description: 'O template foi removido com sucesso',
      });
      setDeleteDialogOpen(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível excluir o template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (template: ReceiptTemplate) => {
    try {
      await api.setDefaultReceiptTemplate(template.id);

      toast({
        title: 'Template padrão definido',
        description: `"${template.templateName}" agora é o template padrão`,
      });
      fetchTemplates();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível definir como padrão',
        variant: 'destructive',
      });
    }
  };

  const handleClone = async (template: ReceiptTemplate) => {
    try {
      await api.cloneReceiptTemplate(template.id);

      toast({
        title: 'Template duplicado',
        description: 'Uma cópia do template foi criada',
      });
      fetchTemplates();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível duplicar o template',
        variant: 'destructive',
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      parking_ticket: 'Ticket de Estacionamento',
      monthly_payment: 'Mensalista',
      general_receipt: 'Recibo de Reembolso',
    };
    // Se não for um dos tipos padrão, retorna o próprio nome (tipo customizado)
    return labels[type] || type;
  };

  const filteredTemplates = Array.isArray(templates) ? templates : [];

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Modelos de Recibos</h1>
          <p className="text-muted-foreground">
            Gerencie templates personalizados para diferentes tipos de recibos
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center justify-between mb-6">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="parking_ticket">Ticket de Estacionamento</SelectItem>
              <SelectItem value="monthly_payment">Mensalista</SelectItem>
              <SelectItem value="general_receipt">Recibo de Reembolso</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground mb-4">
                Nenhum template encontrado. Crie seu primeiro template!
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Template
              </Button>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`bg-card border rounded-lg p-6 hover:shadow-md transition-shadow ${
                  template.id === previewTemplate?.id
                    ? 'border-primary ring-1 ring-primary/30'
                    : template.isDefault
                      ? 'border-primary'
                      : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{template.templateName}</h3>
                      {template.isDefault && <Star className="h-4 w-4 text-primary fill-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getTypeLabel(template.templateType)}
                    </p>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs ${
                      template.isActive
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {template.isActive ? 'Ativo' : 'Inativo'}
                  </div>
                </div>

                {template.description && (
                  <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                )}

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
                  {template.showQrCode && (
                    <span className="bg-muted px-2 py-1 rounded">QR Code</span>
                  )}
                  {template.showBarcode && (
                    <span className="bg-muted px-2 py-1 rounded">Código de Barras</span>
                  )}
                  {template.customFields?.length > 0 && (
                    <span className="bg-muted px-2 py-1 rounded">
                      {template.customFields.length} campos extras
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(template)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Visualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="flex-1"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleClone(template)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  {!template.isDefault && (
                    <Button variant="outline" size="sm" onClick={() => handleSetDefault(template)}>
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeletingTemplate(template);
                      setDeleteDialogOpen(true);
                    }}
                    disabled={template.isDefault}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredTemplates.length > 0 && (
          <section className="mt-12 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Pré-visualização Rápida</h2>
                <p className="text-sm text-muted-foreground">
                  Veja como o comprovante é renderizado antes de aplicar alterações nos modelos.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={previewTemplate?.id}
                  onValueChange={handleInlinePreviewSelection}
                >
                  <SelectTrigger className="min-w-[240px]">
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.templateName} • {getTypeLabel(template.templateType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => previewTemplate && handlePreview(previewTemplate)}
                  disabled={!previewTemplate}
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Abrir em modal
                </Button>
              </div>
            </div>

            {previewTemplate && previewSampleData ? (
              <Tabs
                value={previewTab}
                onValueChange={(value) => setPreviewTab(value as 'thermal' | 'pdf')}
                className="space-y-4"
              >
                <TabsList className="grid w-full max-w-[320px] grid-cols-2">
                  <TabsTrigger value="thermal">Impressora Térmica</TabsTrigger>
                  <TabsTrigger value="pdf">Modelo PDF (completo)</TabsTrigger>
                </TabsList>
                <TabsContent value="thermal" className="space-y-3">
                  {previewTemplate.templateType === 'parking_ticket' ? (
                    <div className="space-y-6">
                      {/* Ticket de Entrada */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Ticket de Entrada</h4>
                        <div className="rounded border bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-auto">
                          {thermalPreviewEntry || 'Preview indisponível para este template.'}
                        </div>
                      </div>
                      {/* Ticket de Saída */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Ticket de Saída</h4>
                        <div className="rounded border bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-auto">
                          {thermalPreviewExit || 'Preview indisponível para este template.'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded border bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[520px] overflow-auto">
                        {thermalPreview || 'Preview indisponível para este template.'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Simulação textual de um cupom de 58 mm com dados fictícios.
                      </p>
                    </>
                  )}
                </TabsContent>
                <TabsContent value="pdf" className="pt-4">
                  {previewTemplate.templateType === 'parking_ticket' && previewSampleData && typeof previewSampleData === 'object' && 'entry' in previewSampleData && 'exit' in previewSampleData ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Ticket de Entrada</h4>
                        <PdfPreview
                          template={previewTemplate}
                          sample={previewSampleData.entry}
                          company={companyConfig}
                        />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Ticket de Saída</h4>
                        <PdfPreview
                          template={previewTemplate}
                          sample={previewSampleData.exit}
                          company={companyConfig}
                        />
                      </div>
                    </div>
                  ) : (
                    <PdfPreview
                      template={previewTemplate}
                      sample={previewSampleData}
                      company={companyConfig}
                    />
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecione um template para visualizar o recibo em tempo real.
              </p>
            )}
          </section>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Editar Template' : 'Novo Template'}</DialogTitle>
              <DialogDescription>Configure os campos e estilos do recibo</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="fields">Campos</TabsTrigger>
                <TabsTrigger value="footer">Rodapé</TabsTrigger>
                <TabsTrigger value="template">Template Livre</TabsTrigger>
                <TabsTrigger value="email">Email/WhatsApp</TabsTrigger>
              </TabsList>

              {/* Basic Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div>
                  <Label>Nome do Template *</Label>
                  <Input
                    value={formData.templateName}
                    onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                    placeholder="Ex: Recibo Padrão Vermelho"
                  />
                </div>

                <div>
                  <Label>Tipo *</Label>
                  {!isCreatingCustomType ? (
                    <Select
                      value={formData.templateType || ''}
                      onValueChange={(v: any) => {
                        if (v === '__create_new__') {
                          // Usuário quer criar tipo customizado
                          setIsCreatingCustomType(true);
                          setCustomTypeName('');
                          setFormData({
                            ...formData,
                            templateType: '',
                            customTemplateText: '', // Template em branco para tipo customizado
                            customTemplateTextEntry: undefined,
                            customTemplateTextExit: undefined,
                          });
                        } else {
                          // Tipo padrão selecionado
                          const newType = v as 'parking_ticket' | 'monthly_payment' | 'general_receipt';
                          if (newType === 'parking_ticket') {
                            // Para parking_ticket, usar templates separados
                            const defaultParking = generateDefaultTemplateTextParking(companyConfig);
                            setFormData({
                              ...formData,
                              templateType: newType,
                              customTemplateText: undefined,
                              customTemplateTextEntry: formData.customTemplateTextEntry || defaultParking.entry,
                              customTemplateTextExit: formData.customTemplateTextExit || defaultParking.exit,
                            });
                          } else {
                            // Para outros tipos, usar template único
                            const shouldUpdateTemplate =
                              !formData.customTemplateText || formData.customTemplateText.trim() === '';
                            const newTemplateText = shouldUpdateTemplate
                              ? generateDefaultTemplateText(newType, companyConfig)
                              : formData.customTemplateText;
                            setFormData({
                              ...formData,
                              templateType: newType,
                              customTemplateText: newTemplateText,
                              customTemplateTextEntry: undefined,
                              customTemplateTextExit: undefined,
                            });
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parking_ticket">Ticket de Estacionamento</SelectItem>
                        <SelectItem value="monthly_payment">Mensalista</SelectItem>
                        <SelectItem value="general_receipt">Recibo de Reembolso</SelectItem>
                        <SelectItem value="__create_new__">
                          <span className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Criar Novo +
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite o nome do tipo (ex: Recibo de Lavagem)"
                          value={customTypeName}
                          onChange={(e) => {
                            const newName = e.target.value.trim();
                            setCustomTypeName(newName);
                            setFormData({
                              ...formData,
                              templateType: newName, // Usa o nome digitado como tipo
                            });
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsCreatingCustomType(false);
                            setCustomTypeName('');
                            setFormData({
                              ...formData,
                              templateType: 'general_receipt', // Volta para padrão
                              customTemplateText: generateDefaultTemplateText('general_receipt', companyConfig),
                            });
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Digite um nome único para o novo tipo de recibo
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o propósito deste template"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label>Template Ativo</Label>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Template Padrão</Label>
                    <Switch
                      checked={formData.isDefault}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isDefault: checked })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-medium">Cabeçalho</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Mostrar Logo</Label>
                      <Switch
                        checked={formData.showLogo}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, showLogo: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Mostrar Nome da Empresa</Label>
                      <Switch
                        checked={formData.showCompanyName}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, showCompanyName: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between col-span-2">
                      <Label className="text-sm">Mostrar Detalhes da Empresa</Label>
                      <Switch
                        checked={formData.showCompanyDetails}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, showCompanyDetails: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Fields Tab */}
              <TabsContent value="fields" className="space-y-6">
                {formData.templateType === 'parking_ticket' ? (
                  <>
                    {/* Ticket de Entrada */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                        <h4 className="font-semibold text-lg">Ticket de Entrada</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Configure quais campos aparecerão no ticket impresso quando um veículo entra no estacionamento.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Número do Recibo</Label>
                          <Switch
                            checked={formData.showReceiptNumber}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showReceiptNumber: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Data</Label>
                          <Switch
                            checked={formData.showDate}
                            onCheckedChange={(checked) => setFormData({ ...formData, showDate: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Horário</Label>
                          <Switch
                            checked={formData.showTime}
                            onCheckedChange={(checked) => setFormData({ ...formData, showTime: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Placa</Label>
                          <Switch
                            checked={formData.showPlate}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showPlate: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Tipo de Veículo</Label>
                          <Switch
                            checked={formData.showVehicleType}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showVehicleType: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Horário de Entrada</Label>
                          <Switch
                            checked={formData.showEntryTime}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showEntryTime: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Operador</Label>
                          <Switch
                            checked={formData.showOperator}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showOperator: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Ticket de Saída */}
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                        <h4 className="font-semibold text-lg">Ticket de Saída</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Configure quais campos aparecerão no ticket impresso quando um veículo sai do estacionamento.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Número do Recibo</Label>
                          <Switch
                            checked={formData.showReceiptNumber}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showReceiptNumber: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Data</Label>
                          <Switch
                            checked={formData.showDate}
                            onCheckedChange={(checked) => setFormData({ ...formData, showDate: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Horário</Label>
                          <Switch
                            checked={formData.showTime}
                            onCheckedChange={(checked) => setFormData({ ...formData, showTime: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Placa</Label>
                          <Switch
                            checked={formData.showPlate}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showPlate: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Tipo de Veículo</Label>
                          <Switch
                            checked={formData.showVehicleType}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showVehicleType: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Horário de Entrada</Label>
                          <Switch
                            checked={formData.showEntryTime}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showEntryTime: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Horário de Saída</Label>
                          <Switch
                            checked={formData.showExitTime}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showExitTime: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Duração</Label>
                          <Switch
                            checked={formData.showDuration}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showDuration: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Tarifa</Label>
                          <Switch
                            checked={formData.showRate}
                            onCheckedChange={(checked) => setFormData({ ...formData, showRate: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Valor</Label>
                          <Switch
                            checked={formData.showValue}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showValue: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Forma de Pagamento</Label>
                          <Switch
                            checked={formData.showPaymentMethod}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showPaymentMethod: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Operador</Label>
                          <Switch
                            checked={formData.showOperator}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, showOperator: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="font-medium">Campos do Recibo</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Número do Recibo</Label>
                        <Switch
                          checked={formData.showReceiptNumber}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, showReceiptNumber: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Data</Label>
                        <Switch
                          checked={formData.showDate}
                          onCheckedChange={(checked) => setFormData({ ...formData, showDate: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Horário</Label>
                        <Switch
                          checked={formData.showTime}
                          onCheckedChange={(checked) => setFormData({ ...formData, showTime: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Placa</Label>
                        <Switch
                          checked={formData.showPlate}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, showPlate: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Tipo de Veículo</Label>
                        <Switch
                          checked={formData.showVehicleType}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, showVehicleType: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Horário de Entrada</Label>
                        <Switch
                          checked={formData.showEntryTime}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, showEntryTime: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Horário de Saída</Label>
                        <Switch
                          checked={formData.showExitTime}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, showExitTime: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Duração</Label>
                        <Switch
                          checked={formData.showDuration}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, showDuration: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Tarifa</Label>
                        <Switch
                          checked={formData.showRate}
                          onCheckedChange={(checked) => setFormData({ ...formData, showRate: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Valor</Label>
                        <Switch
                          checked={formData.showValue}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, showValue: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Forma de Pagamento</Label>
                        <Switch
                          checked={formData.showPaymentMethod}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, showPaymentMethod: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Operador</Label>
                        <Switch
                          checked={formData.showOperator}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, showOperator: checked })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Estilo</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Cor Primária</Label>
                      <Input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Cor Secundária</Label>
                      <Input
                        type="color"
                        value={formData.secondaryColor}
                        onChange={(e) =>
                          setFormData({ ...formData, secondaryColor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Fonte</Label>
                      <Select
                        value={formData.fontFamily}
                        onValueChange={(v) => setFormData({ ...formData, fontFamily: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Courier">Courier</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Footer Tab */}
              <TabsContent value="footer" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label>QR Code</Label>
                    <Switch
                      checked={formData.showQrCode}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, showQrCode: checked })
                      }
                    />
                  </div>
                  {formData.showQrCode && (
                    <div className="col-span-2">
                      <Label className="text-sm">Dados do QR Code (use variáveis)</Label>
                      <Input
                        value={formData.qrCodeData || ''}
                        onChange={(e) => setFormData({ ...formData, qrCodeData: e.target.value })}
                        placeholder="{{receiptNumber}}|{{plate}}|{{value}}"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label>Código de Barras</Label>
                    <Switch
                      checked={formData.showBarcode}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, showBarcode: checked })
                      }
                    />
                  </div>
                  {formData.showBarcode && (
                    <>
                      <div className="col-span-2">
                        <Label className="text-sm">Dados do Código de Barras</Label>
                        <Input
                          value={formData.barcodeData || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, barcodeData: e.target.value })
                          }
                          placeholder="{{receiptNumber}}"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-sm">Tipo</Label>
                        <Select
                          value={formData.barcodeType}
                          onValueChange={(v) => setFormData({ ...formData, barcodeType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CODE128">CODE128</SelectItem>
                            <SelectItem value="EAN13">EAN13</SelectItem>
                            <SelectItem value="CODE39">CODE39</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <Label>Termos e Condições</Label>
                  <Textarea
                    value={formData.termsAndConditions || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, termsAndConditions: e.target.value })
                    }
                    rows={3}
                    placeholder="Documento sem validade fiscal..."
                  />
                </div>

                <div>
                  <Label>Texto do Rodapé</Label>
                  <Textarea
                    value={formData.footerText || ''}
                    onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                    rows={2}
                    placeholder="Obrigado pela preferência!"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Linha de Assinatura</Label>
                  <Switch
                    checked={formData.showSignatureLine}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, showSignatureLine: checked })
                    }
                  />
                </div>
              </TabsContent>

              {/* Template Livre Tab */}
              <TabsContent value="template" className="space-y-4">
                {formData.templateType === 'parking_ticket' ? (
                  // Para parking_ticket: dois campos separados (Entrada e Saída)
                  <div className="space-y-6">
                    {/* Template de Entrada */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Template de Entrada</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const defaultParking = generateDefaultTemplateTextParking(companyConfig);
                            setFormData({
                              ...formData,
                              customTemplateTextEntry: defaultParking.entry,
                            });
                          }}
                        >
                          Restaurar Padrão
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Edite livremente o template de impressão para o ticket de entrada. Use variáveis como{' '}
                        {`{{receiptNumber}}, {{date}}, {{time}}, {{plate}}, {{vehicleType}}, {{entryTime}}, {{operator}}`}
                      </p>
                      <Textarea
                        value={formData.customTemplateTextEntry || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, customTemplateTextEntry: e.target.value })
                        }
                        placeholder="Digite ou edite o template de entrada..."
                        rows={15}
                        className="font-mono text-xs"
                      />
                    </div>

                    {/* Template de Saída */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Template de Saída</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const defaultParking = generateDefaultTemplateTextParking(companyConfig);
                            setFormData({
                              ...formData,
                              customTemplateTextExit: defaultParking.exit,
                            });
                          }}
                        >
                          Restaurar Padrão
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Edite livremente o template de impressão para o ticket de saída. Use variáveis como{' '}
                        {`{{receiptNumber}}, {{date}}, {{time}}, {{plate}}, {{vehicleType}}, {{entryTime}}, {{exitTime}}, {{duration}}, {{rate}}, {{value}}, {{paymentMethod}}, {{operator}}`}
                      </p>
                      <Textarea
                        value={formData.customTemplateTextExit || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, customTemplateTextExit: e.target.value })
                        }
                        placeholder="Digite ou edite o template de saída..."
                        rows={15}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="bg-muted p-3 rounded text-xs">
                      <p className="font-medium mb-1">Variáveis disponíveis:</p>
                      <p className="text-muted-foreground">
                        {`{{receiptNumber}}, {{date}}, {{time}}, {{plate}}, {{vehicleType}}, {{entryTime}}, {{exitTime}}, {{duration}}, {{rate}}, {{value}}, {{paymentMethod}}, {{operator}}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Para outros tipos: campo único
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Template de Impressão (Texto Livre)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const defaultText = generateDefaultTemplateText(
                            formData.templateType || 'general_receipt',
                            companyConfig
                          );
                          setFormData({ ...formData, customTemplateText: defaultText });
                        }}
                      >
                        Restaurar Padrão
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Edite livremente o template de impressão. Use variáveis como{' '}
                      {`{{receiptNumber}}, {{date}}, {{time}}, {{plate}}, {{value}}, etc.`}
                    </p>
                    <Textarea
                      value={formData.customTemplateText || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, customTemplateText: e.target.value })
                      }
                      placeholder="Digite ou edite o template de impressão..."
                      rows={20}
                      className="font-mono text-xs"
                    />
                    <div className="bg-muted p-3 rounded text-xs">
                      <p className="font-medium mb-1">Variáveis disponíveis:</p>
                      <p className="text-muted-foreground">
                        {formData.templateType === 'monthly_payment' && (
                          <>
                            {`{{receiptNumber}}, {{date}}, {{time}}, {{customerName}}, {{customerDocument}}, {{customerPhone}}, {{customerEmail}}, {{planName}}, {{reference}}, {{contractNumber}}, {{contractPeriod}}, {{parkingSlot}}, {{dueDate}}, {{value}}, {{paymentMethod}}, {{paymentDate}}, {{operator}}`}
                          </>
                        )}
                        {formData.templateType === 'general_receipt' && (
                          <>
                            {`{{receiptNumber}}, {{date}}, {{time}}, {{customerName}}, {{customerDocument}}, {{plate}}, {{value}}, {{paymentMethod}}, {{operator}}, {{notes}}`}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Email/WhatsApp Tab */}
              <TabsContent value="email" className="space-y-4">
                <div>
                  <Label>Assunto do Email</Label>
                  <Input
                    value={formData.emailSubject || ''}
                    onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                    placeholder="Recibo #{{receiptNumber}} - {{companyName}}"
                  />
                </div>

                {/* Editor de Template PDF/Email com Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Template PDF/Email (HTML)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Buscar template padrão do banco ou usar um template padrão
                        try {
                          const response = await fetch(
                            `/api/receipt-templates?type=${formData.templateType}&default=true`
                          );
                          if (response.ok) {
                            const data = await response.json();
                            if (data && data.length > 0 && data[0].emailBodyHtml) {
                              setFormData({ ...formData, emailBodyHtml: data[0].emailBodyHtml });
                              return;
                            }
                          }
                        } catch (error) {
                          console.error('Erro ao buscar template padrão:', error);
                        }
                        // Fallback: template padrão básico
                        const defaultHtml = formData.templateType === 'monthly_payment'
                          ? `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo Mensalista - ProParking App</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">PROPARKING APP - 2025</h1>
    </div>
    <div style="padding: 24px;">
      <h2>Recibo #{{receiptNumber}}</h2>
      <p><strong>Cliente:</strong> {{customerName}}</p>
      <p><strong>Valor:</strong> R$ {{value}}</p>
      <p><strong>Data:</strong> {{date}}</p>
    </div>
  </div>
</body>
</html>`
                          : `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo - ProParking App</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">PROPARKING APP - 2025</h1>
    </div>
    <div style="padding: 24px;">
      <h2>Recibo #{{receiptNumber}}</h2>
      <p><strong>Valor:</strong> R$ {{value}}</p>
      <p><strong>Data:</strong> {{date}}</p>
    </div>
  </div>
</body>
</html>`;
                        setFormData({ ...formData, emailBodyHtml: defaultHtml });
                      }}
                    >
                      Restaurar Padrão
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Edite livremente o template HTML para PDF/Email. Use variáveis como{' '}
                    {formData.templateType === 'monthly_payment'
                      ? `{{receiptNumber}}, {{customerName}}, {{plates}}, {{value}}, {{date}}, {{referenceMonth}}, {{paymentMethod}}, {{dueDate}}, {{companyName}}, etc.`
                      : formData.templateType === 'general_receipt'
                        ? `{{receiptNumber}}, {{recipientName}}, {{recipientCpf}}, {{plate}}, {{value}}, {{date}}, {{time}}, {{paymentMethod}}, {{description}}, {{issuedBy}}, {{companyName}}, etc.`
                        : `{{receiptNumber}}, {{date}}, {{time}}, {{plate}}, {{value}}, {{paymentMethod}}, {{companyName}}, etc.`}
                  </p>
                  
                  {/* Tabs para Editor e Preview */}
                  <Tabs defaultValue="editor" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="editor">Editor HTML</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="editor" className="space-y-2">
                      <Textarea
                        value={formData.emailBodyHtml || ''}
                        onChange={(e) => setFormData({ ...formData, emailBodyHtml: e.target.value })}
                        rows={20}
                        placeholder="<!DOCTYPE html>..."
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        💡 Dica: Use variáveis entre chaves duplas, ex: {`{{receiptNumber}}`}
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="preview" className="space-y-2">
                      <div className="border rounded-lg p-4 bg-white max-h-[600px] overflow-auto">
                        {formData.emailBodyHtml ? (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: formData.emailBodyHtml
                                .replace(/\{\{receiptNumber\}\}/g, '001234')
                                .replace(/\{\{customerName\}\}/g, 'Cliente Exemplo')
                                .replace(/\{\{plates\}\}/g, 'ABC-1234')
                                .replace(/\{\{value\}\}/g, '150,00')
                                .replace(/\{\{date\}\}/g, '15/01/2025')
                                .replace(/\{\{time\}\}/g, '14:30')
                                .replace(/\{\{referenceMonth\}\}/g, 'Janeiro/2025')
                                .replace(/\{\{paymentMethod\}\}/g, 'PIX')
                                .replace(/\{\{dueDate\}\}/g, '15/02/2025')
                                .replace(/\{\{recipientName\}\}/g, 'João Silva')
                                .replace(/\{\{recipientCpf\}\}/g, '000.000.000-00')
                                .replace(/\{\{plate\}\}/g, 'XYZ-9876')
                                .replace(/\{\{description\}\}/g, 'Reembolso de estacionamento')
                                .replace(/\{\{issuedBy\}\}/g, 'Operador Exemplo')
                                .replace(/\{\{companyName\}\}/g, companyConfig?.name || 'Nome da Empresa')
                                .replace(/\{\{companyLegalName\}\}/g, companyConfig?.legalName || 'Razão Social')
                                .replace(/\{\{companyCnpj\}\}/g, companyConfig?.cnpj || '00.000.000/0000-00')
                                .replace(/\{\{companyAddress\}\}/g, companyConfig?.address || 'Endereço da Empresa')
                                .replace(/\{\{companyPhone\}\}/g, companyConfig?.phone || '(00) 0000-0000'),
                            }}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Digite o HTML do template para ver o preview
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ⚠️ Preview com dados de exemplo. As variáveis serão substituídas pelos dados reais ao enviar.
                      </p>
                    </TabsContent>
                  </Tabs>
                </div>

                <div>
                  <Label>Mensagem WhatsApp</Label>
                  <Textarea
                    value={formData.whatsappMessage || ''}
                    onChange={(e) => setFormData({ ...formData, whatsappMessage: e.target.value })}
                    rows={4}
                    placeholder="RECIBO #{{receiptNumber}}\nPlaca: {{plate}}\nValor: R$ {{value}}"
                  />
                </div>

                <div className="bg-muted p-3 rounded text-xs">
                  <p className="font-medium mb-1">Variáveis disponíveis:</p>
                  <p className="text-muted-foreground">
                    {formData.templateType === 'monthly_payment' && (
                      <>
                        {`{{receiptNumber}}, {{customerName}}, {{plates}}, {{value}}, {{date}}, {{referenceMonth}}, {{paymentMethod}}, {{dueDate}}, {{companyName}}, {{companyLegalName}}, {{companyCnpj}}, {{companyAddress}}, {{companyPhone}}`}
                      </>
                    )}
                    {formData.templateType === 'general_receipt' && (
                      <>
                        {`{{receiptNumber}}, {{recipientName}}, {{recipientCpf}}, {{plate}}, {{value}}, {{date}}, {{time}}, {{paymentMethod}}, {{description}}, {{issuedBy}}, {{companyName}}, {{companyLegalName}}, {{companyCnpj}}, {{companyAddress}}, {{companyPhone}}`}
                      </>
                    )}
                    {formData.templateType === 'parking_ticket' && (
                      <>
                        {`{{receiptNumber}}, {{date}}, {{time}}, {{plate}}, {{vehicleType}}, {{entryTime}}, {{exitTime}}, {{duration}}, {{rate}}, {{value}}, {{paymentMethod}}, {{operator}}, {{companyName}}, {{companyLegalName}}, {{companyCnpj}}, {{companyAddress}}, {{companyPhone}}`}
                      </>
                    )}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Salvando...' : editingTemplate ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview do Template</DialogTitle>
              <DialogDescription>
                {previewTemplate
                  ? `Visualizando "${previewTemplate.templateName}".`
                  : 'Selecione um template para visualizar.'}
              </DialogDescription>
            </DialogHeader>

            {previewTemplate && previewSampleData ? (
              <Tabs
                value={previewTab}
                onValueChange={(value) => setPreviewTab(value as 'thermal' | 'pdf')}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="thermal">Impressora Térmica</TabsTrigger>
                  <TabsTrigger value="pdf">Modelo PDF (completo)</TabsTrigger>
                </TabsList>

                <TabsContent value="thermal" className="space-y-3">
                  {previewTemplate.templateType === 'parking_ticket' ? (
                    <div className="space-y-6">
                      {/* Ticket de Entrada */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Ticket de Entrada</h4>
                        <div className="rounded border bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-auto">
                          {thermalPreviewEntry || 'Preview indisponível para este template.'}
                        </div>
                      </div>
                      {/* Ticket de Saída */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Ticket de Saída</h4>
                        <div className="rounded border bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-auto">
                          {thermalPreviewExit || 'Preview indisponível para este template.'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded border bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[520px] overflow-auto">
                        {thermalPreview || 'Preview indisponível para este template.'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Simulação em texto monoespaçado de um cupom de 58 mm com dados fictícios de
                        mensalista.
                      </p>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="pdf" className="pt-4">
                  {previewTemplate.templateType === 'parking_ticket' && previewSampleData && typeof previewSampleData === 'object' && 'entry' in previewSampleData && 'exit' in previewSampleData ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Ticket de Entrada</h4>
                        <PdfPreview
                          template={previewTemplate}
                          sample={previewSampleData.entry}
                          company={companyConfig}
                        />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Ticket de Saída</h4>
                        <PdfPreview
                          template={previewTemplate}
                          sample={previewSampleData.exit}
                          company={companyConfig}
                        />
                      </div>
                    </div>
                  ) : (
                    <PdfPreview
                      template={previewTemplate}
                      sample={previewSampleData}
                      company={companyConfig}
                    />
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum template selecionado para visualização.
              </p>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o template "{deletingTemplate?.templateName}"? Esta
                ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={loading}>
                {loading ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
