import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    ArrowUpCircle,
    ArrowDownCircle,
    Wallet,
    Calculator,
    Clock,
    Car,
    FileText,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SangriaSuprimentoDialog } from '@/components/cash/SangriaSuprimentoDialog';
import { DialogFechamento } from '@/components/cash/DialogFechamento';
import { OpenCashRegisterDialog } from '@/components/OpenCashRegisterDialog';

interface ShiftOperationsProps {
    onSessionClose?: () => void;
}

export const ShiftOperations = ({ onSessionClose }: ShiftOperationsProps) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const { toast } = useToast();
    const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
    const [txType, setTxType] = useState<'sangria' | 'suprimento'>('sangria');
    const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
    const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get<any>('/cash-register/summary');
            setData(res);
        } catch (error: any) {
            console.error('Error fetching summary:', error);
            // We don't toast 404 here because it might just mean the cash is closed
            if (error.status === 404 || error.message?.includes('404')) {
                setData(null);
            } else {
                toast({
                    title: 'Erro ao carregar resumo',
                    description: error.message || 'Erro de conexão',
                    variant: 'destructive'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleTxSuccess = () => {
        setIsTxDialogOpen(false);
        fetchData();
    };

    const handleCloseSuccess = () => {
        setIsCloseDialogOpen(false);
        fetchData();
        if (onSessionClose) onSessionClose();
    };

    const handleOpenSuccess = () => {
        setIsOpenDialogOpen(false);
        fetchData();
    };

    if (loading) return <div className="p-8 text-center bg-card rounded-lg border border-dashed">Carregando resumo financeiro...</div>;

    if (!data) return (
        <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="max-w-xs">
                    <h3 className="font-bold text-lg">Caixa Fechado</h3>
                    <p className="text-sm text-muted-foreground mb-4">Não há um turno aberto no momento. Abra o caixa para gerenciar operações.</p>
                    <Button onClick={() => setIsOpenDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 w-full">
                        <DollarSign className="mr-2 h-4 w-4" /> Abrir Caixa
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const { session, totals, stats } = data;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Info Bar */}
            <Card className="border-l-4 border-l-blue-500 overflow-hidden">
                <CardContent className="py-4 flex flex-wrap gap-8 items-center text-sm bg-blue-50/30">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold">Abertura:</span>
                        <span>{format(new Date(session.opened_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold">Operador:</span>
                        <span>{session.operator_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold">Status:</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">Aberto</span>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <Button onClick={() => setIsOpenDialogOpen(true)} variant="outline" size="sm" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50" disabled={!!session}>
                            <DollarSign className="mr-2 h-4 w-4" /> Abrir Caixa
                        </Button>
                        <Button onClick={() => setIsCloseDialogOpen(true)} variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                            <Calculator className="mr-2 h-4 w-4" /> Finalizar Turno
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Main Grid */}
            <div className="grid md:grid-cols-4 gap-6">
                <Card className="shadow-sm border-gray-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo Inicial</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ {totals.saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">Fundo de reserva</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-emerald-100 bg-emerald-50/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Total Entradas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">R$ {(totals.receitas + totals.suprimentos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] text-emerald-600/70 mt-1 font-medium">Receitas + Suprimentos</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-rose-100 bg-rose-50/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-rose-700 uppercase tracking-wider">Total Saídas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600">R$ {totals.sangrias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] text-rose-600/70 mt-1 font-medium">Total de Sangrias</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-600 text-white border-none shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium opacity-80 uppercase tracking-wider">Saldo em Caixa</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">R$ {totals.saldoFinalEsperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        <p className="text-[10px] opacity-70 mt-1 font-medium">Estimativa atual</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Operations */}
                <Card className="shadow-sm border-gray-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Wallet className="h-5 w-5 text-blue-500" />
                            Ações de Caixa
                        </CardTitle>
                        <CardDescription>Movimentações avulsas durante o turno</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className="h-28 flex-col gap-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all border-dashed"
                            onClick={() => { setTxType('sangria'); setIsTxDialogOpen(true); }}
                        >
                            <ArrowDownCircle className="h-8 w-8" />
                            <span className="font-bold">Sangria</span>
                            <span className="text-[10px] opacity-70">Saída de valor</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-28 flex-col gap-2 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all border-dashed"
                            onClick={() => { setTxType('suprimento'); setIsTxDialogOpen(true); }}
                        >
                            <ArrowUpCircle className="h-8 w-8" />
                            <span className="font-bold">Suprimento</span>
                            <span className="text-[10px] opacity-70">Aporte de valor</span>
                        </Button>
                    </CardContent>
                </Card>

                {/* Categories Summary */}
                <Card className="shadow-sm border-gray-100">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Calculator className="h-5 w-5 text-blue-500" />
                            Faturamento por Categoria
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-md">
                            <span className="text-sm font-medium">Mensalistas</span>
                            <span className="font-bold">R$ {totals.porCategoria.mensalista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-md">
                            <span className="text-sm font-medium">Avulsos</span>
                            <span className="font-bold">R$ {totals.porCategoria.avulso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-md">
                            <span className="text-sm font-medium">Convênios</span>
                            <span className="font-bold">R$ {totals.porCategoria.convenio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 px-3 mt-4 border-t-2 border-primary/10">
                            <span className="font-bold text-primary">Total em Operações</span>
                            <span className="font-black text-primary text-xl">R$ {totals.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Statistics Section */}
            <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                    Indicadores do Turno
                </h3>
                <div className="grid md:grid-cols-4 gap-6">
                    <Card className="border-none bg-blue-50/40 shadow-none">
                        <CardContent className="pt-6 text-center">
                            <div className="bg-white h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <Car className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="text-2xl font-black text-blue-700">{stats.totalVeiculos}</div>
                            <div className="text-[11px] font-bold text-blue-600/70 uppercase tracking-tighter">Veículos</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none bg-emerald-50/40 shadow-none">
                        <CardContent className="pt-6 text-center">
                            <div className="bg-white h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <DollarSign className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="text-2xl font-black text-emerald-700">R$ {stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <div className="text-[11px] font-bold text-emerald-600/70 uppercase tracking-tighter">Ticket Médio</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none bg-indigo-50/40 shadow-none">
                        <CardContent className="pt-6 text-center">
                            <div className="bg-white h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <Clock className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div className="text-2xl font-black text-indigo-700">
                                {Math.floor(stats.tempoMedio / 60)}h {Math.round(stats.tempoMedio % 60)}m
                            </div>
                            <div className="text-[11px] font-bold text-indigo-600/70 uppercase tracking-tighter">Permanência</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none bg-amber-50/40 shadow-none">
                        <CardContent className="pt-6 text-center">
                            <div className="bg-white h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <ArrowUpCircle className="h-5 w-5 text-amber-500" />
                            </div>
                            <div className="text-2xl font-black text-amber-700">{stats.picoMovimento}</div>
                            <div className="text-[11px] font-bold text-amber-600/70 uppercase tracking-tighter">Pico (Horas)</div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <SangriaSuprimentoDialog
                isOpen={isTxDialogOpen}
                onClose={() => setIsTxDialogOpen(false)}
                type={txType}
                sessionId={session.id}
                onSuccess={handleTxSuccess}
            />

            <DialogFechamento
                isOpen={isCloseDialogOpen}
                onClose={() => setIsCloseDialogOpen(false)}
                summaryData={data}
                onSuccess={handleCloseSuccess}
            />

            <OpenCashRegisterDialog
                open={isOpenDialogOpen}
                onOpenChange={setIsOpenDialogOpen}
                onSuccess={handleOpenSuccess}
            />
        </div>
    );
};
