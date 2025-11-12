import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import PrinterConfigSection from '@/components/PrinterConfigSection';
import PrintPreviewDialog from '@/components/PrintPreviewDialog';
import BackupSettingsSection from '@/components/BackupSettingsSection';

export default function Configuracoes() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [config, setConfig] = useState<any>({
    name: '',
    legalName: '',
    cnpj: '',
    address: '',
    phone: '',
    primaryColor: '#000000',
    receiptCounter: 0,
    printerConfig: {
      printerModel: 'generic_escpos',
      paperWidth: '80mm',
      connectionType: 'usb',
      autoprint: false,
      defaultPrinter: '',
      enableCut: true,
      enableBeep: false,
      enableDrawer: false,
      logoUrl: '',
      logoEnabled: false,
      headerText: '',
      footerText: 'Obrigado pela preferência!',
      fontSize: 'normal',
      lineSpacing: 'normal',
      margins: {
        top: 10,
        bottom: 10,
        left: 5,
        right: 5,
      },
    },
  });

  const [previewOpen, setPreviewOpen] = useState(false);

  // --- BUSCAR CONFIGURAÇÃO DO BACKEND ---
  const fetchConfig = async () => {
    try {
      const data = await api.getCompanyConfig();
      // Ensure printerConfig exists even if not in database yet
      setConfig({
        ...data,
        printerConfig: data.printerConfig || {
          printerModel: 'generic_escpos',
          paperWidth: '80mm',
          connectionType: 'usb',
          autoprint: false,
          defaultPrinter: '',
          enableCut: true,
          enableBeep: false,
          enableDrawer: false,
          logoUrl: '',
          logoEnabled: false,
          headerText: '',
          footerText: 'Obrigado pela preferência!',
          fontSize: 'normal',
          lineSpacing: 'normal',
          margins: {
            top: 10,
            bottom: 10,
            left: 5,
            right: 5,
          },
        },
      });
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('manageCompanyConfig')) return; // silently ignore if no permission

    try {
      await api.updateCompanyConfig(config);

      toast({
        title: 'Configurações salvas',
        description: 'As informações da empresa foram atualizadas com sucesso',
      });

      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('companyConfigUpdated'));

      fetchConfig(); // atualizar com dados retornados do backend
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as configurações',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Dados da empresa, impressora e personalização
          </p>
        </div>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="company">Informações da Empresa</TabsTrigger>
            <TabsTrigger value="printer">Configuração de Impressora</TabsTrigger>
            <TabsTrigger value="backup">Backups Automáticos</TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">Nome da Empresa *</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    placeholder="Estacionamento Exemplo"
                  />
                </div>

                <div>
                  <Label htmlFor="legalName">Razão Social</Label>
                  <Input
                    id="legalName"
                    value={config.legalName}
                    onChange={(e) => setConfig({ ...config, legalName: e.target.value })}
                    placeholder="Empresa Exemplo Ltda"
                  />
                </div>

                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={config.cnpj}
                    onChange={(e) => setConfig({ ...config, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={config.address}
                    onChange={(e) => setConfig({ ...config, address: e.target.value })}
                    placeholder="Rua Exemplo, 123 - Bairro - Cidade/UF"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input
                    id="phone"
                    value={config.phone}
                    onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <Label htmlFor="primaryColor">Cor Primária</Label>
                  <div className="flex gap-4 items-center">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <span className="text-sm text-muted-foreground">{config.primaryColor}</span>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Contador de Recibos:</strong>{' '}
                    {config.receiptCounter.toString().padStart(6, '0')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O contador é incrementado automaticamente a cada recibo emitido
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  {hasPermission('manageCompanyConfig') ? (
                    <Button type="submit">Salvar Configurações</Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Visualização somente. Sem permissão para editar.
                    </p>
                  )}
                </div>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="printer">
            <PrinterConfigSection
              config={config.printerConfig || {}}
              onChange={(printerConfig) => setConfig({ ...config, printerConfig })}
              onSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
              onPreview={() => setPreviewOpen(true)}
            />
          </TabsContent>

          <TabsContent value="backup">
            <BackupSettingsSection />
          </TabsContent>
        </Tabs>

        <PrintPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          printerConfig={config.printerConfig || {}}
          companyInfo={{
            name: config.name,
            legalName: config.legalName,
            cnpj: config.cnpj,
            address: config.address,
            phone: config.phone,
          }}
        />
      </div>
    </div>
  );
}
