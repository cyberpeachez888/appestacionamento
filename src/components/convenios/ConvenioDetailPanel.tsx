/**
 * Convenio Detail Panel
 * Painel de detalhes com 7 abas
 */

'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Building2,
    CreditCard,
    Car,
    Receipt,
    TrendingUp,
    FileText,
    History,
    Edit,
    Pause,
    Play,
    X,
    Trash2,
    Upload,
    Download,
    ParkingSquare,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogNovoConvenio } from './dialogs/DialogNovoConvenio';
import { DialogEditarConvenio } from './dialogs/DialogEditarConvenio';
import { DialogAlterarPlano } from './dialogs/DialogAlterarPlano';
import { DialogAdicionarVeiculo } from './dialogs/DialogAdicionarVeiculo';
import { DialogGerarFatura } from './dialogs/DialogGerarFatura';
import { DialogPreviewFatura } from './dialogs/DialogPreviewFatura';
import { DialogVisualizarFatura } from './dialogs/DialogVisualizarFatura';
import { VagasExtrasTab } from './VagasExtrasTab';
import { MovimentacoesContratoTab } from './MovimentacoesContratoTab';
import { gerarPDFFatura } from '@/utils/faturaPDFGenerator';




interface ConvenioDetalhes {
    id: string;
    nome_empresa: string;
    cnpj: string;
    razao_social: string;
    categoria: string;
    status: string;
    data_inicio: string;
    data_vencimento_contrato?: string;
    contato_nome: string;
    contato_email: string;
    contato_telefone: string;
    endereco_completo?: string;
    observacoes?: string;
    planos: any[];
    veiculos: any[];
    faturas: any[];
    historico: any[];
}

interface ConvenioDetailPanelProps {
    convenioId: string;
    onClose: () => void;
}

export function ConvenioDetailPanel({ convenioId, onClose }: ConvenioDetailPanelProps) {
    const [convenio, setConvenio] = useState<ConvenioDetalhes | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dados-gerais');
    const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
    const [documentos, setDocumentos] = useState<any[]>([]);
    const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);
    const [loadingDocumentos, setLoadingDocumentos] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    // Dialog states
    const [dialogEditar, setDialogEditar] = useState(false);
    const [dialogAlterarPlano, setDialogAlterarPlano] = useState(false);
    const [dialogAdicionarVeiculo, setDialogAdicionarVeiculo] = useState(false);
    const [dialogGerarFatura, setDialogGerarFatura] = useState(false);
    const [dialogPreviewFatura, setDialogPreviewFatura] = useState(false);
    const [dialogVisualizarFatura, setDialogVisualizarFatura] = useState(false);
    const [selectedFatura, setSelectedFatura] = useState<any>(null);

    useEffect(() => {
        fetchConvenioDetalhes();
    }, [convenioId]);

    useEffect(() => {
        if (activeTab === 'documentos') {
            fetchDocumentos();
        }
    }, [activeTab, convenioId]);

    const { toast } = useToast();

    // ... useEffects ...

    const handleStatusChange = async (novoStatus: string) => {
        const action = novoStatus === 'ativo' ? 'reativar' : 'suspender';

        if (!confirm(`Deseja realmente ${action} este convênio?`)) {
            return;
        }

        try {
            await api.updateConvenio(convenioId, { status: novoStatus });

            toast({
                title: `Convênio ${novoStatus === 'ativo' ? 'reativado' : 'suspenso'}`,
                description: `O status foi atualizado com sucesso.`,
            });

            fetchConvenioDetalhes();
        } catch (error) {
            console.error(`Erro ao ${action} convênio:`, error);
            alert('Erro ao atualizar status');
        }
    };

    const fetchConvenioDetalhes = async () => {
        try {
            console.log('[ConvenioDetailPanel] 🔄 Fetching convenio details for ID:', convenioId);
            setLoading(true);
            const data = await api.getConvenioById(convenioId);
            console.log('[ConvenioDetailPanel] ✅ Received data:', {
                nome_empresa: data?.nome_empresa,
                planos_count: data?.planos?.length,
                plano_ativo: data?.planos?.find(p => p.ativo),
                all_planos: data?.planos
            });
            setConvenio(data);
        } catch (error) {
            console.error('[ConvenioDetailPanel] ❌ Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMovimentacoes = async () => {
        try {
            setLoadingMovimentacoes(true);
            const data = await api.getConvenioMovimentacoes(convenioId);
            setMovimentacoes(data || []);
        } catch (error) {
            console.error('Erro ao buscar movimentações:', error);
        } finally {
            setLoadingMovimentacoes(false);
        }
    };

    const fetchDocumentos = async () => {
        try {
            setLoadingDocumentos(true);
            const data = await api.getConvenioDocumentos(convenioId);
            setDocumentos(data || []);
        } catch (error) {
            console.error('Erro ao buscar documentos:', error);
        } finally {
            setLoadingDocumentos(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tamanho (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande. Máximo 10MB.');
            return;
        }

        try {
            setUploadingDoc(true);

            // Simular upload e pegar metadados
            // Em produção, aqui enviaria para S3/Storage primeiro
            const docData = {
                nome_arquivo: file.name,
                tipo_documento: file.type || 'application/octet-stream',
                tamanho_bytes: file.size,
                caminho_arquivo: URL.createObjectURL(file) // Placeholder local
            };

            await api.uploadConvenioDocumento(convenioId, docData);
            fetchDocumentos();
        } catch (error) {
            console.error('Erro ao enviar documento:', error);
            alert('Erro ao enviar documento');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm('Tem certeza que deseja excluir este documento?')) return;

        try {
            await api.deleteConvenioDocumento(convenioId, docId);
            fetchDocumentos();
        } catch (error) {
            console.error('Erro ao excluir documento:', error);
            alert('Erro ao excluir documento');
        }
    };

    const handleDownloadFatura = async (fatura: any) => {
        try {
            toast({
                title: 'Gerando PDF...',
                description: 'Aguarde enquanto o PDF da fatura é gerado.',
            });

            // Buscar movimentações vinculadas à fatura (todas as faturas agora têm movimentações)
            let movimentacoes: any[] = [];
            try {
                const allMovimentacoes = await api.getConvenioMovimentacoes(convenioId);
                // Filtrar apenas movimentações desta fatura
                movimentacoes = allMovimentacoes.filter((mov: any) => mov.fatura_id === fatura.id);
            } catch (error) {
                console.error('Erro ao buscar movimentações:', error);
                // Continuar sem movimentações se houver erro
            }

            // Gerar PDF
            gerarPDFFatura(fatura, convenio, movimentacoes);

            toast({
                title: 'PDF gerado com sucesso!',
                description: `Fatura ${fatura.numero_fatura} foi baixada.`,
            });
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            toast({
                title: 'Erro ao gerar PDF',
                description: 'Não foi possível gerar o PDF da fatura. Tente novamente.',
                variant: 'destructive',
            });
        }
    };

    const handleVisualizarFatura = (fatura: any) => {
        setSelectedFatura(fatura);
        setDialogVisualizarFatura(true);
    };

    const formatarCNPJ = (cnpj: string) => {
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    const formatarData = (data: string) => {
        return new Date(data).toLocaleDateString('pt-BR');
    };

    const formatarValor = (valor: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(valor);
    };

    /**
     * Retorna a última fatura paga do convênio
     */
    const getUltimoPagamento = (faturas: any[]) => {
        if (!faturas || faturas.length === 0) return null;

        const faturasPagas = faturas
            .filter(f => f.status === 'paga' && f.data_pagamento)
            .sort((a, b) => new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime());

        return faturasPagas[0] || null;
    };

    /**
     * Normaliza data de vencimento para meses com menos dias
     */
    const normalizeDueDate = (dia: number, mes: number, ano: number): Date => {
        const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
        const diaFinal = Math.min(dia, ultimoDiaDoMes);
        return new Date(ano, mes, diaFinal);
    };

    /**
     * Calcula o próximo vencimento baseado no dia de vencimento do plano (campo unificado)
     */
    const calcularProximoVencimento = (plano: any): Date => {
        // Usar o novo campo unificado dia_vencimento com fallbacks para migração
        const diaVencimento = plano.dia_vencimento
            || (plano as any).dia_vencimento_pos_pago
            || plano.dia_vencimento_pagamento
            || (plano as any).dia_fechamento;

        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth();

        let proximoVencimento = normalizeDueDate(diaVencimento, mesAtual, anoAtual);

        if (proximoVencimento < hoje) {
            const proximoMes = mesAtual === 11 ? 0 : mesAtual + 1;
            const proximoAno = mesAtual === 11 ? anoAtual + 1 : anoAtual;
            proximoVencimento = normalizeDueDate(diaVencimento, proximoMes, proximoAno);
        }

        return proximoVencimento;
    };

    /**
     * Calcula quantos dias faltam para o vencimento
     */
    const calcularDiasAteVencimento = (dataVencimento: Date): number => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(dataVencimento);
        vencimento.setHours(0, 0, 0, 0);

        const diffTime = vencimento.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    const planoAtivo = convenio?.planos?.find(p => p.ativo);

    // Calcular dados derivados
    const ultimoPagamento = getUltimoPagamento(convenio?.faturas || []);
    const proximoVencimento = planoAtivo
        ? calcularProximoVencimento(planoAtivo)
        : null;
    const diasAteVencimento = proximoVencimento
        ? calcularDiasAteVencimento(proximoVencimento)
        : null;

    // DEBUG: Log to see what data we actually have
    useEffect(() => {
        if (planoAtivo) {
            console.log('[ConvenioDetailPanel] planoAtivo data:', {
                id: planoAtivo.id,
                tipo_plano: planoAtivo.tipo_plano,
                dia_vencimento_pagamento: planoAtivo.dia_vencimento_pagamento,
                dia_vencimento_pos_pago: (planoAtivo as any).dia_vencimento_pos_pago,
                dia_fechamento: (planoAtivo as any).dia_fechamento,
                valor_mensal: planoAtivo.valor_mensal,
                valor_por_vaga: (planoAtivo as any).valor_por_vaga,
                allFields: Object.keys(planoAtivo)
            });
        }
    }, [planoAtivo]);

    // Debug: Check what we're getting
    console.log('ConvenioDetailPanel DEBUG:', {
        convenio: convenio?.nome_empresa,
        planos: convenio?.planos,
        planoAtivo
    });

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-8">Carregando detalhes...</div>
                </CardContent>
            </Card>
        );
    }

    if (!convenio) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                        Convênio não encontrado
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Building2 className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle className="text-2xl">{convenio.nome_empresa}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {formatarCNPJ(convenio.cnpj)} • Convênio Corporativo
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={convenio.status === 'ativo' ? 'default' : 'secondary'}>
                            {convenio.status}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => setDialogEditar(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                        </Button>
                        {convenio.status === 'ativo' ? (
                            <Button variant="outline" size="sm" onClick={() => handleStatusChange('suspenso')}>
                                <Pause className="h-4 w-4 mr-2" />
                                Suspender
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => handleStatusChange('ativo')}>
                                <Play className="h-4 w-4 mr-2" />
                                Reativar
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-8">
                        <TabsTrigger value="dados-gerais">
                            <Building2 className="h-4 w-4 mr-2" />
                            Dados
                        </TabsTrigger>
                        <TabsTrigger value="plano">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Plano
                        </TabsTrigger>
                        <TabsTrigger value="veiculos">
                            <Car className="h-4 w-4 mr-2" />
                            Veículos
                        </TabsTrigger>
                        <TabsTrigger value="financeiro">
                            <Receipt className="h-4 w-4 mr-2" />
                            Financeiro
                        </TabsTrigger>
                        <TabsTrigger value="movimentacoes">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Movimentações
                        </TabsTrigger>
                        <TabsTrigger value="vagas-extras">
                            <ParkingSquare className="h-4 w-4 mr-2" />
                            Vagas Extras
                        </TabsTrigger>
                        <TabsTrigger value="documentos">
                            <FileText className="h-4 w-4 mr-2" />
                            Documentos
                        </TabsTrigger>
                        <TabsTrigger value="historico">
                            <History className="h-4 w-4 mr-2" />
                            Histórico
                        </TabsTrigger>
                    </TabsList>

                    {/* Aba 1: Dados Gerais */}
                    <TabsContent value="dados-gerais" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="font-semibold mb-2">Informações da Empresa</h3>
                                <dl className="space-y-2">
                                    <div>
                                        <dt className="text-sm text-muted-foreground">Razão Social</dt>
                                        <dd className="font-medium">{convenio.razao_social}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-muted-foreground">CNPJ</dt>
                                        <dd className="font-medium">{formatarCNPJ(convenio.cnpj)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-muted-foreground">Categoria</dt>
                                        <dd className="font-medium capitalize">{convenio.categoria}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-muted-foreground">Endereço</dt>
                                        <dd className="font-medium">{convenio.endereco_completo || 'Não informado'}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Contato</h3>
                                <dl className="space-y-2">
                                    <div>
                                        <dt className="text-sm text-muted-foreground">Nome</dt>
                                        <dd className="font-medium">{convenio.contato_nome}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-muted-foreground">Email</dt>
                                        <dd className="font-medium">{convenio.contato_email}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-muted-foreground">Telefone</dt>
                                        <dd className="font-medium">{convenio.contato_telefone}</dd>
                                    </div>
                                </dl>

                                <h3 className="font-semibold mb-2 mt-4">Contrato</h3>
                                <dl className="space-y-2">
                                    <div>
                                        <dt className="text-sm text-muted-foreground">Data de Início</dt>
                                        <dd className="font-medium">{formatarData(convenio.data_inicio)}</dd>
                                    </div>
                                    {convenio.data_vencimento_contrato && (
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Vencimento do Contrato</dt>
                                            <dd className="font-medium">{formatarData(convenio.data_vencimento_contrato)}</dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        </div>

                        {convenio.observacoes && (
                            <div>
                                <h3 className="font-semibold mb-2">Observações</h3>
                                <p className="text-sm text-muted-foreground">{convenio.observacoes}</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Aba 2: Plano */}
                    <TabsContent value="plano" className="space-y-4">
                        {planoAtivo ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Plano Atual</h3>
                                    <dl className="space-y-2">
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Status</dt>
                                            <dd>
                                                <Badge variant={planoAtivo.ativo ? 'default' : 'secondary'}>
                                                    {planoAtivo.ativo ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Tipo</dt>
                                            <dd className="font-medium capitalize">{planoAtivo.tipo_plano}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Vagas Contratadas</dt>
                                            <dd className="font-medium">{planoAtivo.num_vagas_contratadas}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Vagas Reservadas</dt>
                                            <dd className="font-medium">{planoAtivo.num_vagas_reservadas}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">Valores e Datas</h3>
                                    <dl className="space-y-2">
                                        {/* VALORES - Unified Display */}
                                        {(planoAtivo as any).valor_por_vaga && (
                                            <>
                                                <div>
                                                    <dt className="text-sm text-muted-foreground">Valor por Vaga</dt>
                                                    <dd className="font-medium text-lg text-blue-600">{formatarValor((planoAtivo as any).valor_por_vaga)}/vaga</dd>
                                                </div>
                                                {/* Valor Total (Valor por Vaga × Vagas Contratadas) */}
                                                <div>
                                                    <dt className="text-sm text-muted-foreground">Valor Total Convênio</dt>
                                                    <dd className="font-medium text-lg">
                                                        {formatarValor((planoAtivo as any).valor_por_vaga * planoAtivo.num_vagas_contratadas)}
                                                    </dd>
                                                </div>
                                                {/* Valor com Desconto */}
                                                {planoAtivo.porcentagem_desconto && Number(planoAtivo.porcentagem_desconto) > 0 ? (
                                                    <div>
                                                        <dt className="text-sm text-muted-foreground">Valor Cobrado (c/ Desconto)</dt>
                                                        <dd className="font-medium text-lg text-green-600">
                                                            {formatarValor(
                                                                ((planoAtivo as any).valor_por_vaga * planoAtivo.num_vagas_contratadas) *
                                                                (1 - Number(planoAtivo.porcentagem_desconto) / 100)
                                                            )}
                                                        </dd>
                                                    </div>
                                                ) : null}
                                            </>
                                        )}

                                        {/* DESCONTO PERCENTAGE - ALWAYS SHOW IF EXISTS */}
                                        {planoAtivo.porcentagem_desconto && Number(planoAtivo.porcentagem_desconto) > 0 && (
                                            <div>
                                                <dt className="text-sm text-muted-foreground">Desconto Aplicado</dt>
                                                <dd className="font-medium text-green-600">{Number(planoAtivo.porcentagem_desconto).toFixed(2)}%</dd>
                                            </div>
                                        )}

                                        {/* DATAS - Convênio Corporativo Unificado */}
                                        <div className="pt-2 border-t">
                                            {/* DIA DE FECHAMENTO */}
                                            {(planoAtivo as any).dia_fechamento && (
                                                <div className="mb-2">
                                                    <dt className="text-sm text-muted-foreground">Dia de Fechamento</dt>
                                                    <dd className="font-medium">Dia {(planoAtivo as any).dia_fechamento}</dd>
                                                </div>
                                            )}
                                            {/* DIA DE VENCIMENTO - Campo Unificado */}
                                            <div className="mb-2">
                                                <dt className="text-sm text-muted-foreground font-semibold">Dia de Vencimento</dt>
                                                <dd className="font-medium text-lg">
                                                    Dia {(() => {
                                                        const vencimento = planoAtivo.dia_vencimento
                                                            || (planoAtivo as any).dia_vencimento_pos_pago
                                                            || planoAtivo.dia_vencimento_pagamento
                                                            || (planoAtivo as any).dia_fechamento;
                                                        return vencimento || '-';
                                                    })()}
                                                </dd>
                                            </div>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhum plano ativo
                            </div>
                        )}

                        {/* Seção: Datas Importantes */}
                        {planoAtivo && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h4 className="font-semibold mb-4 text-blue-900 dark:text-blue-100">
                                    📅 Datas Importantes
                                </h4>
                                <div className="grid grid-cols-3 gap-6">
                                    {/* Data de Contratação */}
                                    <div>
                                        <dt className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                                            Data de Contratação
                                        </dt>
                                        <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {formatarData(planoAtivo.data_inicio_vigencia)}
                                        </dd>
                                    </div>

                                    {/* Último Pagamento */}
                                    <div>
                                        <dt className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                                            💳 Último Pagamento
                                        </dt>
                                        {ultimoPagamento ? (
                                            <>
                                                <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                    {formatarData(ultimoPagamento.data_pagamento)}
                                                </dd>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {ultimoPagamento.forma_pagamento} • {formatarValor(ultimoPagamento.valor_total)}
                                                </p>
                                            </>
                                        ) : (
                                            <dd className="text-sm text-gray-400 dark:text-gray-500 italic">
                                                Nenhum pagamento registrado
                                            </dd>
                                        )}
                                    </div>

                                    {/* Próximo Vencimento */}
                                    <div>
                                        <dt className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                                            ⏰ Próximo Vencimento
                                        </dt>
                                        {proximoVencimento && (
                                            <>
                                                <dd className={`text-lg font-semibold ${diasAteVencimento === 0
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : diasAteVencimento && diasAteVencimento <= 7 && diasAteVencimento > 0
                                                        ? 'text-orange-600 dark:text-orange-400'
                                                        : 'text-blue-600 dark:text-blue-400'
                                                    }`}>
                                                    {formatarData(proximoVencimento.toISOString())}
                                                </dd>

                                                {/* Alertas Visuais */}
                                                {diasAteVencimento === 0 && (
                                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1 flex items-center gap-1">
                                                        <span>🔴</span> Vence hoje!
                                                    </p>
                                                )}
                                                {diasAteVencimento && diasAteVencimento > 0 && diasAteVencimento <= 7 && (
                                                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1 flex items-center gap-1">
                                                        <span>⚠️</span> Vence em {diasAteVencimento} {diasAteVencimento === 1 ? 'dia' : 'dias'}
                                                    </p>
                                                )}
                                                {diasAteVencimento && diasAteVencimento > 7 && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        Faltam {diasAteVencimento} dias
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Seção Adicional: Ciclo de Faturamento */}
                                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                                    <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">
                                        Ciclo de Faturamento
                                    </h5>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <label className="text-gray-600 dark:text-gray-400">Dia de Fechamento</label>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                Dia {(planoAtivo as any).dia_fechamento || '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-gray-600 dark:text-gray-400">Dia de Vencimento</label>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                Dia {planoAtivo.dia_vencimento
                                                    || (planoAtivo as any).dia_vencimento_pos_pago
                                                    || planoAtivo.dia_vencimento_pagamento
                                                    || '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-gray-600 dark:text-gray-400">Status da Fatura Atual</label>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                {(() => {
                                                    const hoje = new Date();
                                                    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
                                                    const faturaAtual = convenio.faturas?.find(f => f.periodo_referencia === mesAtual);

                                                    if (!faturaAtual) return '⏳ Não gerada';

                                                    // Show generation timestamp
                                                    let statusText = '';
                                                    if (faturaAtual.status === 'paga') statusText = '✅ Paga';
                                                    else if (faturaAtual.status === 'vencida') statusText = '🔴 Vencida';
                                                    else statusText = '⏳ Pendente';

                                                    return (
                                                        <>
                                                            <span>{statusText}</span>
                                                            {faturaAtual.data_emissao && (
                                                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                    Gerada em: {formatarData(faturaAtual.data_emissao)}
                                                                    {faturaAtual.created_at && ` às ${new Date(faturaAtual.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                                                                </span>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button variant="outline" onClick={() => setDialogAlterarPlano(true)}>Alterar Plano</Button>
                    </TabsContent>

                    {/* Aba 3: Veículos */}
                    <TabsContent value="veiculos" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold">Veículos Autorizados ({convenio.veiculos?.length || 0})</h3>
                            <Button size="sm" onClick={() => setDialogAdicionarVeiculo(true)}>Adicionar Veículo</Button>
                        </div>

                        {convenio.veiculos && convenio.veiculos.length > 0 ? (
                            <div className="space-y-2">
                                {convenio.veiculos.map((veiculo) => (
                                    <div key={veiculo.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <Car className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{veiculo.placa}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {veiculo.modelo || 'Modelo não informado'} • {veiculo.cor || 'Cor não informada'}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={veiculo.ativo ? 'default' : 'secondary'}>
                                            {veiculo.ativo ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhum veículo cadastrado
                            </div>
                        )}
                    </TabsContent>

                    {/* Aba 4: Financeiro */}
                    <TabsContent value="financeiro" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold">Faturas ({convenio.faturas?.length || 0})</h3>
                            <Button size="sm" onClick={() => setDialogPreviewFatura(true)}>Gerar Nova Fatura</Button>
                        </div>

                        {convenio.faturas && convenio.faturas.length > 0 ? (
                            <div className="space-y-2">
                                {convenio.faturas.map((fatura) => (
                                    <div
                                        key={fatura.id}
                                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                                        onClick={() => handleVisualizarFatura(fatura)}
                                    >
                                        <div>
                                            <p className="font-medium">{fatura.numero_fatura}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {fatura.periodo_referencia} • Venc: {formatarData(fatura.data_vencimento)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="font-medium">{formatarValor(fatura.valor_total)}</p>
                                                <Badge variant={fatura.status === 'paga' ? 'default' : 'secondary'}>
                                                    {fatura.status}
                                                </Badge>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent opening preview when clicking download
                                                    handleDownloadFatura(fatura);
                                                }}
                                                title="Baixar PDF da fatura"
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhuma fatura gerada
                            </div>
                        )}
                    </TabsContent>

                    {/* Aba 5: Movimentações */}
                    <TabsContent value="movimentacoes" className="space-y-6">
                        {/* Tabela 1: Histórico de Movimentações do Contrato */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold text-lg">Histórico de Movimentações</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Todas as entradas e saídas de veículos do convênio
                            </p>
                            <MovimentacoesContratoTab convenioId={convenioId} />
                        </div>

                        {/* Divisor */}
                        <div className="border-t" />

                        {/* Tabela 2: Vagas Extras */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <ParkingSquare className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold text-lg">Vagas Extras</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Vagas extras utilizadas (cortesias e pagas)
                            </p>
                            <VagasExtrasTab convenioId={convenioId} />
                        </div>
                    </TabsContent>

                    {/* Aba 6: Vagas Extras */}
                    <TabsContent value="vagas-extras" className="space-y-4">
                        <VagasExtrasTab convenioId={convenioId} />
                    </TabsContent>

                    {/* Aba 7: Documentos */}
                    <TabsContent value="documentos" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold">Documentos Anexados ({documentos.length})</h3>
                            <div>
                                <Input
                                    type="file"
                                    id="upload-doc"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={uploadingDoc}
                                />
                                <Label htmlFor="upload-doc">
                                    <div className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 cursor-pointer ${uploadingDoc ? 'opacity-50' : ''}`}>
                                        <Upload className="h-4 w-4 mr-2" />
                                        {uploadingDoc ? 'Enviando...' : 'Upload'}
                                    </div>
                                </Label>
                            </div>
                        </div>

                        {loadingDocumentos ? (
                            <div className="text-center py-8 text-muted-foreground">Carregando documentos...</div>
                        ) : documentos && documentos.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                                {documentos.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium truncate max-w-[200px]">{doc.nome_arquivo}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(doc.tamanho_bytes / 1024).toFixed(1)} KB • {formatarData(doc.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => window.open(doc.caminho_arquivo, '_blank')}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteDocument(doc.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                                <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p>Nenhum documento anexado</p>
                                <p className="text-xs mt-1">Faça upload de contratos, aditivos e comprovantes</p>
                            </div>
                        )}
                    </TabsContent>


                    {/* Aba 7: Histórico */}
                    <TabsContent value="historico" className="space-y-4">
                        {convenio.historico && convenio.historico.length > 0 ? (
                            <div className="space-y-2">
                                {convenio.historico.map((item) => (
                                    <div key={item.id} className="p-3 border-l-2 border-primary pl-4">
                                        <p className="font-medium">{item.tipo_alteracao}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(item.data_alteracao).toLocaleString('pt-BR')}
                                        </p>
                                        {item.motivo && (
                                            <p className="text-sm mt-1">{item.motivo}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhum histórico disponível
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>

            {/* Dialogs */}
            {convenio && (
                <>
                    <DialogNovoConvenio
                        mode="edit"
                        convenioId={convenioId}
                        open={dialogEditar}
                        onOpenChange={setDialogEditar}
                        initialData={{
                            nome_empresa: convenio.nome_empresa,
                            razao_social: convenio.razao_social,
                            cnpj: convenio.cnpj || '',
                            categoria: convenio.categoria,
                            contato_nome: convenio.contato_nome,
                            contato_email: convenio.contato_email,
                            contato_telefone: convenio.contato_telefone,
                            endereco_completo: convenio.endereco_completo,
                            observacoes: convenio.observacoes,
                            data_inicio: convenio.data_inicio || '',
                            data_vencimento_contrato: convenio.data_vencimento_contrato,
                            plano: planoAtivo ? {
                                num_vagas_contratadas: planoAtivo.num_vagas_contratadas,
                                num_vagas_reservadas: planoAtivo.num_vagas_reservadas || 0,
                                valor_por_vaga: (planoAtivo as any).valor_por_vaga,
                                valor_mensal: planoAtivo.valor_mensal,
                                dia_vencimento: planoAtivo.dia_vencimento
                                    || (planoAtivo as any).dia_vencimento_pos_pago
                                    || planoAtivo.dia_vencimento_pagamento,
                                dia_fechamento: (planoAtivo as any).dia_fechamento,
                                permite_vagas_extras: planoAtivo.permite_vagas_extras,
                                valor_vaga_extra: (planoAtivo as any).valor_vaga_extra,
                                porcentagem_desconto: (planoAtivo as any).porcentagem_desconto,
                            } : undefined,
                        }}
                        onSuccess={() => {
                            fetchConvenioDetalhes();
                            toast({
                                title: 'Convênio atualizado',
                                description: 'Os dados foram atualizados com sucesso.',
                            });
                        }}
                    />

                    <DialogAlterarPlano
                        open={dialogAlterarPlano}
                        onOpenChange={setDialogAlterarPlano}
                        convenioId={convenioId}
                        planoAtual={planoAtivo}
                        onSuccess={() => {
                            fetchConvenioDetalhes();
                            toast({
                                title: 'Plano alterado',
                                description: 'O novo plano foi ativado com sucesso.',
                            });
                        }}
                    />

                    <DialogAdicionarVeiculo
                        open={dialogAdicionarVeiculo}
                        onOpenChange={setDialogAdicionarVeiculo}
                        convenioId={convenioId}
                        onSuccess={() => {
                            fetchConvenioDetalhes();
                            toast({
                                title: 'Veículo adicionado',
                                description: 'O veículo foi cadastrado com sucesso.',
                            });
                        }}
                    />

                    {planoAtivo && (
                        <DialogGerarFatura
                            open={dialogGerarFatura}
                            onOpenChange={setDialogGerarFatura}
                            convenioId={convenioId}
                            convenioNome={convenio.nome_empresa}
                            valorMensal={planoAtivo.valor_mensal}
                            onSuccess={() => {
                                fetchConvenioDetalhes();
                                toast({
                                    title: 'Fatura gerada',
                                    description: 'A fatura foi criada com sucesso.',
                                });
                            }}
                        />
                    )}

                    {/* New Preview Dialog */}
                    <DialogPreviewFatura
                        open={dialogPreviewFatura}
                        onOpenChange={setDialogPreviewFatura}
                        convenioId={convenioId}
                        convenioNome={convenio.nome_empresa}
                        onSuccess={() => {
                            fetchConvenioDetalhes();
                            toast({
                                title: 'Fatura gerada com sucesso!',
                                description: 'A fatura foi criada e o PDF está pronto para download.',
                            });
                        }}
                    />

                    {/* Dialog Visualizar Fatura */}
                    <DialogVisualizarFatura
                        open={dialogVisualizarFatura}
                        onOpenChange={setDialogVisualizarFatura}
                        fatura={selectedFatura}
                        convenio={convenio}
                        convenioId={convenioId}
                    />
                </>
            )}
        </Card>
    );
}
