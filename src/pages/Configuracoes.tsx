import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import api from '@/lib/api';
import PrinterConfigSection from '@/components/PrinterConfigSection';
import PrintPreviewDialog from '@/components/PrintPreviewDialog';
import BackupSettingsSection from '@/components/BackupSettingsSection';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Configuracoes() {
  const { toast } = useToast();
  const { hasPermission, isAdmin } = useAuth();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

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
      usbVendorId: '',
      usbProductId: '',
      networkHost: '',
      networkPort: 9100,
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
          usbVendorId: '',
          usbProductId: '',
          networkHost: '',
          networkPort: 9100,
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

        {/* Reset to First-Run Section (Admin Only) */}
        {isAdmin && (
          <div className="mt-8 bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  Área de Manutenção
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Esta ação irá resetar o sistema para o estado inicial (first-run). Todos os dados
                  serão limpos e você precisará executar o wizard de configuração novamente.
                </p>
                <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Resetar para First-Run
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Reset do Sistema</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <p>
                          <strong>Esta ação é irreversível!</strong>
                        </p>
                        <p>O sistema será resetado para o estado inicial. Isso irá:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Limpar todos os tickets, clientes mensalistas e pagamentos</li>
                          <li>Remover todas as tarifas e tipos de veículos</li>
                          <li>Deletar todos os usuários (exceto você, temporariamente)</li>
                          <li>Resetar as configurações da empresa</li>
                          <li>Marcar o setup como não concluído</li>
                        </ul>
                        <p className="pt-2">
                          Após o reset, você será redirecionado para o wizard de configuração
                          inicial.
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          setResetting(true);
                          try {
                            await api.resetToFirstRun();
                            toast({
                              title: 'Sistema resetado',
                              description:
                                'O sistema foi resetado com sucesso. Redirecionando...',
                            });
                            setTimeout(() => {
                              // Logout and redirect to setup
                              window.location.href = '/setup';
                            }, 1500);
                          } catch (error: any) {
                            toast({
                              title: 'Erro ao resetar',
                              description: error.message || 'Falha ao resetar o sistema',
                              variant: 'destructive',
                            });
                            setResetDialogOpen(false);
                          } finally {
                            setResetting(false);
                          }
                        }}
                        disabled={resetting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {resetting ? 'Resetando...' : 'Confirmar Reset'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}

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
