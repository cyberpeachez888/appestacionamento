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
    const [numVagas, setNumVagas] = useState('');
    const [numVagasReservadas, setNumVagasReservadas] = useState('');
    const [valorMensal, setValorMensal] = useState('');
    const [diaVencimento, setDiaVencimento] = useState('');
    const [diaFechamento, setDiaFechamento] = useState('');
    const [permiteVagasExtras, setPermiteVagasExtras] = useState(false);
    const [valorVagaExtra, setValorVagaExtra] = useState('');
    const [porcentagemDesconto, setPorcentagemDesconto] = useState('');

    // Pre-populate form when dialog opens
    useEffect(() => {
        if (open && planoAtual) {
            setNumVagas(planoAtual.num_vagas_contratadas?.toString() || '');
            setNumVagasReservadas(planoAtual.num_vagas_reservadas?.toString() || '0');
            setValorMensal(planoAtual.valor_mensal?.toString() || '');
            setDiaVencimento(planoAtual.dia_vencimento_pagamento?.toString() || '');
            setPermiteVagasExtras(planoAtual.permite_vagas_extras || false);
            setValorVagaExtra(planoAtual.valor_vaga_extra?.toString() || '');
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
                valor_vaga_extra: permiteVagasExtras && valorVagaExtra ? parseFloat(valorVagaExtra) : undefined,
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

                    {isPrePago ? (
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

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="permite_vagas_extras"
                            checked={permiteVagasExtras}
                            onCheckedChange={(checked) => setPermiteVagasExtras(checked as boolean)}
                        />
                        <Label htmlFor="permite_vagas_extras" className="cursor-pointer">
                            Permite Vagas Extras
                        </Label>
                    </div>

                    {permiteVagasExtras && (
                        <div className="grid gap-2">
                            <Label htmlFor="valor_vaga_extra">Valor por Vaga Extra</Label>
                            <Input
                                id="valor_vaga_extra"
                                type="number"
                                step="0.01"
                                value={valorVagaExtra}
                                onChange={(e) => setValorVagaExtra(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    )}
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
