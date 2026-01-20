/**
 * Aba Vagas Extras
 * Component para exibir vagas extras de um convênio
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
import { Download, Calendar, DollarSign, Car, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface VagaExtra {
    id: string;
    placa: string;
    data_entrada: string;
    hora_entrada: string;
    data_saida: string | null;
    hora_saida: string | null;
    valor_cobrado: number;
    tipo_vaga_extra: 'paga' | 'cortesia';
    vinculado_por: string;
    vinculado_em: string;
    bloqueado: boolean;
}

interface VagasExtrasTabProps {
    convenioId: string;
}

export function VagasExtrasTab({ convenioId }: VagasExtrasTabProps) {
    const { token } = useAuth();
    const [vagasExtras, setVagasExtras] = useState<VagaExtra[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');

    console.log('[VagasExtrasTab] 🎨 RENDER - vagasExtras.length:', vagasExtras.length, 'loading:', loading);

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
            fetchVagasExtras();
        }
    }, [dataInicio, dataFim, convenioId]);

    const fetchVagasExtras = async () => {
        try {
            setLoading(true);
            console.log('[VagasExtrasTab] Buscando vagas extras:', { convenioId, dataInicio, dataFim });
            const response = await fetch(
                `${API_URL}/convenios/${convenioId}/vagas-extras?dataInicio=${dataInicio}&dataFim=${dataFim}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log('[VagasExtrasTab] Resposta recebida:', data);
                // Backend retorna { vagas: [...], resumo: {...} }
                const vagas = data.vagas || data || [];
                console.log('[VagasExtrasTab] Vagas processadas:', vagas.length);
                console.log('[VagasExtrasTab] 🔥 ANTES setVagasExtras - vagasExtras.length:', vagasExtras.length);
                setVagasExtras(vagas);
                console.log('[VagasExtrasTab] ✅ DEPOIS setVagasExtras - chamado com', vagas.length, 'vagas');
            } else {
                console.error('[VagasExtrasTab] Erro HTTP:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('[VagasExtrasTab] Erro ao buscar vagas extras:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportarExcel = async () => {
        try {
            const response = await fetch(
                `${API_URL}/convenios/${convenioId}/vagas-extras/exportar?dataInicio=${dataInicio}&dataFim=${dataFim}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vagas-extras-${convenioId}-${dataInicio}-${dataFim}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Erro ao exportar:', error);
        }
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

    const totalCortesia = vagasExtras.filter(v => v.valor_cobrado === 0).length;
    const totalPaga = vagasExtras.filter(v => v.valor_cobrado > 0).length;
    const valorTotal = vagasExtras.reduce((sum, v) => sum + v.valor_cobrado, 0);

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
                <Button onClick={fetchVagasExtras} disabled={loading}>
                    <Calendar className="h-4 w-4 mr-2" />
                    {loading ? 'Carregando...' : 'Buscar'}
                </Button>
                <Button onClick={handleExportarExcel} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                </Button>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Vagas Extras</div>
                    <div className="text-2xl font-bold">{vagasExtras.length}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm text-green-700">Cortesia</div>
                    <div className="text-2xl font-bold text-green-700">{totalCortesia}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-700">Pagas</div>
                    <div className="text-2xl font-bold text-blue-700">{totalPaga}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-sm text-purple-700">Valor Total</div>
                    <div className="text-2xl font-bold text-purple-700">{formatarValor(valorTotal)}</div>
                </div>
            </div>

            {/* Tabela */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Placa</TableHead>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Tempo</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Faturado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Carregando...
                                </TableCell>
                            </TableRow>
                        ) : vagasExtras.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Nenhuma vaga extra no período selecionado
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {console.log('[VagasExtrasTab] 📋 Mapeando vagas:', vagasExtras)}
                                {vagasExtras.map((vaga, index) => {
                                    console.log(`[VagasExtrasTab] Vaga ${index}:`, vaga);
                                    return (
                                        <TableRow key={vaga.id || index}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Car className="h-4 w-4 text-muted-foreground" />
                                                    {vaga.placa}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{formatarData(vaga.data_entrada)}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {vaga.hora_entrada.slice(0, 5)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {vaga.tipo_vaga_extra === 'cortesia' ? (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                                                        <Check className="h-3 w-3 mr-1" />
                                                        Cortesia
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                                        <DollarSign className="h-3 w-3 mr-1" />
                                                        Paga
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {vaga.data_saida && vaga.hora_saida
                                                    ? (() => {
                                                        const entrada = new Date(`${vaga.data_entrada}T${vaga.hora_entrada}`);
                                                        const saida = new Date(`${vaga.data_saida}T${vaga.hora_saida}`);
                                                        const diffMs = saida.getTime() - entrada.getTime();
                                                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                                        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                                        return `${diffHours}h ${diffMins}min`;
                                                    })()
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                                                    {formatarValor(vaga.valor_cobrado)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {vaga.tipo_vaga_extra === 'paga' ? (
                                                    <Badge variant="default" className="bg-green-600">
                                                        Sim
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">
                                                        Não
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
