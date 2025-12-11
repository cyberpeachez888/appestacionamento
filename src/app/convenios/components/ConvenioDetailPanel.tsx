/**
 * Convenio Detail Panel
 * Painel de detalhes com 7 abas
 */

'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

    useEffect(() => {
        fetchConvenioDetalhes();
    }, [convenioId]);

    const fetchConvenioDetalhes = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/convenios/${convenioId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setConvenio(data);
            }
        } catch (error) {
            console.error('Erro ao buscar detalhes:', error);
        } finally {
            setLoading(false);
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
                        <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                        </Button>
                        {convenio.status === 'ativo' ? (
                            <Button variant="outline" size="sm">
                                <Pause className="h-4 w-4 mr-2" />
                                Suspender
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm">
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
                                    </dl>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhum plano ativo
                            </div>
                        )}

                        <Button variant="outline">Alterar Plano</Button>
                    </TabsContent>

                    {/* Aba 3: Veículos */}
                    <TabsContent value="veiculos" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold">Veículos Autorizados ({convenio.veiculos?.length || 0})</h3>
                            <Button size="sm">Adicionar Veículo</Button>
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
                            <Button size="sm">Gerar Fatura</Button>
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
                        <div className="text-center py-8 text-muted-foreground">
                            Movimentações serão implementadas aqui
                        </div>
                    </TabsContent>

                    {/* Aba 6: Documentos */}
                    <TabsContent value="documentos" className="space-y-4">
                        <div className="text-center py-8 text-muted-foreground">
                            Documentos serão implementados aqui
                        </div>
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
        </Card>
    );
}
