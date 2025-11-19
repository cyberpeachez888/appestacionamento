import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, MessageSquare, Phone, Webhook, Send, CheckCircle, XCircle } from 'lucide-react';

interface IntegrationConfig {
  name: string;
  provider: string;
  enabled: boolean;
  config: Record<string, any>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const IntegrationsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSMS, setTestingSMS] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);

  // SMTP Config
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpFromEmail, setSmtpFromEmail] = useState('');

  // SMS Config (Twilio)
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioFromNumber, setTwilioFromNumber] = useState('');

  // WhatsApp Config
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');
  const [whatsappAccessToken, setWhatsappAccessToken] = useState('');

  // Test fields
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Load SMTP config
      const smtpRes = await fetch(`${API_URL}/api/integrations/configs/smtp`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (smtpRes.ok) {
        const smtp = await smtpRes.json();
        // Backend returns is_enabled, frontend expects enabled
        setSmtpEnabled(smtp.is_enabled || false);
        setSmtpHost(smtp.config?.host || '');
        setSmtpPort(smtp.config?.port || 587);
        setSmtpUser(smtp.config?.user || '');
        setSmtpPass(smtp.config?.pass || '');
        setSmtpSecure(smtp.config?.secure || false);
        setSmtpFromEmail(smtp.config?.fromEmail || '');
      } else if (smtpRes.status !== 404) {
        // 404 is OK (config doesn't exist yet), other errors should be logged
        const errorText = await smtpRes.text();
        console.error('Error loading SMTP config:', errorText);
      }

      // Load SMS config
      const smsRes = await fetch(`${API_URL}/api/integrations/configs/sms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (smsRes.ok) {
        const sms = await smsRes.json();
        setSmsEnabled(sms.is_enabled || false);
        setTwilioAccountSid(sms.config?.accountSid || '');
        setTwilioAuthToken(sms.config?.authToken || '');
        setTwilioFromNumber(sms.config?.fromNumber || '');
      } else if (smsRes.status !== 404) {
        const errorText = await smsRes.text();
        console.error('Error loading SMS config:', errorText);
      }

      // Load WhatsApp config
      const whatsappRes = await fetch(`${API_URL}/api/integrations/configs/whatsapp`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (whatsappRes.ok) {
        const whatsapp = await whatsappRes.json();
        setWhatsappEnabled(whatsapp.is_enabled || false);
        setWhatsappPhoneNumberId(whatsapp.config?.phoneNumberId || '');
        setWhatsappAccessToken(whatsapp.config?.accessToken || '');
      } else if (whatsappRes.status !== 404) {
        const errorText = await whatsappRes.text();
        console.error('Error loading WhatsApp config:', errorText);
      }
    } catch (err) {
      console.error('Error loading configs:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar configurações',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSMTPConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/integrations/configs/smtp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_enabled: smtpEnabled,
          config: {
            host: smtpHost,
            port: smtpPort,
            user: smtpUser,
            pass: smtpPass,
            secure: smtpSecure,
            fromEmail: smtpFromEmail,
          },
        }),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Configuração SMTP salva com sucesso',
        });
      } else {
        throw new Error('Erro ao salvar configuração');
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao salvar configuração SMTP',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSMSConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/integrations/configs/sms`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_enabled: smsEnabled,
          config: {
            accountSid: twilioAccountSid,
            authToken: twilioAuthToken,
            fromNumber: twilioFromNumber,
          },
        }),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Configuração SMS salva com sucesso',
        });
      } else {
        throw new Error('Erro ao salvar configuração');
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao salvar configuração SMS',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveWhatsAppConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/integrations/configs/whatsapp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_enabled: whatsappEnabled,
          config: {
            phoneNumberId: whatsappPhoneNumberId,
            accessToken: whatsappAccessToken,
          },
        }),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Configuração WhatsApp salva com sucesso',
        });
      } else {
        throw new Error('Erro ao salvar configuração');
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao salvar configuração WhatsApp',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Informe um email para teste',
      });
      return;
    }

    setTestingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/integrations/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: testEmail }),
      });

      if (response.ok) {
        toast({
          title: 'Email Enviado',
          description: 'Email de teste enviado com sucesso!',
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar email');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err.message || 'Erro ao enviar email de teste',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Informe um telefone para teste',
      });
      return;
    }

    setTestingSMS(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/integrations/test-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: testPhone }),
      });

      if (response.ok) {
        toast({
          title: 'SMS Enviado',
          description: 'SMS de teste enviado com sucesso!',
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar SMS');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err.message || 'Erro ao enviar SMS de teste',
      });
    } finally {
      setTestingSMS(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!testPhone) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Informe um telefone para teste',
      });
      return;
    }

    setTestingWhatsApp(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/integrations/test-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: testPhone }),
      });

      if (response.ok) {
        toast({
          title: 'WhatsApp Enviado',
          description: 'Mensagem de teste enviada com sucesso!',
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar WhatsApp');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err.message || 'Erro ao enviar WhatsApp de teste',
      });
    } finally {
      setTestingWhatsApp(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrações</h1>
        <p className="text-muted-foreground">Configure integrações com serviços externos</p>
      </div>

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            Email (SMTP)
          </TabsTrigger>
          <TabsTrigger value="sms">
            <Phone className="w-4 h-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <MessageSquare className="w-4 h-4 mr-2" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="w-4 h-4 mr-2" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        {/* EMAIL / SMTP Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configuração SMTP</CardTitle>
                  <CardDescription>
                    Configure o servidor de email para envio de recibos e notificações
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="smtp-enabled">Ativo</Label>
                  <Switch
                    id="smtp-enabled"
                    checked={smtpEnabled}
                    onCheckedChange={setSmtpEnabled}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">Host SMTP</Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.gmail.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Porta</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    placeholder="587"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-user">Usuário / Email</Label>
                <Input
                  id="smtp-user"
                  type="email"
                  placeholder="seu@email.com"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-pass">Senha</Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  placeholder="••••••••"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-from">Email de Envio</Label>
                <Input
                  id="smtp-from"
                  type="email"
                  placeholder="noreply@estacionamento.com"
                  value={smtpFromEmail}
                  onChange={(e) => setSmtpFromEmail(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="smtp-secure" checked={smtpSecure} onCheckedChange={setSmtpSecure} />
                <Label htmlFor="smtp-secure">Usar SSL/TLS</Label>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Gmail:</strong> Use smtp.gmail.com, porta 587, e crie uma "Senha de app"
                  nas configurações de segurança do Google.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={saveSMTPConfig} disabled={loading}>
                  Salvar Configuração
                </Button>

                <div className="flex gap-2 ml-auto">
                  <Input
                    placeholder="email@teste.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-64"
                  />
                  <Button
                    variant="outline"
                    onClick={handleTestEmail}
                    disabled={testingEmail || !smtpEnabled}
                  >
                    {testingEmail ? 'Enviando...' : 'Testar Email'}
                    <Send className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Tab */}
        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configuração SMS (Twilio)</CardTitle>
                  <CardDescription>Configure o Twilio para envio de SMS</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="sms-enabled">Ativo</Label>
                  <Switch id="sms-enabled" checked={smsEnabled} onCheckedChange={setSmsEnabled} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twilio-sid">Account SID</Label>
                <Input
                  id="twilio-sid"
                  placeholder="AC..."
                  value={twilioAccountSid}
                  onChange={(e) => setTwilioAccountSid(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twilio-token">Auth Token</Label>
                <Input
                  id="twilio-token"
                  type="password"
                  placeholder="••••••••"
                  value={twilioAuthToken}
                  onChange={(e) => setTwilioAuthToken(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twilio-from">Número de Envio</Label>
                <Input
                  id="twilio-from"
                  placeholder="+5511999999999"
                  value={twilioFromNumber}
                  onChange={(e) => setTwilioFromNumber(e.target.value)}
                />
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  Obtenha suas credenciais no{' '}
                  <a
                    href="https://console.twilio.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Console Twilio
                  </a>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={saveSMSConfig} disabled={loading}>
                  Salvar Configuração
                </Button>

                <div className="flex gap-2 ml-auto">
                  <Input
                    placeholder="+5511999999999"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-64"
                  />
                  <Button
                    variant="outline"
                    onClick={handleTestSMS}
                    disabled={testingSMS || !smsEnabled}
                  >
                    {testingSMS ? 'Enviando...' : 'Testar SMS'}
                    <Send className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configuração WhatsApp Business</CardTitle>
                  <CardDescription>Configure a API do WhatsApp Business</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="whatsapp-enabled">Ativo</Label>
                  <Switch
                    id="whatsapp-enabled"
                    checked={whatsappEnabled}
                    onCheckedChange={setWhatsappEnabled}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-phone-id">Phone Number ID</Label>
                <Input
                  id="whatsapp-phone-id"
                  placeholder="123456789012345"
                  value={whatsappPhoneNumberId}
                  onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-token">Access Token</Label>
                <Input
                  id="whatsapp-token"
                  type="password"
                  placeholder="••••••••"
                  value={whatsappAccessToken}
                  onChange={(e) => setWhatsappAccessToken(e.target.value)}
                />
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  Configure no{' '}
                  <a
                    href="https://developers.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Meta for Developers
                  </a>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={saveWhatsAppConfig} disabled={loading}>
                  Salvar Configuração
                </Button>

                <div className="flex gap-2 ml-auto">
                  <Input
                    placeholder="+5511999999999"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-64"
                  />
                  <Button
                    variant="outline"
                    onClick={handleTestWhatsApp}
                    disabled={testingWhatsApp || !whatsappEnabled}
                  >
                    {testingWhatsApp ? 'Enviando...' : 'Testar WhatsApp'}
                    <Send className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>Configure webhooks para integrações personalizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Webhooks permitem enviar eventos do sistema para URLs externas. Em breve!
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegrationsPage;
