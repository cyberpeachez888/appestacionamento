import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Calculator, CheckCircle2, AlertTriangle, Printer, Download, FileText, History as HistoryIcon } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    summaryData: any | null;
    onSuccess: () => void;
}

export const DialogFechamento = ({ isOpen, onClose, summaryData, onSuccess }: Props) => {
    const [step, setStep] = useState(1);
    const [actualAmount, setActualAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [closedSession, setClosedSession] = useState<any>(null);
    const [fetchedData, setFetchedData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const currentData = summaryData || fetchedData;

    React.useEffect(() => {
        if (isOpen && !summaryData && !fetchedData) {
            const fetchSummary = async () => {
                try {
                    setLoading(true);
                    const res = await api.get<any>('/cash-register/summary');
                    setFetchedData(res);
                } catch (error: any) {
                    toast({
                        title: 'Erro ao carregar dados',
                        description: error.message || 'Erro de conexão',
                        variant: 'destructive'
                    });
                    onClose();
                } finally {
                    setLoading(false);
                }
            };
            fetchSummary();
        }
    }, [isOpen, summaryData]);

    const handleClose = async () => {
        if (!actualAmount) return;

        try {
            setSubmitting(true);
            const res = await api.post<any>('/cash-register/close', {
                actualAmount: Number(actualAmount),
                notes
            });

            setClosedSession(res.session);
            setStep(3);
            toast({ title: 'Caixa encerrado com sucesso!' });
        } catch (error: any) {
            toast({
                title: 'Erro ao encerrar caixa',
                description: error.message || 'Tente novamente',
                variant: 'destructive'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownload = async (format: 'pdf' | 'xml' | 'thermal') => {
        try {
            const response = await api.get<any>(`/cash-register/report/${closedSession.id}/${format}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `fechamento_${closedSession.id.substring(0, 8)}.${format === 'thermal' ? 'txt' : format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast({ title: 'Erro ao baixar arquivo', variant: 'destructive' });
        }
    };

    if (!isOpen || (loading && !currentData)) return null;
    if (!currentData) return null;

    const difference = Number(actualAmount) - currentData.totals.saldoFinalEsperado;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                {step === 1 && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Encerrar Turno</DialogTitle>
                            <DialogDescription>
                                Confira os valores e informe o montante real em dinheiro no caixa.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="p-4 bg-muted rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Saldo Inicial:</span>
                                    <span className="font-medium">R$ {currentData.totals.saldoInicial.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Receitas do Turno (+):</span>
                                    <span className="font-medium text-emerald-600">R$ {currentData.totals.receitas.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Suprimentos (+):</span>
                                    <span className="font-medium text-emerald-600">R$ {currentData.totals.suprimentos.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Sangrias (-):</span>
                                    <span className="font-medium text-rose-600">R$ {currentData.totals.sangrias.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 font-bold">
                                    <span>Valor Esperado:</span>
                                    <span>R$ {currentData.totals.saldoFinalEsperado.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="actual">Valor Real em Caixa (Dinheiro + Outros)</Label>
                                <Input
                                    id="actual"
                                    type="number"
                                    placeholder="0,00"
                                    value={actualAmount}
                                    onChange={(e) => setActualAmount(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Observações do Fechamento</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Justifique eventuais diferenças..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={onClose}>Cancelar</Button>
                            <Button onClick={() => setStep(2)} disabled={!actualAmount}>Continuar</Button>
                        </DialogFooter>
                    </>
                )}

                {step === 2 && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Confirmar Diferença</DialogTitle>
                        </DialogHeader>
                        <div className="py-6 text-center space-y-4">
                            {difference === 0 ? (
                                <div className="flex flex-col items-center gap-2 text-emerald-600">
                                    <CheckCircle2 className="h-12 w-12" />
                                    <p className="font-bold text-lg">Valores batem perfeitamente!</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-amber-600">
                                    <AlertTriangle className="h-12 w-12" />
                                    <p className="font-bold text-lg">Existe uma diferença de R$ {difference.toFixed(2)}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {difference > 0 ? 'Sobra de caixa detectada.' : 'Falta de caixa detectada.'}
                                    </p>
                                </div>
                            )}
                            <p className="text-sm px-4">Ao confirmar, a sessão será encerrada e o relatório final será gerado. Esta ação não pode ser desfeita.</p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>Voltar</Button>
                            <Button onClick={handleClose} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                                {submitting ? 'Encerrando...' : 'Confirmar e Encerrar'}
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {step === 3 && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Fechamento Concluído</DialogTitle>
                        </DialogHeader>
                        <div className="py-8 text-center space-y-6">
                            <div className="flex flex-col items-center gap-2 text-emerald-600">
                                <CheckCircle2 className="h-16 w-16" />
                                <h3 className="text-xl font-bold">Tudo Pronto!</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-3 px-4">
                                <Button variant="outline" className="flex-col h-20 gap-1" onClick={() => handleDownload('pdf')}>
                                    <Download className="h-5 w-5" />
                                    <span>PDF A4</span>
                                </Button>
                                <Button variant="outline" className="flex-col h-20 gap-1" onClick={() => handleDownload('thermal')}>
                                    <Printer className="h-5 w-5" />
                                    <span>Térmico 80mm</span>
                                </Button>
                                <Button variant="outline" className="flex-col h-20 gap-1" onClick={() => handleDownload('xml')}>
                                    <FileText className="h-5 w-5" />
                                    <span>XML Contábil</span>
                                </Button>
                                <Button variant="outline" className="flex-col h-20 gap-1" onClick={() => { onSuccess(); onClose(); }}>
                                    <HistoryIcon className="h-5 w-5" />
                                    <span>Ver Histórico</span>
                                </Button>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button className="w-full" onClick={() => { onSuccess(); onClose(); }}>Sair</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};
