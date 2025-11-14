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
  templateType: 'parking_ticket' | 'monthly_payment' | 'general_receipt';
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
  const [companyConfig, setCompanyConfig] = useState<any | null>(null);
  const [previewTab, setPreviewTab] = useState<'thermal' | 'pdf'>('thermal');

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
      return;
    }

    const sample = buildSampleData(previewTemplate.templateType, previewTemplate, companyConfig);
    setPreviewSampleData(sample);
    setThermalPreview(generateThermalPreview(previewTemplate, sample, companyConfig));
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
    setFormData({
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
    setDialogOpen(true);
  };

  const handleEdit = (template: ReceiptTemplate) => {
    setEditingTemplate(template);
    setFormData(template);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.templateName || !formData.templateType) {
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
      general_receipt: 'Recibo Geral',
    };
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
              <SelectItem value="general_receipt">Recibo Geral</SelectItem>
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
                  <div className="rounded border bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[520px] overflow-auto">
                    {thermalPreview || 'Preview indisponível para este template.'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Simulação textual de um cupom de 58 mm com dados fictícios.
                  </p>
                </TabsContent>
                <TabsContent value="pdf" className="pt-4">
                  <PdfPreview
                    template={previewTemplate}
                    sample={previewSampleData}
                    company={companyConfig}
                  />
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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="fields">Campos</TabsTrigger>
                <TabsTrigger value="footer">Rodapé</TabsTrigger>
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
                  <Select
                    value={formData.templateType}
                    onValueChange={(v: any) => setFormData({ ...formData, templateType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parking_ticket">Ticket de Estacionamento</SelectItem>
                      <SelectItem value="monthly_payment">Mensalista</SelectItem>
                      <SelectItem value="general_receipt">Recibo Geral</SelectItem>
                    </SelectContent>
                  </Select>
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
              <TabsContent value="fields" className="space-y-4">
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

                <div>
                  <Label>Corpo do Email (HTML)</Label>
                  <Textarea
                    value={formData.emailBodyHtml || ''}
                    onChange={(e) => setFormData({ ...formData, emailBodyHtml: e.target.value })}
                    rows={6}
                    placeholder="<html><body>...</body></html>"
                    className="font-mono text-xs"
                  />
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
                    &#123;&#123;receiptNumber&#125;&#125;, &#123;&#123;date&#125;&#125;,
                    &#123;&#123;plate&#125;&#125;, &#123;&#123;value&#125;&#125;,
                    &#123;&#123;paymentMethod&#125;&#125;, &#123;&#123;companyName&#125;&#125;, etc.
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
                  <div className="rounded border bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[520px] overflow-auto">
                    {thermalPreview || 'Preview indisponível para este template.'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Simulação em texto monoespaçado de um cupom de 58 mm com dados fictícios de
                    mensalista.
                  </p>
                </TabsContent>

                <TabsContent value="pdf" className="pt-4">
                  <PdfPreview
                    template={previewTemplate}
                    sample={previewSampleData}
                    company={companyConfig}
                  />
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
