/**
 * Dialog: Editar Convênio
 * Edita dados básicos do convênio
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';

interface DialogEditarConvenioProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    convenioId: string;
    tipoConvenio: 'pre-pago' | 'pos-pago';
    convenioAtual: {
        nome_empresa: string;
        razao_social: string;
        categoria: string;
        contato_nome: string;
        contato_email: string;
        contato_telefone: string;
        endereco_completo?: string;
        observacoes?: string;
    };
    planoAtual?: {
        dia_vencimento_pagamento?: number;
        dia_fechamento?: number;
        dia_vencimento_pos_pago?: number;
    };
    onSuccess: () => void;
}

export function DialogEditarConvenio({
    open,
    onOpenChange,
    convenioId,
    tipoConvenio,
    convenioAtual,
    planoAtual,
    onSuccess,
}: DialogEditarConvenioProps) {
    const [loading, setLoading] = useState(false);

    // Form fields - Convenio
    const [nomeEmpresa, setNomeEmpresa] = useState('');
    const [razaoSocial, setRazaoSocial] = useState('');
    const [categoria, setCategoria] = useState('');
    const [contatoNome, setContatoNome] = useState('');
    const [contatoEmail, setContatoEmail] = useState('');
    const [contatoTelefone, setContatoTelefone] = useState('');
    const [endereco, setEndereco] = useState('');
    const [observacoes, setObservacoes] = useState('');

    // Form fields - Plan dates
    const [diaVencimento, setDiaVencimento] = useState('');
    const [diaFechamento, setDiaFechamento] = useState('');

    // Pre-populate form when dialog opens
    useEffect(() => {
        if (open && convenioAtual) {
            setNomeEmpresa(convenioAtual.nome_empresa || '');
            setRazaoSocial(convenioAtual.razao_social || '');
            setCategoria(convenioAtual.categoria || '');
            setContatoNome(convenioAtual.contato_nome || '');
            setContatoEmail(convenioAtual.contato_email || '');
            setContatoTelefone(convenioAtual.contato_telefone || '');
            setEndereco(convenioAtual.endereco_completo || '');
            setObservacoes(convenioAtual.observacoes || '');

            // Plan dates
            if (planoAtual) {
                if (tipoConvenio === 'pre-pago') {
                    setDiaVencimento(planoAtual.dia_vencimento_pagamento?.toString() || '');
                } else {
                    setDiaFechamento(planoAtual.dia_fechamento?.toString() || '');
                    setDiaVencimento(planoAtual.dia_vencimento_pos_pago?.toString() || '');
                }
            }
        }
    }, [open, convenioAtual, planoAtual, tipoConvenio]);

    const handleSubmit = async () => {
        if (!nomeEmpresa || !razaoSocial || !categoria || !contatoNome || !contatoEmail || !contatoTelefone) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        try {
            setLoading(true);

            // Update convenio data
            const updates = {
                nome_empresa: nomeEmpresa,
                razao_social: razaoSocial,
                categoria,
                contato_nome: contatoNome,
                contato_email: contatoEmail,
                contato_telefone: contatoTelefone,
                endereco_completo: endereco || undefined,
                observacoes: observacoes || undefined,
            };

            await api.updateConvenio(convenioId, updates);

            // Update plan dates if changed
            if (planoAtual && (diaVencimento || diaFechamento)) {
                const planoUpdates: any = {};

                if (tipoConvenio === 'pre-pago' && diaVencimento) {
                    planoUpdates.dia_vencimento_pagamento = parseInt(diaVencimento);
                } else if (tipoConvenio === 'pos-pago') {
                    if (diaFechamento) planoUpdates.dia_fechamento = parseInt(diaFechamento);
                    if (diaVencimento) planoUpdates.dia_vencimento_pos_pago = parseInt(diaVencimento);
                }

                if (Object.keys(planoUpdates).length > 0) {
                    console.log('📤 ENVIANDO ATUALIZAÇÃO DE PLANO:', {
                        convenioId,
                        tipoConvenio,
                        planoUpdates,
                        keys: Object.keys(planoUpdates)
                    });
                    await api.updateConvenioPlano(convenioId, planoUpdates);
                    console.log('✅ ATUALIZAÇÃO DE PLANO CONCLUÍDA');
                }
            }

            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            console.error('Erro:', error);
            alert(error.message || 'Erro ao atualizar convênio');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Convênio</DialogTitle>
                    <DialogDescription>
                        Atualize os dados cadastrais do convênio
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="nome_empresa">
                            Nome da Empresa <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="nome_empresa"
                            value={nomeEmpresa}
                            onChange={(e) => setNomeEmpresa(e.target.value)}
                            placeholder="Ex: Empresa LTDA"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="razao_social">
                            Razão Social <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="razao_social"
                            value={razaoSocial}
                            onChange={(e) => setRazaoSocial(e.target.value)}
                            placeholder="Ex: Empresa LTDA"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="categoria">
                            Categoria <span className="text-red-500">*</span>
                        </Label>
                        <Select value={categoria} onValueChange={setCategoria}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="funcionarios">Funcionários</SelectItem>
                                <SelectItem value="clientes">Clientes</SelectItem>
                                <SelectItem value="fornecedores">Fornecedores</SelectItem>
                                <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="contato_nome">
                            Nome do Contato <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="contato_nome"
                            value={contatoNome}
                            onChange={(e) => setContatoNome(e.target.value)}
                            placeholder="Nome completo"
                        />
                    </div>

                    {/* Billing Dates Section */}
                    {planoAtual && (
                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-semibold mb-3 text-sm">Datas de Faturamento</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {tipoConvenio === 'pre-pago' ? (
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
                                        <p className="text-xs text-muted-foreground">
                                            Dia do mês para vencimento da mensalidade
                                        </p>
                                    </div>
                                ) : (
                                    <>
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
                                            <p className="text-xs text-muted-foreground">
                                                Dia para fechar e abrir nova fatura
                                            </p>
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
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="contato_email">
                            Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="contato_email"
                            type="email"
                            value={contatoEmail}
                            onChange={(e) => setContatoEmail(e.target.value)}
                            placeholder="email@empresa.com"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="contato_telefone">
                            Telefone <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="contato_telefone"
                            value={contatoTelefone}
                            onChange={(e) => setContatoTelefone(e.target.value)}
                            placeholder="(00) 00000-0000"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="endereco">Endereço Completo</Label>
                        <Textarea
                            id="endereco"
                            value={endereco}
                            onChange={(e) => setEndereco(e.target.value)}
                            placeholder="Rua, número, bairro, cidade, estado"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="observacoes">Observações</Label>
                        <Textarea
                            id="observacoes"
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            placeholder="Informações adicionais"
                        />
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
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
