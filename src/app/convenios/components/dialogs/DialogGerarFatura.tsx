/**
 * Dialog: Gerar Fatura
 * Gera fatura mensal para convênio
 */

'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Receipt } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface DialogGerarFaturaProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    convenioId: string;
    convenioNome: string;
    tipoConvenio: 'pre-pago' | 'pos-pago';
    valorMensal: number;
    onSuccess: () => void;
}

export function DialogGerarFatura({
    open,
    onOpenChange,
    convenioId,
    convenioNome,
    tipoConvenio,
    valorMensal,
    onSuccess,
}: DialogGerarFaturaProps) {
    const [loading, setLoading] = useState(false);
    const [periodoReferencia, setPeriodoReferencia] = useState('');
    const [dataEmissao, setDataEmissao] = useState('');
    const [valorExtras, setValorExtras] = useState('');
    const [valorDescontos, setValorDescontos] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [movimentacoesCount, setMovimentacoesCount] = useState(0);

    // Inicializar com mês atual
    useEffect(() => {
        if (open) {
            const hoje = new Date();
            const mesAtual = hoje.toISOString().slice(0, 7); // YYYY-MM
            setPeriodoReferencia(mesAtual);
            setDataEmissao(hoje.toISOString().split('T')[0]);

            // Se pós-pago, buscar movimentações não faturadas
            if (tipoConvenio === 'pos-pago') {
                fetchMovimentacoesNaoFaturadas(mesAtual);
            }
        }
    }, [open, tipoConvenio]);

    const fetchMovimentacoesNaoFaturadas = async (periodo: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_URL}/convenios/${convenioId}/movimentacoes/nao-faturadas?periodo=${periodo}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setMovimentacoesCount(data.length);
            }
        } catch (error) {
            console.error('Erro ao buscar movimentações:', error);
        }
    };

    const resetForm = () => {
        setPeriodoReferencia('');
        setDataEmissao('');
        setValorExtras('');
        setValorDescontos('');
        setObservacoes('');
        setMovimentacoesCount(0);
    };

    const calcularValorTotal = () => {
        const base = valorMensal;
        const extras = parseFloat(valorExtras) || 0;
        const descontos = parseFloat(valorDescontos) || 0;
        return base + extras - descontos;
    };

    const handleSubmit = async () => {
        if (!periodoReferencia) {
            alert('Período de referência é obrigatório');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const payload = {
                periodo_referencia: periodoReferencia,
                data_emissao: dataEmissao,
                valor_extras: parseFloat(valorExtras) || 0,
                valor_descontos: parseFloat(valorDescontos) || 0,
                observacoes: observacoes || undefined,
            };

            const response = await fetch(`${API_URL}/convenios/${convenioId}/faturas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                resetForm();
                onOpenChange(false);
                onSuccess();
            } else {
                const error = await response.json();
                alert(error.error || 'Erro ao gerar fatura');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao gerar fatura');
        } finally {
            setLoading(false);
        }
    };

    const formatarValor = (valor: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(valor);
    };

    const formatarPeriodo = (periodo: string) => {
        if (!periodo) return '';
        const [ano, mes] = periodo.split('-');
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return `${meses[parseInt(mes) - 1]}/${ano}`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Gerar Fatura
                    </DialogTitle>
                    <DialogDescription>
                        Gerar fatura para {convenioNome}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Tipo de Convênio Info */}
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {tipoConvenio === 'pre-pago' ? (
                                <>
                                    <strong>Pré-pago:</strong> Valor fixo mensal de {formatarValor(valorMensal)}
                                </>
                            ) : (
                                <>
                                    <strong>Pós-pago:</strong> {movimentacoesCount} movimentação(ões) não faturada(s)
                                </>
                            )}
                        </AlertDescription>
                    </Alert>

                    <div className="grid gap-2">
                        <Label htmlFor="periodo_referencia">
                            Período de Referência <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="periodo_referencia"
                            type="month"
                            value={periodoReferencia}
                            onChange={(e) => {
                                setPeriodoReferencia(e.target.value);
                                if (tipoConvenio === 'pos-pago') {
                                    fetchMovimentacoesNaoFaturadas(e.target.value);
                                }
                            }}
                        />
                        {periodoReferencia && (
                            <p className="text-sm text-muted-foreground">
                                {formatarPeriodo(periodoReferencia)}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="data_emissao">Data de Emissão</Label>
                        <Input
                            id="data_emissao"
                            type="date"
                            value={dataEmissao}
                            onChange={(e) => setDataEmissao(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="valor_extras">Valores Extras</Label>
                            <Input
                                id="valor_extras"
                                type="number"
                                step="0.01"
                                value={valorExtras}
                                onChange={(e) => setValorExtras(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="valor_descontos">Descontos</Label>
                            <Input
                                id="valor_descontos"
                                type="number"
                                step="0.01"
                                value={valorDescontos}
                                onChange={(e) => setValorDescontos(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="observacoes">Observações</Label>
                        <Textarea
                            id="observacoes"
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            placeholder="Informações adicionais sobre a fatura"
                        />
                    </div>

                    {/* Resumo */}
                    <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Resumo da Fatura</h4>
                        <dl className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Valor Base:</dt>
                                <dd className="font-medium">{formatarValor(valorMensal)}</dd>
                            </div>
                            {parseFloat(valorExtras) > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <dt>Extras:</dt>
                                    <dd className="font-medium">+ {formatarValor(parseFloat(valorExtras))}</dd>
                                </div>
                            )}
                            {parseFloat(valorDescontos) > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <dt>Descontos:</dt>
                                    <dd className="font-medium">- {formatarValor(parseFloat(valorDescontos))}</dd>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t">
                                <dt className="font-semibold">Valor Total:</dt>
                                <dd className="font-bold text-lg">{formatarValor(calcularValorTotal())}</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!periodoReferencia || loading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {loading ? 'Gerando...' : 'Gerar Fatura'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
