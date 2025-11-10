import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, User, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form data
  const [formData, setFormData] = useState({
    // Company info
    companyName: '',
    cnpj: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    
    // Admin user
    adminName: '',
    adminEmail: '',
    adminLogin: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 2) {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Nome da empresa é obrigatório';
      }
      if (formData.cnpj && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(formData.cnpj)) {
        newErrors.cnpj = 'CNPJ inválido (use formato: 00.000.000/0000-00)';
      }
    }

    if (step === 3) {
      if (!formData.adminLogin.trim()) {
        newErrors.adminLogin = 'Login é obrigatório';
      }
      if (!formData.adminPassword) {
        newErrors.adminPassword = 'Senha é obrigatória';
      } else if (formData.adminPassword.length < 6) {
        newErrors.adminPassword = 'Senha deve ter no mínimo 6 caracteres';
      }
      if (formData.adminPassword !== formData.adminPasswordConfirm) {
        newErrors.adminPasswordConfirm = 'As senhas não coincidem';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/setup/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao inicializar o sistema');
      }

      setCurrentStep(4); // Success step

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Falha ao configurar o sistema',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  const formatZipCode = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">
            Bem-vindo ao TheProParkingApp
          </CardTitle>
          <CardDescription className="text-lg">
            Vamos configurar seu sistema de estacionamento
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress indicators */}
          <div className="flex justify-center items-center mb-8 gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep >= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`h-1 w-12 md:w-24 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="text-center space-y-6 py-8">
              <h2 className="text-2xl font-bold text-gray-800">
                Primeira Execução
              </h2>
              <p className="text-gray-600 text-lg">
                Este assistente irá guiá-lo na configuração inicial do sistema.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-semibold">Dados da Empresa</p>
                  <p className="text-sm text-gray-600">Informações básicas</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <User className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-semibold">Usuário Admin</p>
                  <p className="text-sm text-gray-600">Criar acesso inicial</p>
                </div>
              </div>
              <Button onClick={nextStep} size="lg" className="mt-8">
                Começar Configuração
              </Button>
            </div>
          )}

          {/* Step 2: Company Info */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Informações da Empresa
              </h2>
              
              <div className="space-y-2">
                <Label htmlFor="companyName">
                  Nome da Empresa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="Estacionamento XYZ"
                  className={errors.companyName ? 'border-red-500' : ''}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-500">{errors.companyName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => updateField('cnpj', formatCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className={errors.cnpj ? 'border-red-500' : ''}
                  />
                  {errors.cnpj && (
                    <p className="text-sm text-red-500">{errors.cnpj}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Rua, número"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value.toUpperCase())}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">CEP</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => updateField('zipCode', formatZipCode(e.target.value))}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button onClick={prevStep} variant="outline">
                  Voltar
                </Button>
                <Button onClick={nextStep}>
                  Próximo
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Admin User */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Criar Usuário Administrador
              </h2>
              
              <div className="space-y-2">
                <Label htmlFor="adminName">Nome Completo</Label>
                <Input
                  id="adminName"
                  value={formData.adminName}
                  onChange={(e) => updateField('adminName', e.target.value)}
                  placeholder="João Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">E-mail</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => updateField('adminEmail', e.target.value)}
                  placeholder="admin@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminLogin">
                  Login <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adminLogin"
                  value={formData.adminLogin}
                  onChange={(e) => updateField('adminLogin', e.target.value)}
                  placeholder="admin"
                  className={errors.adminLogin ? 'border-red-500' : ''}
                />
                {errors.adminLogin && (
                  <p className="text-sm text-red-500">{errors.adminLogin}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword">
                  Senha <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => updateField('adminPassword', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={errors.adminPassword ? 'border-red-500' : ''}
                />
                {errors.adminPassword && (
                  <p className="text-sm text-red-500">{errors.adminPassword}</p>
                )}
                {formData.adminPassword && (
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          formData.adminPassword.length < 6
                            ? 'bg-red-500 w-1/3'
                            : formData.adminPassword.length < 8
                            ? 'bg-yellow-500 w-2/3'
                            : 'bg-green-500 w-full'
                        }`}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      {formData.adminPassword.length < 6
                        ? 'Senha fraca'
                        : formData.adminPassword.length < 8
                        ? 'Senha média'
                        : 'Senha forte'}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPasswordConfirm">
                  Confirmar Senha <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adminPasswordConfirm"
                  type="password"
                  value={formData.adminPasswordConfirm}
                  onChange={(e) => updateField('adminPasswordConfirm', e.target.value)}
                  placeholder="Digite a senha novamente"
                  className={errors.adminPasswordConfirm ? 'border-red-500' : ''}
                />
                {errors.adminPasswordConfirm && (
                  <p className="text-sm text-red-500">{errors.adminPasswordConfirm}</p>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button onClick={prevStep} variant="outline">
                  Voltar
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Configurando...
                    </>
                  ) : (
                    'Finalizar Configuração'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {currentStep === 4 && (
            <div className="text-center space-y-6 py-8">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                Configuração Concluída!
              </h2>
              <p className="text-gray-600 text-lg">
                Seu sistema está pronto para uso.
              </p>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  Use o login <strong>{formData.adminLogin}</strong> para acessar o sistema.
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Redirecionando para a tela de login...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
