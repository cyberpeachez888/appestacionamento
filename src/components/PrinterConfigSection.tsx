import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Eye, Upload, Save, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PrinterConfig {
  printerModel: string;
  paperWidth: string;
  connectionType: string;
  autoprint: boolean;
  defaultPrinter: string;
  enableCut: boolean;
  enableBeep: boolean;
  enableDrawer: boolean;
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

interface PrinterConfigSectionProps {
  config: PrinterConfig;
  onChange: (config: PrinterConfig) => void;
  onSave: () => void;
  onPreview: () => void;
}

// Popular thermal printer models in Brazil
const PRINTER_MODELS = [
  { value: 'generic_escpos', label: 'Generic ESC/POS (Compatível)' },
  { value: 'epson_tm_t20', label: 'Epson TM-T20' },
  { value: 'epson_tm_t88', label: 'Epson TM-T88' },
  { value: 'bematech_mp4200', label: 'Bematech MP-4200' },
  { value: 'bematech_mp100', label: 'Bematech MP-100' },
  { value: 'daruma_dr700', label: 'Daruma DR-700' },
  { value: 'elgin_i9', label: 'Elgin i9' },
  { value: 'elgin_i7', label: 'Elgin i7' },
  { value: 'nitere_nscale', label: 'Nitere NScale' },
  { value: 'sweda_si300', label: 'Sweda SI-300' },
];

const CONNECTION_TYPES = [
  { value: 'usb', label: 'USB' },
  { value: 'network', label: 'Rede (Wi-Fi/Ethernet)' },
  { value: 'bluetooth', label: 'Bluetooth' },
  { value: 'serial', label: 'Serial (COM)' },
];

export default function PrinterConfigSection({ config, onChange, onSave, onPreview }: PrinterConfigSectionProps) {
  const { toast } = useToast();
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);

  // Detect available printers using browser API
  const detectPrinters = async () => {
    setDetecting(true);
    try {
      // Modern browsers support this experimental API
      if ('getInstalledRelatedApps' in navigator) {
        // Limited support - fallback to manual selection
        toast({
          title: 'Detecção de impressoras',
          description: 'Selecione manualmente a impressora nas configurações do navegador ao imprimir.',
        });
      }

      // For now, we'll rely on the browser's print dialog
      // In future, can integrate with native modules or Electron
      const printers = ['Impressora Padrão do Sistema'];
      setAvailablePrinters(printers);
    } catch (err) {
      console.error('Error detecting printers:', err);
      toast({
        title: 'Erro ao detectar impressoras',
        description: 'Use o diálogo de impressão do navegador para selecionar a impressora.',
        variant: 'destructive',
      });
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    detectPrinters();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem (PNG, JPG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const logoUrl = event.target?.result as string;
      onChange({ ...config, logoUrl, logoEnabled: true });
      toast({
        title: 'Logo carregada',
        description: 'A logo será exibida nos recibos impressos.',
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Printer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Configuração da Impressora
          </CardTitle>
          <CardDescription>
            Configure a impressora térmica para emissão de recibos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="printerModel">Modelo da Impressora</Label>
              <Select
                value={config.printerModel}
                onValueChange={(value) => onChange({ ...config, printerModel: value })}
              >
                <SelectTrigger id="printerModel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRINTER_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="connectionType">Tipo de Conexão</Label>
              <Select
                value={config.connectionType}
                onValueChange={(value) => onChange({ ...config, connectionType: value })}
              >
                <SelectTrigger id="connectionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="paperWidth">Largura do Papel</Label>
            <Select
              value={config.paperWidth}
              onValueChange={(value) => onChange({ ...config, paperWidth: value })}
            >
              <SelectTrigger id="paperWidth">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm (Mini)</SelectItem>
                <SelectItem value="80mm">80mm (Padrão)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="defaultPrinter">Nome da Impressora (opcional)</Label>
            <Input
              id="defaultPrinter"
              value={config.defaultPrinter}
              onChange={(e) => onChange({ ...config, defaultPrinter: e.target.value })}
              placeholder="Ex: Epson TM-T20"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Deixe em branco para usar a impressora padrão do sistema
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ESC/POS Features */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos ESC/POS</CardTitle>
          <CardDescription>
            Ative recursos especiais da impressora térmica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoprint">Impressão Automática</Label>
              <p className="text-xs text-muted-foreground">
                Imprime automaticamente sem mostrar diálogo
              </p>
            </div>
            <Switch
              id="autoprint"
              checked={config.autoprint}
              onCheckedChange={(checked) => onChange({ ...config, autoprint: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableCut">Corte Automático</Label>
              <p className="text-xs text-muted-foreground">
                Corta o papel após imprimir o recibo
              </p>
            </div>
            <Switch
              id="enableCut"
              checked={config.enableCut}
              onCheckedChange={(checked) => onChange({ ...config, enableCut: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableBeep">Sinal Sonoro</Label>
              <p className="text-xs text-muted-foreground">
                Emite um beep ao finalizar impressão
              </p>
            </div>
            <Switch
              id="enableBeep"
              checked={config.enableBeep}
              onCheckedChange={(checked) => onChange({ ...config, enableBeep: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableDrawer">Abertura de Gaveta</Label>
              <p className="text-xs text-muted-foreground">
                Abre a gaveta de dinheiro automaticamente
              </p>
            </div>
            <Switch
              id="enableDrawer"
              checked={config.enableDrawer}
              onCheckedChange={(checked) => onChange({ ...config, enableDrawer: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Layout Customization */}
      <Card>
        <CardHeader>
          <CardTitle>Personalização do Layout</CardTitle>
          <CardDescription>
            Configure cabeçalho, rodapé e logo do recibo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="logoUpload">Logo da Empresa</Label>
              <Switch
                checked={config.logoEnabled}
                onCheckedChange={(checked) => onChange({ ...config, logoEnabled: checked })}
              />
            </div>
            {config.logoEnabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="logoUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon" onClick={() => document.getElementById('logoUpload')?.click()}>
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                {config.logoUrl && (
                  <div className="border rounded p-2 flex justify-center bg-muted">
                    <img src={config.logoUrl} alt="Logo" className="max-h-24 object-contain" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Header Text */}
          <div>
            <Label htmlFor="headerText">Texto do Cabeçalho</Label>
            <Textarea
              id="headerText"
              value={config.headerText}
              onChange={(e) => onChange({ ...config, headerText: e.target.value })}
              placeholder="Ex: Estacionamento 24h - Seguro e Confiável"
              rows={2}
            />
          </div>

          {/* Footer Text */}
          <div>
            <Label htmlFor="footerText">Texto do Rodapé</Label>
            <Textarea
              id="footerText"
              value={config.footerText}
              onChange={(e) => onChange({ ...config, footerText: e.target.value })}
              placeholder="Ex: Obrigado pela preferência! Volte sempre!"
              rows={2}
            />
          </div>

          {/* Font and Spacing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fontSize">Tamanho da Fonte</Label>
              <Select
                value={config.fontSize}
                onValueChange={(value) => onChange({ ...config, fontSize: value })}
              >
                <SelectTrigger id="fontSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequena</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lineSpacing">Espaçamento</Label>
              <Select
                value={config.lineSpacing}
                onValueChange={(value) => onChange({ ...config, lineSpacing: value })}
              >
                <SelectTrigger id="lineSpacing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compacto</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="relaxed">Relaxado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onPreview}>
          <Eye className="h-4 w-4 mr-2" />
          Visualizar
        </Button>
        <Button onClick={onSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
