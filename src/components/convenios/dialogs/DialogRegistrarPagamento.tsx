/**
 * Dialog: Registrar Pagamento
 * Registra pagamento de fatura
 */

'use client';

import { useState } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Fatura {
    id: string;
    numero_fatura: string;
    periodo_referencia: string;
    data_vencimento: string;
    valor_total: number;
    status: string;
}

interface DialogRegistrarPagamentoProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    convenioId: string;
    fatura: Fatura | null;
    onSuccess: () => void;
}

export function DialogRegistrarPagamento({
    open,
    onOpenChange,
    convenioId,
    fatura,
    onSuccess,
}: DialogRegistrarPagamentoProps) {
    const [loading, setLoading] = useState(false);
    const [dataPagamento, setDataPagamento] = useState('');
    const [formaPagamento, setFormaPagamento] = useState('');
    const [numeroNfse, setNumeroNfse] = useState('');
    const [observacoes, setObservacoes] = useState('');

    const resetForm = () => {
        setDataPagamento('');
        setFormaPagamento('');
        setNumeroNfse('');
        setObservacoes('');
    };

    const calcularDiasAtraso = () => {
        if (!fatura) return 0;
        const hoje = new Date();
        const vencimento = new Date(fatura.data_vencimento);
        const diffTime = hoje.getTime() - vencimento.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const calcularJuros = () => {
        const diasAtraso = calcularDiasAtraso();
        if (diasAtraso === 0 || !fatura) return 0;

        // 1% ao mês = 0.033% ao dia (aproximado)
        const taxaDiaria = 0.01 / 30;
        return fatura.valor_total * taxaDiaria * diasAtraso;
    };

    const calcularValorTotal = () => {
        if (!fatura) return 0;
        return fatura.valor_total + calcularJuros();
    };

    const handleSubmit = async () => {
        if (!dataPagamento || !formaPagamento) {
            alert('Data de pagamento e forma de pagamento são obrigatórios');
            return;
        }

        if (!fatura) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const payload = {
                data_pagamento: dataPagamento,
                forma_pagamento: formaPagamento,
                numero_nfse: numeroNfse || undefined,
                observacoes: observacoes || undefined,
            };

            const response = await fetch(
                `${API_URL}/convenios/${convenioId}/faturas/${fatura.id}/pagar`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (response.ok) {
                resetForm();
                onOpenChange(false);
                onSuccess();
            } else {
                const error = await response.json();
                alert(error.error || 'Erro ao registrar pagamento');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao registrar pagamento');
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

    const formatarData = (data: string) => {
        return new Date(data).toLocaleDateString('pt-BR');
    };

    const formatarPeriodo = (periodo: string) => {
        const [ano, mes] = periodo.split('-');
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return `${meses[parseInt(mes) - 1]}/${ano}`;
    };

    const diasAtraso = calcularDiasAtraso();
    const juros = calcularJuros();
    const valorTotal = calcularValorTotal();

    if (!fatura) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Registrar Pagamento
                    </DialogTitle>
                    <DialogDescription>
                        Fatura {fatura.numero_fatura} - {formatarPeriodo(fatura.periodo_referencia)}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Info da Fatura */}
                    <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Informações da Fatura</h4>
                        <dl className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Número:</dt>
                                <dd className="font-medium">{fatura.numero_fatura}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Vencimento:</dt>
                                <dd className="font-medium">{formatarData(fatura.data_vencimento)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Valor Original:</dt>
                                <dd className="font-medium">{formatarValor(fatura.valor_total)}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* Alerta de Atraso */}
                    {diasAtraso > 0 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Fatura vencida há {diasAtraso} dia(s)</strong>
                                <br />
                                Juros calculados: {formatarValor(juros)}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="data_pagamento">
                            Data de Pagamento <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="data_pagamento"
                            type="date"
                            value={dataPagamento}
                            onChange={(e) => setDataPagamento(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="forma_pagamento">
                            Forma de Pagamento <span className="text-red-500">*</span>
                        </Label>
                        <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="Pix">PIX</SelectItem>
                                <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                                <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                                <SelectItem value="Transferência">Transferência Bancária</SelectItem>
                                <SelectItem value="Boleto">Boleto</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="numero_nfse">Número da NFS-e (Opcional)</Label>
                        <Input
                            id="numero_nfse"
                            value={numeroNfse}
                            onChange={(e) => setNumeroNfse(e.target.value)}
                            placeholder="Ex: 123456"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="observacoes">Observações</Label>
                        <Textarea
                            id="observacoes"
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            placeholder="Informações adicionais sobre o pagamento"
                        />
                    </div>

                    {/* Resumo do Pagamento */}
                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">
                            Valor a Pagar
                        </h4>
                        <dl className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Valor da Fatura:</dt>
                                <dd className="font-medium">{formatarValor(fatura.valor_total)}</dd>
                            </div>
                            {juros > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <dt>Juros ({diasAtraso} dia(s)):</dt>
                                    <dd className="font-medium">+ {formatarValor(juros)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-green-200 dark:border-green-800">
                                <dt className="font-semibold text-green-900 dark:text-green-100">
                                    Total:
                                </dt>
                                <dd className="font-bold text-lg text-green-900 dark:text-green-100">
                                    {formatarValor(valorTotal)}
                                </dd>
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
                        disabled={!dataPagamento || !formaPagamento || loading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {loading ? 'Registrando...' : 'Confirmar Pagamento'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
