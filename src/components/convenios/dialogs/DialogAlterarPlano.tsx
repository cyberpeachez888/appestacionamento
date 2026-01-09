/**
 * Dialog: Alterar Plano
 * Altera o plano ativo do convênio
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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, ArrowLeftRight } from 'lucide-react';
import { api } from '@/lib/api';

interface DialogAlterarPlanoProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    convenioId: string;
    tipoConvenio: 'pre-pago' | 'pos-pago';
    planoAtual: {
        num_vagas_contratadas: number;
        num_vagas_reservadas: number;
        valor_mensal: number;
        dia_vencimento_pagamento: number;
        permite_vagas_extras: boolean;
        valor_vaga_extra?: number;
        porcentagem_desconto?: number;
    } | null;
    onSuccess: () => void;
}

export function DialogAlterarPlano({
    open,
    onOpenChange,
    convenioId,
    tipoConvenio,
    planoAtual,
    onSuccess,
}: DialogAlterarPlanoProps) {
    const [loading, setLoading] = useState(false);
    const isPrePago = tipoConvenio === 'pre-pago';

    // Form fields
    const [tipoPlanoSelecionado, setTipoPlanoSelecionado] = useState<'pre-pago' | 'pos-pago'>(tipoConvenio);
    const [numVagas, setNumVagas] = useState('');
    const [numVagasReservadas, setNumVagasReservadas] = useState('');
    const [valorMensal, setValorMensal] = useState('');
    const [diaVencimento, setDiaVencimento] = useState('');
    const [diaFechamento, setDiaFechamento] = useState('');
    const [permiteVagasExtras, setPermiteVagasExtras] = useState(false);
    const [cobrancaVagaExtra, setCobrancaVagaExtra] = useState<'gratis' | 'paga'>('gratis');
    const [valorVagaExtra, setValorVagaExtra] = useState('');
    const [porcentagemDesconto, setPorcentagemDesconto] = useState('');

    // Pre-populate form when dialog opens
    useEffect(() => {
        if (open && planoAtual) {
            setTipoPlanoSelecionado(tipoConvenio);
            setNumVagas(planoAtual.num_vagas_contratadas?.toString() || '');
            setNumVagasReservadas(planoAtual.num_vagas_reservadas?.toString() || '0');
            setValorMensal(planoAtual.valor_mensal?.toString() || '');
            setDiaVencimento(planoAtual.dia_vencimento_pagamento?.toString() || '');
            setPermiteVagasExtras(planoAtual.permite_vagas_extras || false);
            const valorExtra = planoAtual.valor_vaga_extra;
            if (valorExtra && parseFloat(valorExtra.toString()) > 0) {
                setCobrancaVagaExtra('paga');
                setValorVagaExtra(valorExtra.toString());
            } else {
                setCobrancaVagaExtra('gratis');
                setValorVagaExtra('');
            }
            setPorcentagemDesconto(planoAtual.porcentagem_desconto?.toString() || '');
        }
    }, [open, planoAtual]);

    const handleSubmit = async () => {
        if (!numVagas || !diaVencimento) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        if (isPrePago && !valorMensal) {
            alert('Valor mensal é obrigatório para convênios pré-pagos');
            return;
        }

        if (!isPrePago && !diaFechamento) {
            alert('Dia de fechamento é obrigatório para convênios pós-pagos');
            return;
        }

        const vagasContratadas = parseInt(numVagas);
        const vagasReservadas = parseInt(numVagasReservadas) || 0;

        if (vagasReservadas > vagasContratadas) {
            alert('Vagas reservadas não pode ser maior que vagas contratadas');
            return;
        }

        try {
            setLoading(true);

            const planoData = {
                tipo_plano: 'padrao',
                num_vagas_contratadas: vagasContratadas,
                num_vagas_reservadas: vagasReservadas,
                valor_mensal: isPrePago ? parseFloat(valorMensal) : null,
                dia_vencimento_pagamento: isPrePago ? parseInt(diaVencimento) : undefined,
                dia_vencimento_pos_pago: !isPrePago ? parseInt(diaVencimento) : undefined,
                dia_fechamento: !isPrePago ? parseInt(diaFechamento) : undefined,
                permite_vagas_extras: permiteVagasExtras,
                valor_vaga_extra: permiteVagasExtras && cobrancaVagaExtra === 'paga' && valorVagaExtra ? parseFloat(valorVagaExtra) : (permiteVagasExtras && cobrancaVagaExtra === 'gratis' ? 0 : undefined),
                porcentagem_desconto: porcentagemDesconto ? parseFloat(porcentagemDesconto) : undefined,
            };

            // Call API to update plan (backend will deactivate old plan and create new one)
            await api.updateConvenioPlano(convenioId, planoData);
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            console.error('Erro:', error);
            alert(error.message || 'Erro ao alterar plano');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Alterar Plano</DialogTitle>
                    <DialogDescription>
                        Modifique o plano contratado do convênio
                    </DialogDescription>
                </DialogHeader>


                <div className="grid gap-4 py-4">
                    {/* Tipo de Plano Selector */}
                    <div className="grid gap-2">
                        <Label htmlFor="tipo_plano">
                            Tipo de Plano <span className="text-red-500">*</span>
                        </Label>
                        <Select value={tipoPlanoSelecionado} onValueChange={(value) => setTipoPlanoSelecionado(value as 'pre-pago' | 'pos-pago')}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pre-pago">Pré-pago (Mensalidade Fixa)</SelectItem>
                                <SelectItem value="pos-pago">Pós-pago (Por Uso)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {tipoPlanoSelecionado === tipoConvenio
                                ? '✓ Mantendo tipo de plano atual'
                                : `⚠️ Alterando de ${tipoConvenio === 'pre-pago' ? 'Pré-pago' : 'Pós-pago'} para ${tipoPlanoSelecionado === 'pre-pago' ? 'Pré-pago' : 'Pós-pago'}`
                            }
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="num_vagas">
                                Vagas Contratadas <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="num_vagas"
                                type="number"
                                value={numVagas}
                                onChange={(e) => setNumVagas(e.target.value)}
                                placeholder="0"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="num_vagas_reservadas">Vagas Reservadas</Label>
                            <Input
                                id="num_vagas_reservadas"
                                type="number"
                                value={numVagasReservadas}
                                onChange={(e) => setNumVagasReservadas(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {tipoPlanoSelecionado === 'pre-pago' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="valor_mensal">
                                    Valor Mensal <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="valor_mensal"
                                    type="number"
                                    step="0.01"
                                    value={valorMensal}
                                    onChange={(e) => setValorMensal(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dia_vencimento">
                                    Dia de Vencimento <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="dia_vencimento"
                                    type="number"
                                    min="1"
                                    max="28"
                                    value={diaVencimento}
                                    onChange={(e) => setDiaVencimento(e.target.value)}
                                    placeholder="1-28"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm border border-blue-200">
                                ℹ️ Valor calculado mensalmente baseado no uso real
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="dia_fechamento">
                                        Dia de Fechamento <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="dia_fechamento"
                                        type="number"
                                        min="1"
                                        max="28"
                                        value={diaFechamento}
                                        onChange={(e) => setDiaFechamento(e.target.value)}
                                        placeholder="1-28"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="dia_vencimento">
                                        Dia de Vencimento <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="dia_vencimento"
                                        type="number"
                                        min="1"
                                        max="28"
                                        value={diaVencimento}
                                        onChange={(e) => setDiaVencimento(e.target.value)}
                                        placeholder="1-28"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="porcentagem_desconto">
                            Desconto Percentual (Opcional)
                        </Label>
                        <Input
                            id="porcentagem_desconto"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={porcentagemDesconto}
                            onChange={(e) => setPorcentagemDesconto(e.target.value)}
                            placeholder="0.00"
                        />
                        <p className="text-xs text-muted-foreground">
                            Desconto aplicado sobre o valor base da fatura (0-100%)
                        </p>
                    </div>

                    {/* Seção de Vagas Extras */}
                    <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="permite_vagas_extras"
                                checked={permiteVagasExtras}
                                onCheckedChange={(checked) => setPermiteVagasExtras(checked as boolean)}
                            />
                            <Label htmlFor="permite_vagas_extras" className="cursor-pointer font-medium">
                                Permitir Vagas Extras
                            </Label>
                        </div>

                        {permiteVagasExtras && (
                            <div className="space-y-3 pl-6 border-l-2 border-blue-300">
                                <p className="text-sm text-muted-foreground">
                                    Configure se as vagas extras serão gratuitas ou terão cobrança adicional
                                </p>

                                <RadioGroup value={cobrancaVagaExtra} onValueChange={(value) => setCobrancaVagaExtra(value as 'gratis' | 'paga')}>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="gratis" id="gratis" />
                                        <Label htmlFor="gratis" className="cursor-pointer font-normal">
                                            Gratuitas (sem cobrança adicional)
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="paga" id="paga" />
                                        <Label htmlFor="paga" className="cursor-pointer font-normal">
                                            Pagas (com cobrança por vaga extra)
                                        </Label>
                                    </div>
                                </RadioGroup>

                                {cobrancaVagaExtra === 'paga' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="valor_vaga_extra">Valor por Vaga Extra <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="valor_vaga_extra"
                                            type="number"
                                            step="0.01"
                                            value={valorVagaExtra}
                                            onChange={(e) => setValorVagaExtra(e.target.value)}
                                            placeholder="0.00"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Este valor será cobrado por cada vaga extra utilizada
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {loading ? 'Salvando...' : 'Salvar Novo Plano'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
