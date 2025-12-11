/**
 * Convenios Page - Main Component
 * Gestão de Convênios Empresariais
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Building2,
    TrendingUp,
    ParkingSquare,
    AlertTriangle,
    Plus,
    FileText,
    Download,
    Receipt,
} from 'lucide-react';
import { ConveniosDetailPanel } from './components/ConvenioDetailPanel';
import { ConveniosRelatoriosPanel } from './components/ConveniosRelatoriosPanel';
import { DialogNovoConvenio } from './components/dialogs/DialogNovoConvenio';
import { DialogAdicionarVeiculo } from './components/dialogs/DialogAdicionarVeiculo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
    tipo_convenio: 'pre-pago' | 'pos-pago';
    categoria: string;
    status: 'ativo' | 'suspenso' | 'cancelado' | 'inadimplente';
    vagas_ocupadas: number;
    taxa_ocupacao: number;
    inadimplente: boolean;
    plano_ativo: {
        num_vagas_contratadas: number;
        valor_mensal: number;
        dia_vencimento_pagamento: number;
    } | null;
}

export default function ConveniosPage() {
    const [stats, setStats] = useState<ConvenioStats | null>(null);
    const [convenios, setConvenios] = useState<Convenio[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedConvenio, setSelectedConvenio] = useState<Convenio | null>(null);

    // Filtros
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [filtroCategoria, setFiltroCategoria] = useState('todos');
    const [busca, setBusca] = useState('');

    // Diálogos
    const [dialogNovoConvenio, setDialogNovoConvenio] = useState(false);
    const [dialogAdicionarVeiculo, setDialogAdicionarVeiculo] = useState(false);

    // Buscar estatísticas
    useEffect(() => {
        fetchStats();
    }, []);

    // Buscar convênios
    useEffect(() => {
        fetchConvenios();
    }, [filtroStatus, filtroTipo, filtroCategoria, busca]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/convenios/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
        }
    };

    const fetchConvenios = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const params = new URLSearchParams();
            if (filtroStatus !== 'todos') params.append('status', filtroStatus);
            if (filtroTipo !== 'todos') params.append('tipo', filtroTipo);
            if (filtroCategoria !== 'todos') params.append('categoria', filtroCategoria);
            if (busca) params.append('busca', busca);

            const response = await fetch(`${API_URL}/convenios?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setConvenios(data);
            }
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
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Convênios</h1>
                    <p className="text-muted-foreground">
                        Gestão de contratos empresariais de estacionamento
                    </p>
                </div>
            </div>

            <Tabs defaultValue="gerenciamento" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
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
                                    </tr>
            </thead>
            <tbody>
                {convenios.map((convenio) => (
                    <tr
                        key={convenio.id}
                        className={`border-b hover:bg-muted/50 cursor-pointer transition-colors ${selectedConvenio?.id === convenio.id ? 'bg-muted' : ''
                            }`}
                        onClick={() => setSelectedConvenio(convenio)}
                    >
                        <td className="p-3">
                            <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                                    convenio
                                )}`}
                            >
                                {getStatusText(convenio)}
                            </span>
                        </td>
                        <td className="p-3 font-medium">{convenio.nome_empresa}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                            {formatarCNPJ(convenio.cnpj)}
                        </td>
                        <td className="p-3">
                            <span className="capitalize">{convenio.tipo_convenio}</span>
                        </td>
                        <td className="p-3">
                            {convenio.vagas_ocupadas} / {convenio.plano_ativo?.num_vagas_contratadas || 0}
                            <span className="text-xs text-muted-foreground ml-1">
                                ({convenio.taxa_ocupacao.toFixed(0)}%)
                            </span>
                        </td>
                        <td className="p-3 font-medium">
                            {formatarValor(convenio.plano_ativo?.valor_mensal || 0)}
                        </td>
                        <td className="p-3">
                            Dia {convenio.plano_ativo?.dia_vencimento_pagamento || '-'}
                        </td>
                        <td className="p-3">
                            <Button variant="ghost" size="sm">
                                <Receipt className="h-4 w-4" />
                            </Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
                        </div >
                    )
}
                </CardContent >
            </Card >

    {/* Detail Panel */ }
{
    selectedConvenio && (
        <ConvenioDetailPanel
            convenioId={selectedConvenio.id}
            onClose={() => setSelectedConvenio(null)}
        />
    )
}

{/* Dialogs */ }
            <DialogNovoConvenio
                open={dialogNovoConvenio}
                onOpenChange={setDialogNovoConvenio}
                onSuccess={() => {
                    fetchConvenios();
                    fetchStats();
                }}
            />

            <DialogAdicionarVeiculo
                open={dialogAdicionarVeiculo}
                onOpenChange={setDialogAdicionarVeiculo}
                convenioId={selectedConvenio?.id || ''}
                onSuccess={() => {
                    // Refresh detail panel
                }}
            />
        </div >
    );
}
