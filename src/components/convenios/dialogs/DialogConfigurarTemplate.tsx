/**
 * Dialog Configurar Template de Fatura
 * Modal para configurar dados do emitente (empresa) nas faturas
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Save, RotateCcw, Building2, CreditCard, Type, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface DialogConfigurarTemplateProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface TemplateData {
    id?: string;
    // Dados da empresa
    nome_empresa: string;
    razao_social: string;
    cnpj: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
    telefone: string;
    email: string;
    website: string;

    // Dados bancários
    banco_nome: string;
    banco_agencia: string;
    banco_conta: string;
    pix_chave: string;
    pix_tipo: string;

    // Textos
    texto_rodape: string;

    // Rótulos personalizáveis
    titulo_fatura: string;
    label_numero: string;
    label_periodo: string;
    label_emissao: string;
    label_vencimento: string;
    label_dados_cliente: string;
    label_modalidade: string;
    label_movimentacoes: string;
    label_discriminacao: string;
    label_observacoes: string;
    label_pagamento: string;

    // Cores
    cor_cabecalho: string;
    cor_destaque: string;
    cor_texto_primario: string;
    cor_texto_secundario: string;
}

export function DialogConfigurarTemplate({ open, onOpenChange }: DialogConfigurarTemplateProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<TemplateData>({
        nome_empresa: '',
        razao_social: '',
        cnpj: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        telefone: '',
        email: '',
        website: '',
        banco_nome: '',
        banco_agencia: '',
        banco_conta: '',
        pix_chave: '',
        pix_tipo: 'email',
        texto_rodape: '',
        // Rótulos
        titulo_fatura: 'FATURA',
        label_numero: 'Nº Fatura',
        label_periodo: 'Período',
        label_emissao: 'Emissão',
        label_vencimento: 'Vencimento',
        label_dados_cliente: 'DADOS DO CLIENTE',
        label_modalidade: 'MODALIDADE',
        label_movimentacoes: 'MOVIMENTAÇÕES DO PERÍODO',
        label_discriminacao: 'DISCRIMINAÇÃO DE VALORES',
        label_observacoes: 'OBSERVAÇÕES',
        label_pagamento: 'INSTRUÇÕES DE PAGAMENTO',
        // Cores
        cor_cabecalho: '#3B82F6',
        cor_destaque: '#10B981',
        cor_texto_primario: '#000000',
        cor_texto_secundario: '#6B7280'
    });

    useEffect(() => {
        if (open) {
            fetchTemplate();
        }
    }, [open]);

    async function fetchTemplate() {
        setLoading(true);
        setError('');

        try {
            const response: any = await api.get('/configuracoes/template-fatura');

            if (response.success && response.data?.template) {
                // Sanitize data: convert null/undefined to empty strings
                const sanitizedData: TemplateData = Object.keys(response.data.template).reduce((acc, key) => {
                    const value = response.data.template[key];
                    acc[key as keyof TemplateData] = value ?? '';
                    return acc;
                }, {} as TemplateData);

                setFormData(sanitizedData);
            }
        } catch (err: any) {
            console.error('Erro ao buscar template:', err);

            // Se não existe template, mantém dados vazios
            if (err.message?.includes('não configurado')) {
                setError('Template não configurado. Preencha os dados para criar.');
            } else {
                setError(err.message || 'Erro ao carregar template');
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        // Validações básicas
        if (!formData.nome_empresa.trim()) {
            setError('Nome da empresa é obrigatório');
            return;
        }

        if (!formData.cnpj.trim()) {
            setError('CNPJ é obrigatório');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const response: any = await api.put('/configuracoes/template-fatura', formData);

            if (response.success) {
                toast({
                    title: 'Template atualizado!',
                    description: 'As alterações serão aplicadas nas próximas faturas geradas.',
                });
                onOpenChange(false);
            } else {
                throw new Error(response.error?.message || 'Erro ao salvar');
            }
        } catch (err: any) {
            console.error('Erro ao salvar template:', err);
            setError(err.message || 'Erro ao salvar template');
        } finally {
            setSaving(false);
        }
    }

    async function handleRestaurarPadrao() {
        if (!confirm('Tem certeza que deseja restaurar os valores padrão? Todas as configurações personalizadas serão perdidas.')) {
            return;
        }

        setSaving(true);
        setError('');

        try {
            const response: any = await api.post('/configuracoes/template-fatura/restaurar-padrao', {});

            if (response.success) {
                // Sanitize data: convert null/undefined to empty strings
                const sanitizedData: TemplateData = Object.keys(response.data.template).reduce((acc, key) => {
                    const value = response.data.template[key];
                    acc[key as keyof TemplateData] = value ?? '';
                    return acc;
                }, {} as TemplateData);

                setFormData(sanitizedData);
                toast({
                    title: 'Template restaurado!',
                    description: 'Valores padrão de fábrica foram restaurados.',
                });
            } else {
                throw new Error(response.error?.message || 'Erro ao restaurar');
            }
        } catch (err: any) {
            console.error('Erro ao restaurar:', err);
            setError(err.message || 'Erro ao restaurar padrão');
        } finally {
            setSaving(false);
        }
    }

    function handleFieldChange(field: keyof TemplateData, value: string) {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Configurar Template de Fatura
                    </DialogTitle>
                    <DialogDescription>
                        Configure os dados da sua empresa que aparecerão nas faturas geradas
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Tabs defaultValue="empresa" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="empresa">
                                    <Building2 className="h-4 w-4 mr-2" />
                                    Dados da Empresa
                                </TabsTrigger>
                                <TabsTrigger value="bancarios">
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Dados Bancários
                                </TabsTrigger>
                                <TabsTrigger value="textos">
                                    <Type className="h-4 w-4 mr-2" />
                                    Textos
                                </TabsTrigger>
                                <TabsTrigger value="personalizacao">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Personalização
                                </TabsTrigger>
                            </TabsList>

                            {/* Aba 1: Dados da Empresa */}
                            <TabsContent value="empresa" className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <Label htmlFor="nome_empresa">
                                            Nome da Empresa <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="nome_empresa"
                                            value={formData.nome_empresa}
                                            onChange={(e) => handleFieldChange('nome_empresa', e.target.value)}
                                            placeholder="Parking Tech Systems"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="razao_social">Razão Social</Label>
                                        <Input
                                            id="razao_social"
                                            value={formData.razao_social}
                                            onChange={(e) => handleFieldChange('razao_social', e.target.value)}
                                            placeholder="Parking Tech Ltda"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="cnpj">
                                            CNPJ <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="cnpj"
                                            value={formData.cnpj}
                                            onChange={(e) => handleFieldChange('cnpj', e.target.value)}
                                            placeholder="00.000.000/0001-00"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <Label htmlFor="endereco">Endereço Completo</Label>
                                        <Input
                                            id="endereco"
                                            value={formData.endereco}
                                            onChange={(e) => handleFieldChange('endereco', e.target.value)}
                                            placeholder="Rua Exemplo, 123 - Centro"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="cidade">Cidade</Label>
                                        <Input
                                            id="cidade"
                                            value={formData.cidade}
                                            onChange={(e) => handleFieldChange('cidade', e.target.value)}
                                            placeholder="São Paulo"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label htmlFor="estado">Estado</Label>
                                            <Input
                                                id="estado"
                                                value={formData.estado}
                                                onChange={(e) => handleFieldChange('estado', e.target.value)}
                                                placeholder="SP"
                                                maxLength={2}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="cep">CEP</Label>
                                            <Input
                                                id="cep"
                                                value={formData.cep}
                                                onChange={(e) => handleFieldChange('cep', e.target.value)}
                                                placeholder="00000-000"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="telefone">Telefone</Label>
                                        <Input
                                            id="telefone"
                                            value={formData.telefone}
                                            onChange={(e) => handleFieldChange('telefone', e.target.value)}
                                            placeholder="(00) 0000-0000"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleFieldChange('email', e.target.value)}
                                            placeholder="contato@empresa.com.br"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <Label htmlFor="website">Website</Label>
                                        <Input
                                            id="website"
                                            value={formData.website}
                                            onChange={(e) => handleFieldChange('website', e.target.value)}
                                            placeholder="https://www.empresa.com.br"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Aba 2: Dados Bancários */}
                            <TabsContent value="bancarios" className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <Label htmlFor="banco_nome">Nome do Banco</Label>
                                        <Input
                                            id="banco_nome"
                                            value={formData.banco_nome}
                                            onChange={(e) => handleFieldChange('banco_nome', e.target.value)}
                                            placeholder="Banco do Brasil"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="banco_agencia">Agência</Label>
                                        <Input
                                            id="banco_agencia"
                                            value={formData.banco_agencia}
                                            onChange={(e) => handleFieldChange('banco_agencia', e.target.value)}
                                            placeholder="1234"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="banco_conta">Conta</Label>
                                        <Input
                                            id="banco_conta"
                                            value={formData.banco_conta}
                                            onChange={(e) => handleFieldChange('banco_conta', e.target.value)}
                                            placeholder="56789-0"
                                        />
                                    </div>

                                    <div className="col-span-2 border-t pt-4 mt-2">
                                        <h4 className="font-medium mb-3">Chave PIX</h4>
                                    </div>

                                    <div>
                                        <Label htmlFor="pix_tipo">Tipo de Chave PIX</Label>
                                        <select
                                            id="pix_tipo"
                                            value={formData.pix_tipo}
                                            onChange={(e) => handleFieldChange('pix_tipo', e.target.value)}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                            <option value="email">Email</option>
                                            <option value="telefone">Telefone</option>
                                            <option value="cpf">CPF</option>
                                            <option value="cnpj">CNPJ</option>
                                            <option value="aleatoria">Aleatória</option>
                                        </select>
                                    </div>

                                    <div>
                                        <Label htmlFor="pix_chave">Chave PIX</Label>
                                        <Input
                                            id="pix_chave"
                                            value={formData.pix_chave}
                                            onChange={(e) => handleFieldChange('pix_chave', e.target.value)}
                                            placeholder="email@empresa.com.br ou chave aleatória"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Aba 3: Textos Personalizados */}
                            <TabsContent value="textos" className="space-y-4 mt-4">
                                <div>
                                    <Label htmlFor="texto_rodape">Texto do Rodapé da Fatura</Label>
                                    <Textarea
                                        id="texto_rodape"
                                        value={formData.texto_rodape}
                                        onChange={(e) => handleFieldChange('texto_rodape', e.target.value)}
                                        placeholder="Instruções adicionais de pagamento ou observações gerais..."
                                        rows={4}
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Este texto aparecerá no final de todas as faturas geradas
                                    </p>
                                </div>
                            </TabsContent>

                            {/* Aba 4: Personalização Avançada */}
                            <TabsContent value="personalizacao" className="space-y-4 mt-4">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium mb-3">Rótulos das Seções</h4>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Personalize os títulos que aparecem na fatura
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="titulo_fatura">Título Principal</Label>
                                            <Input
                                                id="titulo_fatura"
                                                value={formData.titulo_fatura}
                                                onChange={(e) => handleFieldChange('titulo_fatura', e.target.value)}
                                                placeholder="FATURA"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="label_numero">Rótulo do Número</Label>
                                            <Input
                                                id="label_numero"
                                                value={formData.label_numero}
                                                onChange={(e) => handleFieldChange('label_numero', e.target.value)}
                                                placeholder="Nº Fatura"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="label_periodo">Rótulo do Período</Label>
                                            <Input
                                                id="label_periodo"
                                                value={formData.label_periodo}
                                                onChange={(e) => handleFieldChange('label_periodo', e.target.value)}
                                                placeholder="Período"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="label_emissao">Rótulo da Emissão</Label>
                                            <Input
                                                id="label_emissao"
                                                value={formData.label_emissao}
                                                onChange={(e) => handleFieldChange('label_emissao', e.target.value)}
                                                placeholder="Emissão"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="label_vencimento">Rótulo do Vencimento</Label>
                                            <Input
                                                id="label_vencimento"
                                                value={formData.label_vencimento}
                                                onChange={(e) => handleFieldChange('label_vencimento', e.target.value)}
                                                placeholder="Vencimento"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="label_dados_cliente">Seção Dados do Cliente</Label>
                                            <Input
                                                id="label_dados_cliente"
                                                value={formData.label_dados_cliente}
                                                onChange={(e) => handleFieldChange('label_dados_cliente', e.target.value)}
                                                placeholder="DADOS DO CLIENTE"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="label_modalidade">Seção Modalidade</Label>
                                            <Input
                                                id="label_modalidade"
                                                value={formData.label_modalidade}
                                                onChange={(e) => handleFieldChange('label_modalidade', e.target.value)}
                                                placeholder="MODALIDADE"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="label_movimentacoes">Seção Movimentações</Label>
                                            <Input
                                                id="label_movimentacoes"
                                                value={formData.label_movimentacoes}
                                                onChange={(e) => handleFieldChange('label_movimentacoes', e.target.value)}
                                                placeholder="MOVIMENTAÇÕES DO PERÍODO"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="label_discriminacao">Seção Discriminação</Label>
                                            <Input
                                                id="label_discriminacao"
                                                value={formData.label_discriminacao}
                                                onChange={(e) => handleFieldChange('label_discriminacao', e.target.value)}
                                                placeholder="DISCRIMINAÇÃO DE VALORES"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="label_observacoes">Seção Observações</Label>
                                            <Input
                                                id="label_observacoes"
                                                value={formData.label_observacoes}
                                                onChange={(e) => handleFieldChange('label_observacoes', e.target.value)}
                                                placeholder="OBSERVAÇÕES"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <Label htmlFor="label_pagamento">Seção Pagamento</Label>
                                            <Input
                                                id="label_pagamento"
                                                value={formData.label_pagamento}
                                                onChange={(e) => handleFieldChange('label_pagamento', e.target.value)}
                                                placeholder="INSTRUÇÕES DE PAGAMENTO"
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t pt-4 mt-6">
                                        <h4 className="font-medium mb-3">Cores do PDF</h4>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Personalize as cores do layout da fatura (formato hexadecimal)
                                        </p>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="cor_cabecalho">Cor do Cabeçalho</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="cor_cabecalho"
                                                        value={formData.cor_cabecalho}
                                                        onChange={(e) => handleFieldChange('cor_cabecalho', e.target.value)}
                                                        placeholder="#3B82F6"
                                                        maxLength={7}
                                                    />
                                                    <div
                                                        className="w-12 h-10 rounded border"
                                                        style={{ backgroundColor: formData.cor_cabecalho }}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <Label htmlFor="cor_destaque">Cor de Destaque</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="cor_destaque"
                                                        value={formData.cor_destaque}
                                                        onChange={(e) => handleFieldChange('cor_destaque', e.target.value)}
                                                        placeholder="#10B981"
                                                        maxLength={7}
                                                    />
                                                    <div
                                                        className="w-12 h-10 rounded border"
                                                        style={{ backgroundColor: formData.cor_destaque }}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <Label htmlFor="cor_texto_primario">Cor do Texto Principal</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="cor_texto_primario"
                                                        value={formData.cor_texto_primario}
                                                        onChange={(e) => handleFieldChange('cor_texto_primario', e.target.value)}
                                                        placeholder="#000000"
                                                        maxLength={7}
                                                    />
                                                    <div
                                                        className="w-12 h-10 rounded border"
                                                        style={{ backgroundColor: formData.cor_texto_primario }}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <Label htmlFor="cor_texto_secundario">Cor do Texto Secundário</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="cor_texto_secundario"
                                                        value={formData.cor_texto_secundario}
                                                        onChange={(e) => handleFieldChange('cor_texto_secundario', e.target.value)}
                                                        placeholder="#6B7280"
                                                        maxLength={7}
                                                    />
                                                    <div
                                                        className="w-12 h-10 rounded border"
                                                        style={{ backgroundColor: formData.cor_texto_secundario }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}

                <DialogFooter className="flex justify-between items-center">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleRestaurarPadrao}
                        disabled={loading || saving}
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurar Padrão
                    </Button>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={loading || saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Salvar Alterações
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
