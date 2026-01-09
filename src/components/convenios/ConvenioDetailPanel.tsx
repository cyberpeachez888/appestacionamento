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
} from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogEditarConvenio } from './dialogs/DialogEditarConvenio';
import { DialogAlterarPlano } from './dialogs/DialogAlterarPlano';
import { DialogAdicionarVeiculo } from './dialogs/DialogAdicionarVeiculo';
import { DialogGerarFatura } from './dialogs/DialogGerarFatura';



interface ConvenioDetalhes {
    id: string;
    nome_empresa: string;
    cnpj: string;
    razao_social: string;
    tipo_convenio: 'pre-pago' | 'pos-pago';
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

    useEffect(() => {
        fetchConvenioDetalhes();
    }, [convenioId]);

    useEffect(() => {
        if (activeTab === 'movimentacoes') {
            fetchMovimentacoes();
        } else if (activeTab === 'documentos') {
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
            setLoading(true);
            const data = await api.getConvenioById(convenioId);
            setConvenio(data);
        } catch (error) {
            console.error('Erro ao buscar detalhes:', error);
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

    const planoAtivo = convenio?.planos?.find(p => p.ativo);

    // Debug: Check what we're getting
    console.log('ConvenioDetailPanel DEBUG:', {
        convenio: convenio?.nome_empresa,
        planos: convenio?.planos,
        planoAtivo,
        tipoConvenio: convenio?.tipo_convenio
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
                                {formatarCNPJ(convenio.cnpj)} • {convenio.tipo_convenio === 'pre-pago' ? 'Pré-pago' : 'Pós-pago'}
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
                    <TabsList className="grid w-full grid-cols-7">
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
                                            <dt className="text-sm text-muted-foreground">Tipo</dt>
                                            <dd className="font-medium">{planoAtivo.tipo_plano}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Vagas Contratadas</dt>
                                            <dd className="font-medium">{planoAtivo.num_vagas_contratadas}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Vagas Reservadas</dt>
                                            <dd className="font-medium">{planoAtivo.num_vagas_reservadas}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Valor Mensal</dt>
                                            <dd className="font-medium text-lg">{formatarValor(planoAtivo.valor_mensal)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Dia de Vencimento</dt>
                                            <dd className="font-medium">Dia {planoAtivo.dia_vencimento_pagamento}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">Configurações</h3>
                                    <dl className="space-y-2">
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Permite Vagas Extras</dt>
                                            <dd className="font-medium">{planoAtivo.permite_vagas_extras ? 'Sim' : 'Não'}</dd>
                                        </div>
                                        {planoAtivo.permite_vagas_extras && planoAtivo.valor_vaga_extra && (
                                            <div>
                                                <dt className="text-sm text-muted-foreground">Valor por Vaga Extra</dt>
                                                <dd className="font-medium">{formatarValor(planoAtivo.valor_vaga_extra)}</dd>
                                            </div>
                                        )}
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Horário Especial</dt>
                                            <dd className="font-medium">{planoAtivo.permite_horario_especial ? 'Sim' : 'Não'}</dd>
                                        </div>
                                        {planoAtivo.porcentagem_desconto && Number(planoAtivo.porcentagem_desconto) > 0 && (
                                            <div>
                                                <dt className="text-sm text-muted-foreground">Desconto</dt>
                                                <dd className="font-medium text-green-600">{Number(planoAtivo.porcentagem_desconto).toFixed(2)}%</dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhum plano ativo
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
                            <Button size="sm" onClick={() => setDialogGerarFatura(true)}>Gerar Fatura</Button>
                        </div>

                        {convenio.faturas && convenio.faturas.length > 0 ? (
                            <div className="space-y-2">
                                {convenio.faturas.map((fatura) => (
                                    <div key={fatura.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <p className="font-medium">{fatura.numero_fatura}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {fatura.periodo_referencia} • Venc: {formatarData(fatura.data_vencimento)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">{formatarValor(fatura.valor_total)}</p>
                                            <Badge variant={fatura.status === 'paga' ? 'default' : 'secondary'}>
                                                {fatura.status}
                                            </Badge>
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
                    <TabsContent value="movimentacoes" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold">Últimas Movimentações</h3>
                            {/* Filtros poderiam vir aqui */}
                        </div>

                        {loadingMovimentacoes ? (
                            <div className="text-center py-8 text-muted-foreground">Carregando movimentações...</div>
                        ) : movimentacoes && movimentacoes.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="p-3 text-left">Data/Hora</th>
                                            <th className="p-3 text-left">Placa</th>
                                            <th className="p-3 text-left">Tipo</th>
                                            <th className="p-3 text-left">Tempo</th>
                                            <th className="p-3 text-right">Valor</th>
                                            <th className="p-3 text-center">Faturado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movimentacoes.map((mov) => {
                                            const isSaida = !!mov.data_saida;
                                            return (
                                                <tr key={mov.id} className="border-t hover:bg-muted/50">
                                                    <td className="p-3">
                                                        <div>{formatarData(mov.data_entrada)}</div>
                                                        <div className="text-muted-foreground text-xs">{mov.hora_entrada.slice(0, 5)}</div>
                                                    </td>
                                                    <td className="p-3 font-medium">{mov.placa}</td>
                                                    <td className="p-3">
                                                        {isSaida ? (
                                                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Saída</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Entrada</Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-muted-foreground">
                                                        {mov.tempo_permanencia ? mov.tempo_permanencia.replace('hours', 'h').replace('minutes', 'min') : '-'}
                                                    </td>
                                                    <td className="p-3 text-right font-medium">
                                                        {mov.valor_calculado ? formatarValor(Number(mov.valor_calculado)) : '-'}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {mov.faturado ? (
                                                            <Badge variant="default" className="bg-green-600">Sim</Badge>
                                                        ) : (
                                                            <Badge variant="outline">Não</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhuma movimentação registrada no período
                            </div>
                        )}
                    </TabsContent>

                    {/* Aba 6: Documentos */}
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
                    <DialogEditarConvenio
                        open={dialogEditar}
                        onOpenChange={setDialogEditar}
                        convenioId={convenioId}
                        tipoConvenio={convenio.tipo_convenio as 'pre-pago' | 'pos-pago'}
                        convenioAtual={{
                            nome_empresa: convenio.nome_empresa,
                            razao_social: convenio.razao_social,
                            categoria: convenio.categoria,
                            contato_nome: convenio.contato_nome,
                            contato_email: convenio.contato_email,
                            contato_telefone: convenio.contato_telefone,
                            endereco_completo: convenio.endereco_completo,
                            observacoes: convenio.observacoes,
                        }}
                        planoAtual={planoAtivo ? {
                            dia_vencimento_pagamento: planoAtivo.dia_vencimento_pagamento,
                            dia_fechamento: (planoAtivo as any).dia_fechamento,
                            dia_vencimento_pos_pago: (planoAtivo as any).dia_vencimento_pos_pago,
                        } : undefined}
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
                        tipoConvenio={convenio.tipo_convenio}
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
                            tipoConvenio={convenio.tipo_convenio}
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
                </>
            )}
        </Card>
    );
}
