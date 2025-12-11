/**
 * Dialog: Novo Convênio
 * Multi-step form para criar novo convênio
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
import { Checkbox } from '@/components/ui/checkbox';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface DialogNovoConvenioProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function DialogNovoConvenio({ open, onOpenChange, onSuccess }: DialogNovoConvenioProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Passo 1: Dados da Empresa
    const [nomeEmpresa, setNomeEmpresa] = useState('');
    const [razaoSocial, setRazaoSocial] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [categoria, setCategoria] = useState('');
    const [endereco, setEndereco] = useState('');
    const [observacoes, setObservacoes] = useState('');

    // Passo 2: Contato
    const [contatoNome, setContatoNome] = useState('');
    const [contatoEmail, setContatoEmail] = useState('');
    const [contatoTelefone, setContatoTelefone] = useState('');

    // Passo 3: Plano
    const [tipoConvenio, setTipoConvenio] = useState('');
    const [numVagas, setNumVagas] = useState('');
    const [numVagasReservadas, setNumVagasReservadas] = useState('');
    const [valorMensal, setValorMensal] = useState('');
    const [diaVencimento, setDiaVencimento] = useState('');
    const [permiteVagasExtras, setPermiteVagasExtras] = useState(false);
    const [valorVagaExtra, setValorVagaExtra] = useState('');

    // Passo 4: Contrato
    const [dataInicio, setDataInicio] = useState('');
    const [dataVencimentoContrato, setDataVencimentoContrato] = useState('');

    const resetForm = () => {
        setStep(1);
        setNomeEmpresa('');
        setRazaoSocial('');
        setCnpj('');
        setCategoria('');
        setEndereco('');
        setObservacoes('');
        setContatoNome('');
        setContatoEmail('');
        setContatoTelefone('');
        setTipoConvenio('');
        setNumVagas('');
        setNumVagasReservadas('');
        setValorMensal('');
        setDiaVencimento('');
        setPermiteVagasExtras(false);
        setValorVagaExtra('');
        setDataInicio('');
        setDataVencimentoContrato('');
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const payload = {
                nome_empresa: nomeEmpresa,
                razao_social: razaoSocial,
                cnpj,
                tipo_convenio: tipoConvenio,
                categoria,
                data_inicio: dataInicio,
                data_vencimento_contrato: dataVencimentoContrato || undefined,
                contato_nome: contatoNome,
                contato_email: contatoEmail,
                contato_telefone: contatoTelefone,
                endereco_completo: endereco || undefined,
                observacoes: observacoes || undefined,
                plano: {
                    tipo_plano: 'padrao',
                    num_vagas_contratadas: parseInt(numVagas),
                    num_vagas_reservadas: parseInt(numVagasReservadas) || 0,
                    valor_mensal: parseFloat(valorMensal),
                    dia_vencimento_pagamento: parseInt(diaVencimento),
                    permite_vagas_extras: permiteVagasExtras,
                    valor_vaga_extra: permiteVagasExtras ? parseFloat(valorVagaExtra) : undefined,
                },
            };

            const response = await fetch(`${API_URL}/convenios`, {
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
                alert(error.error || 'Erro ao criar convênio');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao criar convênio');
        } finally {
            setLoading(false);
        }
    };

    const canGoNext = () => {
        if (step === 1) {
            return nomeEmpresa && razaoSocial && cnpj && categoria;
        }
        if (step === 2) {
            return contatoNome && contatoEmail && contatoTelefone;
        }
        if (step === 3) {
            return tipoConvenio && numVagas && valorMensal && diaVencimento;
        }
        if (step === 4) {
            return dataInicio;
        }
        return false;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Convênio - Passo {step} de 4</DialogTitle>
                    <DialogDescription>
                        {step === 1 && 'Dados da empresa'}
                        {step === 2 && 'Informações de contato'}
                        {step === 3 && 'Configuração do plano'}
                        {step === 4 && 'Dados do contrato'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Passo 1: Dados da Empresa */}
                    {step === 1 && (
                        <>
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
                                <Label htmlFor="cnpj">
                                    CNPJ <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="cnpj"
                                    value={cnpj}
                                    onChange={(e) => setCnpj(e.target.value)}
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="categoria">
                                    Categoria <span className="text-red-500">*</span>
                                </Label>
                                <Select value={categoria} onValueChange={setCategoria}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione" />
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
                        </>
                    )}

                    {/* Passo 2: Contato */}
                    {step === 2 && (
                        <>
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
                        </>
                    )}

                    {/* Passo 3: Plano */}
                    {step === 3 && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="tipo_convenio">
                                    Tipo de Convênio <span className="text-red-500">*</span>
                                </Label>
                                <Select value={tipoConvenio} onValueChange={setTipoConvenio}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pre-pago">Pré-pago (Mensalidade Fixa)</SelectItem>
                                        <SelectItem value="pos-pago">Pós-pago (Por Uso)</SelectItem>
                                    </SelectContent>
                                </Select>
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
                        </>
                    )}

                    {/* Passo 4: Contrato */}
                    {step === 4 && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="data_inicio">
                                    Data de Início <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="data_inicio"
                                    type="date"
                                    value={dataInicio}
                                    onChange={(e) => setDataInicio(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="data_vencimento_contrato">
                                    Data de Vencimento do Contrato (Opcional)
                                </Label>
                                <Input
                                    id="data_vencimento_contrato"
                                    type="date"
                                    value={dataVencimentoContrato}
                                    onChange={(e) => setDataVencimentoContrato(e.target.value)}
                                />
                            </div>

                            <div className="bg-muted p-4 rounded-lg">
                                <h4 className="font-semibold mb-2">Resumo do Convênio</h4>
                                <dl className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Empresa:</dt>
                                        <dd className="font-medium">{nomeEmpresa}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Tipo:</dt>
                                        <dd className="font-medium capitalize">{tipoConvenio}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Vagas:</dt>
                                        <dd className="font-medium">{numVagas}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Valor Mensal:</dt>
                                        <dd className="font-medium">
                                            R$ {parseFloat(valorMensal || '0').toFixed(2)}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    {step > 1 && (
                        <Button variant="outline" onClick={() => setStep(step - 1)}>
                            Voltar
                        </Button>
                    )}
                    {step < 4 ? (
                        <Button onClick={() => setStep(step + 1)} disabled={!canGoNext()}>
                            Próximo
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={!canGoNext() || loading}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {loading ? 'Salvando...' : 'Criar Convênio'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
