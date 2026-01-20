/**
 * Convenios Page - Main Component
 * Gestão de Convênios Empresariais
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Building2,
    TrendingUp,
    ParkingSquare,
    AlertTriangle,
    Plus,
    FileText,
    Receipt,
    Search,
    Filter,
    Play,
    Pause,
    Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConvenioDetailPanel } from '@/components/convenios/ConvenioDetailPanel';
import { ConveniosRelatoriosPanel } from '@/components/convenios/ConveniosRelatoriosPanel';
import { DialogNovoConvenio } from '@/components/convenios/dialogs/DialogNovoConvenio';
import { DialogAdicionarVeiculo } from '@/components/convenios/dialogs/DialogAdicionarVeiculo';
import { DialogConfigurarTemplate } from '@/components/convenios/dialogs/DialogConfigurarTemplate';
import { api } from '@/lib/api';

interface ConvenioStats {
    total_ativos: number;
    receita_mensal_prevista: number;
    taxa_ocupacao_media: number;
    taxa_inadimplencia: number;
    total_inadimplentes: number;
}

interface Convenio {
    id: string;
    nome_empresa: string;
    cnpj: string;
    categoria: string;
    status: 'ativo' | 'suspenso' | 'cancelado' | 'inadimplente';
    vagas_ocupadas: number;
    taxa_ocupacao: number;
    inadimplente: boolean;
    plano_ativo: {
        id: string;
        num_vagas_contratadas: number;
        num_vagas_reservadas: number;
        valor_mensal: number | null;
        dia_vencimento_pagamento: number | null;
        permite_vagas_extras: boolean;
        valor_vaga_extra: number | null;
        ativo: boolean;
    } | null | any; // any to handle potential array from backend
}

// Helper to safely extract active plan (handles array or object)
const getActivePlan = (plano: any): Convenio['plano_ativo'] => {
    if (!plano) return null;
    if (Array.isArray(plano)) {
        return plano.find(p => p.ativo === true) || null;
    }
    return plano;
};

export default function ConveniosPage() {
    const [stats, setStats] = useState<ConvenioStats | null>(null);
    const [convenios, setConvenios] = useState<Convenio[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedConvenio, setSelectedConvenio] = useState<Convenio | null>(null);

    // Filtros
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [filtroCategoria, setFiltroCategoria] = useState('todos');
    const [busca, setBusca] = useState('');

    // Diálogos
    const [dialogNovoConvenio, setDialogNovoConvenio] = useState(false);
    const [dialogAdicionarVeiculo, setDialogAdicionarVeiculo] = useState(false);
    const [dialogConfigurarTemplate, setDialogConfigurarTemplate] = useState(false);

    // Buscar estatísticas
    useEffect(() => {
        fetchStats();
    }, []);

    // Buscar convênios
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchConvenios();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [filtroStatus, filtroCategoria, busca]);

    const fetchStats = async () => {
        try {
            const data = await api.getConvenioStats();
            setStats(data);
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
        }
    };

    const fetchConvenios = async () => {
        try {
            setLoading(true);
            const data = await api.getConvenios({
                status: filtroStatus,
                categoria: filtroCategoria,
                busca: busca
            });
            setConvenios(data || []);
        } catch (error) {
            console.error('Erro ao buscar convênios:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatarCNPJ = (cnpj: string) => {
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    const formatarValor = (valor: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(valor);
    };

    const getStatusBadge = (convenio: Convenio) => {
        if (convenio.status === 'ativo' && !convenio.inadimplente) {
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        }
        if (convenio.status === 'suspenso') {
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        }
        if (convenio.status === 'inadimplente' || convenio.inadimplente) {
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        }
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    };

    const { toast } = useToast();

    const handleStatusChange = async (convenio: Convenio, novoStatus: 'ativo' | 'suspenso') => {
        const action = novoStatus === 'ativo' ? 'reativar' : 'suspender';

        if (!confirm(`Deseja realmente ${action} o convênio "${convenio.nome_empresa}"?`)) {
            return;
        }

        try {
            await api.updateConvenio(convenio.id, { status: novoStatus });

            toast({
                title: `Convênio ${novoStatus === 'ativo' ? 'reativado' : 'suspenso'}`,
                description: `O convênio foi ${novoStatus === 'ativo' ? 'reativado' : 'suspenso'} com sucesso.`,
            });

            fetchConvenios();
            fetchStats();
        } catch (error) {
            console.error(`Erro ao ${action} convênio:`, error);
            toast({
                title: 'Erro ao atualizar status',
                description: 'Não foi possível completar a operação.',
                variant: 'destructive',
            });
        }
    };
    const handleGenerateContract = (convenio: Convenio) => {
        toast({
            title: 'Gerar Contrato',
            description: `Funcionalidade em desenvolvimento para: ${convenio.nome_empresa}`,
        });
    };

    const getStatusText = (convenio: Convenio) => {
        if (convenio.inadimplente) return 'Inadimplente';
        return convenio.status.charAt(0).toUpperCase() + convenio.status.slice(1);
    };

    // ESC para desselecionar
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedConvenio(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Convênios</h1>
                    <p className="text-muted-foreground">
                        Gestão de contratos empresariais de estacionamento
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setDialogNovoConvenio(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Convênio
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setDialogConfigurarTemplate(true)}
                    >
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar Template de Fatura
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="gerenciamento" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="gerenciamento">Gerenciamento</TabsTrigger>
                    <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
                </TabsList>

                <TabsContent value="gerenciamento" className="space-y-6">
                    {/* Statistics Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Convênios Ativos</CardTitle>
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats?.total_ativos || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    Empresas parcerias
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Receita Estimada</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {stats?.receita_mensal_prevista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Mensal recorrente
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ocupação Média</CardTitle>
                                <ParkingSquare className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats?.taxa_ocupacao_media || 0}%</div>
                                <p className="text-xs text-muted-foreground">
                                    Utilização de vagas
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${stats?.taxa_inadimplencia ? 'text-red-500' : ''}`}>
                                    {stats?.taxa_inadimplencia || 0}%
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {stats?.total_inadimplentes || 0} empresas pendentes
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Filtros e Busca</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por empresa ou CNPJ..."
                                        className="pl-8"
                                        value={busca}
                                        onChange={(e) => setBusca(e.target.value)}
                                    />
                                </div>
                                {/* Add Select filters here if needed */}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Main Content Area */}
                    {selectedConvenio ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Button
                                variant="ghost"
                                onClick={() => setSelectedConvenio(null)}
                                className="mb-4"
                            >
                                ← Voltar para lista
                            </Button>
                            <ConvenioDetailPanel convenioId={selectedConvenio.id} onClose={() => setSelectedConvenio(null)} />
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-0">
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Empresa</TableHead>
                                                <TableHead>CNPJ</TableHead>
                                                <TableHead>Vagas</TableHead>
                                                <TableHead>Valor Mensal</TableHead>
                                                <TableHead>Vencimento</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="h-24 text-center">
                                                        Carregando...
                                                    </TableCell>
                                                </TableRow>
                                            ) : convenios.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="h-24 text-center">
                                                        Nenhum convênio encontrado.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                convenios.map((convenio) => (
                                                    <TableRow
                                                        key={convenio.id}
                                                        className={`cursor-pointer hover:bg-muted/50 transition-all duration-200 ${convenio.status === 'suspenso' ? 'opacity-50 grayscale-[0.5]' : ''
                                                            }`}
                                                        onClick={() => setSelectedConvenio(convenio)}
                                                    >
                                                        <TableCell>
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                                                                    convenio
                                                                )}`}
                                                            >
                                                                {getStatusText(convenio)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{convenio.nome_empresa}</TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {formatarCNPJ(convenio.cnpj)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {(() => {
                                                                const plano = getActivePlan(convenio.plano_ativo);
                                                                return plano?.num_vagas_contratadas || 0;
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {(() => {
                                                                const plano = getActivePlan(convenio.plano_ativo);
                                                                // Sempre mostra valor por vaga se disponível
                                                                return plano?.valor_por_vaga
                                                                    ? `${formatarValor(plano.valor_por_vaga)}/vaga`
                                                                    : formatarValor(plano?.valor_mensal || 0);
                                                            })()}
                                                        </TableCell>
                                                        <TableCell>
                                                            {(() => {
                                                                const plano = getActivePlan(convenio.plano_ativo);
                                                                const diaVencimento = (plano as any)?.dia_vencimento
                                                                    || (plano as any)?.dia_vencimento_pos_pago
                                                                    || plano?.dia_vencimento_pagamento;
                                                                return diaVencimento ? `Dia ${diaVencimento}` : '-';
                                                            })()}
                                                        </TableCell>
                                                        <TableCell
                                                            className="flex gap-1"
                                                            onClick={(e) => e.stopPropagation()} // Prevent row selection when clicking actions
                                                        >
                                                            {convenio.status === 'suspenso' ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 border-green-200 hover:bg-green-50 text-green-700 w-full"
                                                                    onClick={() => handleStatusChange(convenio, 'ativo')}
                                                                >
                                                                    <Play className="h-3.5 w-3.5 mr-1" />
                                                                    Reativar
                                                                </Button>
                                                            ) : (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-muted-foreground"
                                                                        onClick={() => handleGenerateContract(convenio)}
                                                                        title="Gerar Contrato"
                                                                    >
                                                                        <FileText className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => handleStatusChange(convenio, 'suspenso')}>
                                                                        <Pause className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="relatorios">
                    <ConveniosRelatoriosPanel />
                </TabsContent>
            </Tabs>

            {/* Dialogs */}
            <DialogNovoConvenio
                mode="create"
                open={dialogNovoConvenio}
                onOpenChange={setDialogNovoConvenio}
                onSuccess={() => {
                    fetchConvenios();
                    fetchStats();
                    setDialogNovoConvenio(false);
                }}
            />

            <DialogAdicionarVeiculo
                open={dialogAdicionarVeiculo}
                onOpenChange={setDialogAdicionarVeiculo}
                convenioId={selectedConvenio?.id || ''}
                onSuccess={() => {
                    // Update detail panel if needed
                }}
            />

            <DialogConfigurarTemplate
                open={dialogConfigurarTemplate}
                onOpenChange={setDialogConfigurarTemplate}
            />
        </div>
    );
}
