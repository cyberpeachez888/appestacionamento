/**
 * Aba Movimentações do Contrato
 * Component para exibir todas as movimentações (entradas/saídas) de um convênio
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Calendar, Car, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Movimentacao {
    id: string;
    placa: string;
    data_entrada: string;
    hora_entrada: string;
    data_saida: string | null;
    hora_saida: string | null;
    tempo_permanencia: string | null;
    tipo_vaga: 'regular' | 'extra';
    tipo_vaga_extra?: 'paga' | 'cortesia' | null;
}

interface MovimentacoesContratoTabProps {
    convenioId: string;
}

export function MovimentacoesContratoTab({ convenioId }: MovimentacoesContratoTabProps) {
    const { token } = useAuth();
    const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');

    useEffect(() => {
        // Definir período padrão (mês atual)
        const hoje = new Date();
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

        setDataInicio(primeiroDia.toISOString().split('T')[0]);
        setDataFim(ultimoDia.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (dataInicio && dataFim) {
            fetchMovimentacoes();
        }
    }, [dataInicio, dataFim, convenioId]);

    const fetchMovimentacoes = async () => {
        try {
            setLoading(true);
            console.log('[MovimentacoesContratoTab] Buscando movimentações de veículos cadastrados:', { convenioId, dataInicio, dataFim });

            const response = await fetch(
                `${API_URL}/convenios/${convenioId}/movimentacoes?data_inicio=${dataInicio}&data_fim=${dataFim}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                // FILTRO CRÍTICO: Apenas veículos cadastrados (tipo_vaga = 'regular')
                // NUNCA exibir vagas extras (tipo_vaga = 'extra')
                const movimentacoesRegulares = (data || []).filter((mov: Movimentacao) =>
                    mov.tipo_vaga === 'regular'
                );
                console.log('[MovimentacoesContratoTab] Total recebidas:', data.length, '| Veículos cadastrados (regular):', movimentacoesRegulares.length);
                setMovimentacoes(movimentacoesRegulares);
            } else {
                console.error('[MovimentacoesContratoTab] Erro HTTP:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('[MovimentacoesContratoTab] Erro ao buscar movimentações:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatarData = (data: string) => {
        return new Date(data).toLocaleDateString('pt-BR');
    };

    const formatarTempo = (tempo: string | null) => {
        if (!tempo) return '-';
        // Converte formato "X hours Y minutes" para "Xh Ymin"
        return tempo
            .replace(' hours', 'h')
            .replace(' hour', 'h')
            .replace(' minutes', 'min')
            .replace(' minute', 'min');
    };

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="text-sm font-medium">Data Início</label>
                    <Input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                    />
                </div>
                <div className="flex-1">
                    <label className="text-sm font-medium">Data Fim</label>
                    <Input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                    />
                </div>
                <Button onClick={fetchMovimentacoes} disabled={loading}>
                    <Calendar className="h-4 w-4 mr-2" />
                    {loading ? 'Carregando...' : 'Buscar'}
                </Button>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">Total de Movimentações</div>
                    <div className="text-2xl font-bold">{movimentacoes.length}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm text-green-700">Veículos Estacionados</div>
                    <div className="text-2xl font-bold text-green-700">
                        {movimentacoes.filter(m => !m.data_saida).length}
                    </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-700">Saídas Concluídas</div>
                    <div className="text-2xl font-bold text-blue-700">
                        {movimentacoes.filter(m => m.data_saida).length}
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Placa</TableHead>
                            <TableHead>Data/Hora Entrada</TableHead>
                            <TableHead>Data/Hora Saída</TableHead>
                            <TableHead>Tempo de Permanência</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Carregando...
                                </TableCell>
                            </TableRow>
                        ) : movimentacoes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Sem movimentações de veículos cadastrados no período selecionado
                                </TableCell>
                            </TableRow>
                        ) : (
                            movimentacoes.map((mov) => (
                                <TableRow key={mov.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Car className="h-4 w-4 text-muted-foreground" />
                                            {mov.placa}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{formatarData(mov.data_entrada)}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {mov.hora_entrada.slice(0, 5)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {mov.data_saida ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium">{formatarData(mov.data_saida)}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {mov.hora_saida?.slice(0, 5)}
                                                </span>
                                            </div>
                                        ) : (
                                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                                                <Clock className="h-3 w-3 mr-1" />
                                                Em uso
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatarTempo(mov.tempo_permanencia)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
