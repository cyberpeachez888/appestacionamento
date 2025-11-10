import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Copy, Pencil, Trash2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

interface ReceiptTemplate {
  id: string;
  templateName: string;
  templateType: 'parking_ticket' | 'monthly_payment' | 'general_receipt';
  description: string;
  isDefault: boolean;
  isActive: boolean;
  
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
  whatsappMessage?: string;
  
  availableVariables: string[];
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

  const fetchTemplates = async () => {
    try {
      const url = selectedType === 'all' 
        ? 'http://localhost:3000/receipt-templates' 
        : `http://localhost:3000/receipt-templates?type=${selectedType}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
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
      const url = editingTemplate
        ? `http://localhost:3000/receipt-templates/${editingTemplate.id}`
        : 'http://localhost:3000/receipt-templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({
          title: 'Sucesso',
          description: editingTemplate ? 'Template atualizado' : 'Template criado',
        });
        setDialogOpen(false);
        fetchTemplates();
      } else {
        throw new Error('Falha ao salvar template');
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o template',
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
      const res = await fetch(`http://localhost:3000/receipt-templates/${deletingTemplate.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (res.ok) {
        toast({
          title: 'Template excluído',
          description: 'O template foi removido com sucesso',
        });
        setDeleteDialogOpen(false);
        setDeletingTemplate(null);
        fetchTemplates();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao excluir');
      }
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
      const res = await fetch(`http://localhost:3000/receipt-templates/${template.id}/set-default`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (res.ok) {
        toast({
          title: 'Template padrão definido',
          description: `"${template.templateName}" agora é o template padrão`,
        });
        fetchTemplates();
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível definir como padrão',
        variant: 'destructive',
      });
    }
  };

  const handleClone = async (template: ReceiptTemplate) => {
    try {
      const res = await fetch(`http://localhost:3000/receipt-templates/${template.id}/clone`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (res.ok) {
        toast({
          title: 'Template duplicado',
          description: 'Uma cópia do template foi criada',
        });
        fetchTemplates();
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível duplicar o template',
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

  const filteredTemplates = templates;

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
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`bg-card border rounded-lg p-6 hover:shadow-md transition-shadow ${
                template.isDefault ? 'border-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{template.templateName}</h3>
                    {template.isDefault && (
                      <Star className="h-4 w-4 text-primary fill-primary" />
                    )}
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
                <p className="text-sm text-muted-foreground mb-4">
                  {template.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
                {template.showQrCode && <span className="bg-muted px-2 py-1 rounded">QR Code</span>}
                {template.showBarcode && <span className="bg-muted px-2 py-1 rounded">Código de Barras</span>}
                {template.customFields?.length > 0 && (
                  <span className="bg-muted px-2 py-1 rounded">
                    {template.customFields.length} campos extras
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(template)}
                  className="flex-1"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClone(template)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                {!template.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(template)}
                  >
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
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum template encontrado
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </DialogTitle>
              <DialogDescription>
                Configure os campos e estilos do recibo
              </DialogDescription>
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
                      onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
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
                        onCheckedChange={(checked) => setFormData({ ...formData, showLogo: checked })}
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
                      onCheckedChange={(checked) => setFormData({ ...formData, showPlate: checked })}
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
                      onCheckedChange={(checked) => setFormData({ ...formData, showValue: checked })}
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
                      onCheckedChange={(checked) => setFormData({ ...formData, showQrCode: checked })}
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
                          onChange={(e) => setFormData({ ...formData, barcodeData: e.target.value })}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o template "{deletingTemplate?.templateName}"?
                Esta ação não pode ser desfeita.
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
