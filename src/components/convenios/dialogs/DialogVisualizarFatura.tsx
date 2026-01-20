/**
 * Dialog: Visualizar Fatura
 * Exibe preview read-only de uma fatura existente
 */

'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Receipt } from 'lucide-react';
import { gerarPDFFatura } from '@/utils/faturaPDFGenerator';
import { api } from '@/lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface DialogVisualizarFaturaProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fatura: any;
    convenio: any;
    convenioId: string;
}

export function DialogVisualizarFatura({
    open,
    onOpenChange,
    fatura,
    convenio,
    convenioId,
}: DialogVisualizarFaturaProps) {
    const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
    const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);

    useEffect(() => {
        if (open && fatura) {
            fetchMovimentacoes();
        }
    }, [open, fatura]);

    const fetchMovimentacoes = async () => {
        if (!fatura) return;

        setLoadingMovimentacoes(true);
        try {
            const allMovimentacoes = await api.getConvenioMovimentacoes(convenioId);
            // Filtrar movimentações desta fatura
            const faturaMovimentacoes = allMovimentacoes.filter(
                (mov: any) => mov.fatura_id === fatura.id
            );
            setMovimentacoes(faturaMovimentacoes);
        } catch (error) {
            console.error('Erro ao buscar movimentações:', error);
            setMovimentacoes([]);
        } finally {
            setLoadingMovimentacoes(false);
        }
    };

    const handleDownloadPDF = () => {
        gerarPDFFatura(fatura, convenio, movimentacoes);
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

    if (!fatura) return null;

    // Calcular totais de vagas extras
    const vagasExtras = movimentacoes.filter((m: any) => m.tipo_vaga_extra);
    const vagasPagas = vagasExtras.filter((v: any) => v.tipo_vaga_extra === 'paga');
    const vagasCortesia = vagasExtras.filter((v: any) => v.tipo_vaga_extra === 'cortesia');
    const valorTotalVagasPagas = vagasPagas.reduce((sum: number, v: any) => sum + (v.valor_cobrado || 0), 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Receipt className="h-6 w-6 text-primary" />
                            <div>
                                <DialogTitle>Fatura {fatura.numero_fatura}</DialogTitle>
                                <DialogDescription>
                                    Visualização da fatura
                                </DialogDescription>
                            </div>
                        </div>
                        <Badge variant={fatura.status === 'paga' ? 'default' : 'secondary'}>
                            {fatura.status}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Informações Básicas */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Período de Referência
                            </label>
                            <p className="text-base font-medium">{fatura.periodo_referencia}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Data de Emissão
                            </label>
                            <p className="text-base font-medium">{formatarData(fatura.data_emissao)}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Data de Vencimento
                            </label>
                            <p className="text-base font-medium">{formatarData(fatura.data_vencimento)}</p>
                        </div>
                        {fatura.data_pagamento && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                    Data de Pagamento
                                </label>
                                <p className="text-base font-medium text-green-600">
                                    {formatarData(fatura.data_pagamento)}
                                </p>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Resumo de Vagas Extras */}
                    {loadingMovimentacoes ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Carregando movimentações...
                        </p>
                    ) : vagasExtras.length > 0 ? (
                        <div>
                            <h4 className="font-semibold mb-3">Vagas Extras</h4>
                            <div className="space-y-2">
                                {vagasCortesia.length > 0 && (
                                    <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                                        <span className="text-sm">
                                            {vagasCortesia.length} vaga{vagasCortesia.length > 1 ? 's' : ''} extras cortesia
                                        </span>
                                        <span className="text-sm font-medium">R$ 0,00</span>
                                    </div>
                                )}
                                {vagasPagas.length > 0 && (
                                    <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                                        <span className="text-sm">
                                            {vagasPagas.length} vaga{vagasPagas.length > 1 ? 's' : ''} extras paga{vagasPagas.length > 1 ? 's' : ''}
                                        </span>
                                        <span className="text-sm font-medium">{formatarValor(valorTotalVagasPagas)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground text-center py-2">
                            Nenhuma vaga extra utilizada neste período
                        </div>
                    )}

                    <Separator />

                    {/* Valores */}
                    <div className="space-y-3">
                        <h4 className="font-semibold">Valores</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm">Valor Base</span>
                                <span className="text-sm font-medium">{formatarValor(fatura.valor_base)}</span>
                            </div>

                            {valorTotalVagasPagas > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-sm">(+) Vagas Extras Pagas</span>
                                    <span className="text-sm font-medium">{formatarValor(valorTotalVagasPagas)}</span>
                                </div>
                            )}

                            {fatura.valor_descontos > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span className="text-sm">(-) Desconto</span>
                                    <span className="text-sm font-medium">{formatarValor(fatura.valor_descontos)}</span>
                                </div>
                            )}

                            {fatura.valor_juros > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <span className="text-sm">(+) Juros</span>
                                    <span className="text-sm font-medium">{formatarValor(fatura.valor_juros)}</span>
                                </div>
                            )}

                            <Separator />

                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold">TOTAL</span>
                                <span className="text-lg font-bold text-primary">
                                    {formatarValor(fatura.valor_total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Observações */}
                    {fatura.observacoes && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-2">Observações</h4>
                                <p className="text-sm text-muted-foreground">{fatura.observacoes}</p>
                            </div>
                        </>
                    )}

                    {/* Ações */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Fechar
                        </Button>
                        <Button onClick={handleDownloadPDF}>
                            <Download className="h-4 w-4 mr-2" />
                            Baixar PDF
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
