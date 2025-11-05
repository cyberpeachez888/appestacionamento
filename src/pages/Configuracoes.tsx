import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Configuracoes() {
  const { toast } = useToast();

  const [config, setConfig] = useState<any>({
    name: '',
    legalName: '',
    cnpj: '',
    address: '',
    phone: '',
    primaryColor: '#000000',
    receiptCounter: 0,
  });

  // --- BUSCAR CONFIGURAÇÃO DO BACKEND ---
  const fetchConfig = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/company-config');
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:3000/api/company-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error('Erro ao atualizar configurações');

      toast({
        title: 'Configurações salvas',
        description: 'As informações da empresa foram atualizadas',
      });

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
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">Dados da empresa e personalização</p>
        </div>

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
                <strong>Contador de Recibos:</strong> {config.receiptCounter.toString().padStart(6, '0')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                O contador é incrementado automaticamente a cada recibo emitido
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit">Salvar Configurações</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
