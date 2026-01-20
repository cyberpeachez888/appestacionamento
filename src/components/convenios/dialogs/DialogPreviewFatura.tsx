/**
 * Dialog: Preview de Fatura
 * Exibe preview detalhado da fatura antes da geração oficial
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
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface DialogPreviewFaturaProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    convenioId: string;
    convenioNome: string;
    onSuccess: () => void;
}

interface PreviewData {
    convenio: {
        id: string;
        nome_empresa: string;
        email: string;
    };
    plano: {
        num_vagas_contratadas: number;
        valor_mensal: number;
        porcentagem_desconto?: number;
        dia_vencimento: number;
    };
    periodo: {
        texto: string;
        dataInicio: string | null;
        dataFim: string | null;
    };
    itens: {
        mensalidade: {
            descricao: string;
            valorBase: number;
            desconto: number;
            valorFinal: number;
        };
        vagasExtrasPagas: {
            quantidade: number;
            valorUnitario: number;
            valorTotal: number;
            detalhes: Array<{
                placa: string;
                dataEntrada: string;
                dataSaida: string;
                valor: number;
            }>;
        };
        vagasExtrasCortesia: {
            quantidade: number;
            detalhes: Array<{
                placa: string;
                dataEntrada: string;
                dataSaida: string;
            }>;
        };
    };
    totais: {
        subtotal: number;
        desconto: number;
        vagasExtras: number;
        total: number;
    };
    proximoVencimento: string;
}

export function DialogPreviewFatura({
    open,
    onOpenChange,
    convenioId,
    convenioNome,
    onSuccess,
}: DialogPreviewFaturaProps) {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);

    // Form fields
    const [emailDestino, setEmailDestino] = useState('');
    const [dataVencimento, setDataVencimento] = useState('');
    const [observacoes, setObservacoes] = useState('');

    // Fetch preview data when dialog opens
    useEffect(() => {
        if (open && convenioId) {
            fetchPreview();
        } else {
            // Reset when dialog closes
            setPreviewData(null);
            setError('');
            setEmailDestino('');
            setDataVencimento('');
            setObservacoes('');
        }
    }, [open, convenioId]);

    // Auto-fill email and due date when preview loads
    useEffect(() => {
        if (previewData) {
            setEmailDestino(previewData.convenio.email);
            setDataVencimento(previewData.proximoVencimento);
        }
    }, [previewData]);

    async function fetchPreview() {
        setLoading(true);
        setError('');

        try {
            const response: any = await api.get(`/convenios/${convenioId}/fatura/preview`);

            if (!response.success) {
                throw new Error(response.error || 'Erro ao carregar preview');
            }

            setPreviewData(response.data);
        } catch (err: any) {
            console.error('Erro ao buscar preview:', err);
            setError(err.message || 'Erro ao carregar preview da fatura');
        } finally {
            setLoading(false);
        }
    }

    async function handleGerarFatura() {
        // Validações
        if (!emailDestino.trim()) {
            setError('Email de destino é obrigatório');
            return;
        }

        if (!dataVencimento) {
            setError('Data de vencimento é obrigatória');
            return;
        }

        setGenerating(true);
        setError('');

        try {
            const response: any = await api.post(`/convenios/${convenioId}/fatura/gerar`, {
                emailDestino,
                dataVencimento,
                observacoes: observacoes.trim() || undefined,
            });

            if (!response.success) {
                throw new Error(response.error?.message || response.error || 'Erro ao gerar fatura');
            }

            // Success!
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error('Erro ao gerar fatura:', err);
            setError(err.message || 'Erro ao gerar fatura. Tente novamente');
        } finally {
            setGenerating(false);
        }
    }

    function formatarMoeda(valor: number): string {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(valor || 0);
    }

    function formatarData(data: string): string {
        if (!data) return '-';
        const date = new Date(data + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Preview da Fatura
                    </DialogTitle>
                    <DialogDescription>
                        Revise os detalhes antes de gerar a fatura oficial
                    </DialogDescription>
                </DialogHeader>

                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {!loading && previewData && (
                    <div className="space-y-6">
                        {/* Período */}
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <h3 className="font-semibold text-lg mb-2">Período de Referência</h3>
                            <p className="text-2xl font-bold text-primary">
                                {previewData.periodo.texto}
                            </p>
                        </div>

                        {/* Mensalidade */}
                        <div>
                            <h3 className="font-semibold mb-3">MENSALIDADE</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        {previewData.itens.mensalidade.descricao}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Valor base:</span>
                                    <span className="font-medium">
                                        {formatarMoeda(previewData.itens.mensalidade.valorBase)}
                                    </span>
                                </div>
                                {previewData.itens.mensalidade.desconto > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>
                                            Desconto{' '}
                                            {previewData.plano.porcentagem_desconto
                                                ? `(${previewData.plano.porcentagem_desconto}%)`
                                                : ''}:
                                        </span>
                                        <span className="font-medium">
                                            - {formatarMoeda(previewData.itens.mensalidade.desconto)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between font-semibold text-base pt-2 border-t">
                                    <span>Valor final:</span>
                                    <span>{formatarMoeda(previewData.itens.mensalidade.valorFinal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Vagas Extras Pagas */}
                        {previewData.itens.vagasExtrasPagas.quantidade > 0 && (
                            <div>
                                <h3 className="font-semibold mb-3">
                                    VAGAS EXTRAS PAGAS ({previewData.itens.vagasExtrasPagas.quantidade})
                                </h3>
                                <div className="space-y-1 text-sm">
                                    {previewData.itens.vagasExtrasPagas.detalhes.map((vaga, idx) => (
                                        <div key={idx} className="flex justify-between py-1">
                                            <span className="text-muted-foreground">
                                                • {vaga.placa} - {formatarData(vaga.dataEntrada)}
                                            </span>
                                            <span className="font-medium">
                                                {formatarMoeda(vaga.valor)}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between font-semibold pt-2 border-t">
                                        <span>Total:</span>
                                        <span>
                                            {formatarMoeda(previewData.itens.vagasExtrasPagas.valorTotal)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Vagas Extras Cortesia */}
                        {previewData.itens.vagasExtrasCortesia.quantidade > 0 && (
                            <div>
                                <h3 className="font-semibold mb-3">
                                    VAGAS EXTRAS CORTESIA ({previewData.itens.vagasExtrasCortesia.quantidade})
                                </h3>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                    {previewData.itens.vagasExtrasCortesia.detalhes.map((vaga, idx) => (
                                        <div key={idx}>
                                            • {vaga.placa} - {formatarData(vaga.dataEntrada)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Totais */}
                        <div className="bg-primary/5 p-4 rounded-lg space-y-2">
                            <div className="flex justify-between text-lg font-bold">
                                <span>TOTAL:</span>
                                <span className="text-primary text-2xl">
                                    {formatarMoeda(previewData.totais.total)}
                                </span>
                            </div>
                        </div>

                        {/* Form fields */}
                        <div className="space-y-4 pt-4 border-t">
                            <div>
                                <Label htmlFor="email">Email de Destino *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={emailDestino}
                                    onChange={(e) => setEmailDestino(e.target.value)}
                                    placeholder="financeiro@empresa.com"
                                />
                            </div>

                            <div>
                                <Label htmlFor="vencimento">Data de Vencimento *</Label>
                                <Input
                                    id="vencimento"
                                    type="date"
                                    value={dataVencimento}
                                    onChange={(e) => setDataVencimento(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="obs">Observações (opcional)</Label>
                                <Textarea
                                    id="obs"
                                    value={observacoes}
                                    onChange={(e) => setObservacoes(e.target.value)}
                                    placeholder="Informações adicionais para a fatura..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={generating}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleGerarFatura}
                        disabled={loading || generating || !previewData}
                    >
                        {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Gerar Fatura
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
