/**
 * Componentes: Painel de Relatórios
 * Dashboard de análise de convênios
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BarChart,
    PieChart,
    TrendingUp,
    DollarSign,
    Users,
    Calendar,
    Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';

export function ConveniosRelatoriosPanel() {
    const [faturas, setFaturas] = useState<any[]>([]);
    const [ranking, setRanking] = useState<any[]>([]);
    const [loadingFaturas, setLoadingFaturas] = useState(false);
    const [periodoFatura, setPeriodoFatura] = useState('');
    const [statusFatura, setStatusFatura] = useState('todos');

    useEffect(() => {
        // Initial load
        fetchRanking();

        // Default current month for invoices
        const hoje = new Date();
        setPeriodoFatura(hoje.toISOString().slice(0, 7)); // YYYY-MM
    }, []);

    useEffect(() => {
        if (periodoFatura) {
            fetchFaturas();
        }
    }, [periodoFatura, statusFatura]);

    const fetchFaturas = async () => {
        try {
            setLoadingFaturas(true);
            const data = await api.getConveniosRelatoriosFaturas({
                periodo: periodoFatura,
                status: statusFatura !== 'todos' ? statusFatura : undefined
            });
            setFaturas(data || []);
        } catch (error) {
            console.error('Erro ao buscar faturas:', error);
        } finally {
            setLoadingFaturas(false);
        }
    };

    const fetchRanking = async () => {
        try {
            const data = await api.getConveniosRanking();
            setRanking(data || []);
        } catch (error) {
            console.error('Erro ao buscar ranking:', error);
        }
    };

    const calcularTotalFaturas = () => {
        return faturas.reduce((acc, f) => acc + Number(f.valor_total), 0);
    };

    const calcularStatusCount = (status: string) => {
        return faturas.filter(f => f.status === status).length;
    };

    const formatarMoeda = (valor: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(valor);
    };

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Total (Mês)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatarMoeda(calcularTotalFaturas())}</div>
                        <p className="text-xs text-muted-foreground">
                            {faturas.length} faturas geradas
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {calcularStatusCount('pendente')}
                        </div>
                        <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {calcularStatusCount('vencida')}
                        </div>
                        <p className="text-xs text-muted-foreground">Necessitam atenção</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ranking Ocupação</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">TOP 1</div>
                        <p className="text-xs text-muted-foreground">
                            {ranking[0]?.nome_empresa || 'N/A'} ({ranking[0]?.taxa_ocupacao_percentual}%)
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="faturas" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="faturas">Relatório Financeiro</TabsTrigger>
                    <TabsTrigger value="inadimplencia">Inadimplência</TabsTrigger>
                    <TabsTrigger value="ranking">Ranking de Ocupação</TabsTrigger>
                </TabsList>

                {/* TAB FATURAS */}
                <TabsContent value="faturas" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Faturamento Mensal</CardTitle>
                                    <CardDescription>
                                        Lista consolidada de faturas geradas no período
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-[180px]">
                                        <Input
                                            type="month"
                                            value={periodoFatura}
                                            onChange={(e) => setPeriodoFatura(e.target.value)}
                                        />
                                    </div>
                                    <Select value={statusFatura} onValueChange={setStatusFatura}>
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todos">Todos</SelectItem>
                                            <SelectItem value="pendente">Pendente</SelectItem>
                                            <SelectItem value="paga">Paga</SelectItem>
                                            <SelectItem value="vencida">Vencida</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="icon">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Empresa</TableHead>
                                        <TableHead>Fatura</TableHead>
                                        <TableHead>Vencimento</TableHead>
                                        <TableHead>Valor Total</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Atraso</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingFaturas ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">
                                                Carregando...
                                            </TableCell>
                                        </TableRow>
                                    ) : faturas.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                Nenhuma fatura encontrada para este período.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        faturas.map((fatura) => (
                                            <TableRow key={fatura.id}>
                                                <TableCell className="font-medium">
                                                    {fatura.convenio?.nome_empresa}
                                                </TableCell>
                                                <TableCell>{fatura.numero_fatura}</TableCell>
                                                <TableCell>
                                                    {format(new Date(fatura.data_vencimento), 'dd/MM/yyyy')}
                                                </TableCell>
                                                <TableCell>{formatarMoeda(fatura.valor_total)}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            fatura.status === 'paga'
                                                                ? 'default'
                                                                : fatura.status === 'pendente'
                                                                    ? 'secondary'
                                                                    : 'destructive'
                                                        }
                                                        className={fatura.status === 'paga' ? 'bg-green-600' : ''}
                                                    >
                                                        {fatura.status.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={`text-right ${fatura.dias_atraso > 0 ? 'text-red-600 font-bold' : ''}`}>
                                                    {fatura.dias_atraso > 0 ? `${fatura.dias_atraso} dias` : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB RANKING */}
                <TabsContent value="ranking" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ranking de Ocupação</CardTitle>
                            <CardDescription>
                                Convênios com maior taxa de utilização de vagas hoje
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Posição</TableHead>
                                        <TableHead>Empresa</TableHead>
                                        <TableHead>Vagas Contratadas</TableHead>
                                        <TableHead>Vagas Ocupadas</TableHead>
                                        <TableHead>Taxa de Ocupação</TableHead>
                                        <TableHead>Barra de Progresso</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ranking.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-bold">
                                                #{index + 1}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {item.nome_empresa}
                                            </TableCell>
                                            <TableCell>{item.num_vagas_contratadas}</TableCell>
                                            <TableCell>{item.vagas_ocupadas}</TableCell>
                                            <TableCell className="font-bold">
                                                {item.taxa_ocupacao_percentual}%
                                            </TableCell>
                                            <TableCell className="w-[30%]">
                                                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-2.5 rounded-full ${item.taxa_ocupacao_percentual > 90 ? 'bg-red-500' :
                                                            item.taxa_ocupacao_percentual > 70 ? 'bg-yellow-500' :
                                                                'bg-green-500'
                                                            }`}
                                                        style={{ width: `${Math.min(item.taxa_ocupacao_percentual, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {ranking.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                Nenhum dado de ocupação disponível.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB INADIMPLENCIA */}
                <TabsContent value="inadimplencia" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Relatório de Inadimplência</CardTitle>
                            <CardDescription>
                                Empresas com faturas vencidas e não pagas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Empresa</TableHead>
                                        <TableHead>Faturas Vencidas</TableHead>
                                        <TableHead>Valor Total Devido</TableHead>
                                        <TableHead>Maior Atraso</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(() => {
                                        // Agrupar faturas vencidas por empresa
                                        const vencidas = faturas.filter(f => f.status === 'vencida');
                                        const porEmpresa = vencidas.reduce((acc: any, curr) => {
                                            const empresa = curr.convenio?.nome_empresa || 'Desconhecida';
                                            if (!acc[empresa]) {
                                                acc[empresa] = {
                                                    nome: empresa,
                                                    qtd: 0,
                                                    total: 0,
                                                    maiorAtraso: 0,
                                                    faturas: []
                                                };
                                            }
                                            acc[empresa].qtd += 1;
                                            acc[empresa].total += Number(curr.valor_total);
                                            acc[empresa].maiorAtraso = Math.max(acc[empresa].maiorAtraso, curr.dias_atraso);
                                            acc[empresa].faturas.push(curr);
                                            return acc;
                                        }, {});

                                        const lista = Object.values(porEmpresa);

                                        if (lista.length === 0) {
                                            return (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                        Nenhuma inadimplência encontrada no período selecionado.
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }

                                        return lista.map((item: any, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium text-red-600">
                                                    {item.nome}
                                                </TableCell>
                                                <TableCell>{item.qtd}</TableCell>
                                                <TableCell>{formatarMoeda(item.total)}</TableCell>
                                                <TableCell className="font-bold">{item.maiorAtraso} dias</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" className="text-blue-600">
                                                        Ver Detalhes
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ));
                                    })()}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
