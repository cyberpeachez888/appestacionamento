/**
 * Dialog: Novo Convênio
 * Multi-step form para criar novo convênio
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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { api } from '@/lib/api';



interface DialogNovoConvenioProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    mode?: 'create' | 'edit';
    convenioId?: string;
    initialData?: {
        nome_empresa: string;
        razao_social: string;
        cnpj: string;
        categoria: string;
        contato_nome: string;
        contato_email: string;
        contato_telefone: string;
        endereco_completo?: string;
        observacoes?: string;
        data_inicio: string;
        data_vencimento_contrato?: string;
        plano?: {
            num_vagas_contratadas: number;
            num_vagas_reservadas: number;
            valor_por_vaga?: number;
            valor_mensal?: number;
            dia_vencimento?: number;
            dia_fechamento?: number;
            permite_vagas_extras: boolean;
            valor_vaga_extra?: number;
            porcentagem_desconto?: number;
        };
    };
}

export function DialogNovoConvenio({ open, onOpenChange, onSuccess, mode = 'create', convenioId, initialData }: DialogNovoConvenioProps) {
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

    // Passo 3: Plano (Convênio Corporativo Unificado)
    const [numVagas, setNumVagas] = useState('');
    const [numVagasReservadas, setNumVagasReservadas] = useState('');
    const [valorPorVaga, setValorPorVaga] = useState(''); // NEW: Price per spot
    const [valorMensal, setValorMensal] = useState('');
    const [permiteVagasExtras, setPermiteVagasExtras] = useState(false);
    const [tipoVagaExtra, setTipoVagaExtra] = useState<'gratis' | 'paga'>('gratis');
    const [maxVagasExtras, setMaxVagasExtras] = useState('');
    const [valorVagaExtra, setValorVagaExtra] = useState('');
    const [diaFechamento, setDiaFechamento] = useState(''); // Closing day  
    const [diaVencimento, setDiaVencimento] = useState(''); // Due day (unified)
    const [porcentagemDesconto, setPorcentagemDesconto] = useState(''); // Discount percentage

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
        setNumVagas('');
        setNumVagasReservadas('');
        setValorPorVaga('');
        setValorMensal('');
        setDiaVencimento('');
        setDiaFechamento('');
        setPermiteVagasExtras(false);
        setValorVagaExtra('');
        setPorcentagemDesconto('');
        setDataInicio('');
        setDataVencimentoContrato('');
    };

    // Pre-populate form in edit mode
    useEffect(() => {
        if (mode === 'edit' && initialData && open) {
            // Step 1
            setNomeEmpresa(initialData.nome_empresa || '');
            setRazaoSocial(initialData.razao_social || '');
            setCnpj(initialData.cnpj || '');
            setCategoria(initialData.categoria || '');
            setEndereco(initialData.endereco_completo || '');
            setObservacoes(initialData.observacoes || '');

            // Step 2
            setContatoNome(initialData.contato_nome || '');
            setContatoEmail(initialData.contato_email || '');
            setContatoTelefone(initialData.contato_telefone || '');

            // Step 3
            if (initialData.plano) {
                setNumVagas(initialData.plano.num_vagas_contratadas?.toString() || '');
                setNumVagasReservadas(initialData.plano.num_vagas_reservadas?.toString() || '0');
                setValorPorVaga(initialData.plano.valor_por_vaga?.toString() || '');
                setValorMensal(initialData.plano.valor_mensal?.toString() || '');
                setDiaVencimento(initialData.plano.dia_vencimento?.toString() || '');
                setDiaFechamento(initialData.plano.dia_fechamento?.toString() || '');
                setPermiteVagasExtras(initialData.plano.permite_vagas_extras || false);
                setValorVagaExtra(initialData.plano.valor_vaga_extra?.toString() || '');
                setPorcentagemDesconto(initialData.plano.porcentagem_desconto?.toString() || '');

                // Detect tipo_vaga_extra based on valor
                if (initialData.plano.permite_vagas_extras) {
                    setTipoVagaExtra(initialData.plano.valor_vaga_extra && parseFloat(initialData.plano.valor_vaga_extra.toString()) > 0 ? 'paga' : 'gratis');
                }
            }

            // Step 4
            setDataInicio(initialData.data_inicio || '');
            setDataVencimentoContrato(initialData.data_vencimento_contrato || '');
        }
    }, [mode, initialData, open]);

    const handleSubmit = async () => {
        try {
            setLoading(true);

            if (mode === 'edit' && convenioId) {
                // Edit mode: Update convenio + plan
                const convenioUpdates = {
                    nome_empresa: nomeEmpresa,
                    razao_social: razaoSocial,
                    cnpj,
                    categoria,
                    data_vencimento_contrato: dataVencimentoContrato || undefined,
                    contato_nome: contatoNome,
                    contato_email: contatoEmail,
                    contato_telefone: contatoTelefone,
                    endereco_completo: endereco || undefined,
                    observacoes: observacoes || undefined,
                };

                const planoUpdates = {
                    num_vagas_contratadas: parseInt(numVagas),
                    num_vagas_reservadas: parseInt(numVagasReservadas) || 0,
                    valor_por_vaga: valorPorVaga ? parseFloat(valorPorVaga) : undefined,
                    valor_mensal: valorMensal ? parseFloat(valorMensal) : null,
                    dia_vencimento: diaVencimento ? parseInt(diaVencimento) : null,
                    dia_fechamento: diaFechamento ? parseInt(diaFechamento) : null,
                    permite_vagas_extras: permiteVagasExtras,
                    valor_vaga_extra: permiteVagasExtras && tipoVagaExtra === 'paga' ? parseFloat(valorVagaExtra) : null,
                    porcentagem_desconto: porcentagemDesconto ? parseFloat(porcentagemDesconto) : null,
                };

                console.log('[DialogNovoConvenio] 📤 Enviando updates:', {
                    convenioId,
                    planoUpdates
                });

                // CRITICAL: Wait for both updates to complete
                const [convenioResponse, planoResponse] = await Promise.all([
                    api.updateConvenio(convenioId, convenioUpdates),
                    api.updateConvenioPlano(convenioId, planoUpdates)
                ]);

                console.log('[DialogNovoConvenio] ✅ Backend responses:', {
                    convenioResponse,
                    planoResponse
                });

                // CRITICAL: Call onSuccess FIRST to trigger parent refetch BEFORE closing dialog
                // This ensures the parent component starts fetching fresh data immediately
                console.log('[DialogNovoConvenio] 🔄 Triggering parent refetch...');
                onSuccess();

                // Small delay to ensure refetch starts before dialog closes
                await new Promise(resolve => setTimeout(resolve, 100));

                // Then close dialog and reset form
                console.log('[DialogNovoConvenio] 🚪 Closing dialog...');
                onOpenChange(false);
                resetForm();
            } else {
                // Create mode
                const payload = {
                    nome_empresa: nomeEmpresa,
                    razao_social: razaoSocial,
                    cnpj,
                    categoria,
                    data_inicio: dataInicio,
                    data_vencimento_contrato: dataVencimentoContrato || undefined,
                    contato_nome: contatoNome,
                    contato_email: contatoEmail,
                    contato_telefone: contatoTelefone,
                    endereco_completo: endereco || undefined,
                    observacoes: observacoes || undefined,
                    plano: {
                        tipo_plano: 'corporativo',
                        num_vagas_contratadas: parseInt(numVagas),
                        num_vagas_reservadas: parseInt(numVagasReservadas) || 0,
                        valor_por_vaga: valorPorVaga ? parseFloat(valorPorVaga) : undefined,
                        valor_mensal: valorMensal ? parseFloat(valorMensal) : null,
                        dia_vencimento: diaVencimento ? parseInt(diaVencimento) : undefined,
                        dia_fechamento: diaFechamento ? parseInt(diaFechamento) : undefined,
                        permite_vagas_extras: permiteVagasExtras,
                        valor_vaga_extra: permiteVagasExtras && tipoVagaExtra === 'paga' ? parseFloat(valorVagaExtra) : undefined,
                        porcentagem_desconto: porcentagemDesconto ? parseFloat(porcentagemDesconto) : undefined,
                    },
                };

                await api.createConvenio(payload);

                // For create mode, keep original order
                onSuccess();
                onOpenChange(false);
                resetForm();
            }
        } catch (error: any) {
            console.error('[DialogNovoConvenio] ❌ Error:', error);
            alert(error.message || `Erro ao ${mode === 'edit' ? 'atualizar' : 'criar'} convênio`);
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
            // Convênio Corporativo requer vagas, vencimento e fechamento
            return numVagas && diaVencimento && diaFechamento;
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
                    <DialogTitle>{mode === 'edit' ? 'Editar' : 'Novo'} Convênio - Passo {step} de 4</DialogTitle>
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

                    {/* Passo 3: Plano - Convênio Corporativo */}
                    {step === 3 && (
                        <>
                            {/* Vagas */}
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

                            {/* Valor por Vaga - applies to both pre and pos */}
                            <div className="grid gap-2">
                                <Label htmlFor="valor_por_vaga">
                                    Valor por Vaga (R$/vaga)
                                </Label>
                                <Input
                                    id="valor_por_vaga"
                                    type="number"
                                    step="0.01"
                                    value={valorPorVaga}
                                    onChange={(e) => setValorPorVaga(e.target.value)}
                                    placeholder="0.00"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Valor unitário por vaga. Usado para calcular o valor total do convênio.
                                </p>
                            </div>

                            {/* Desconto Percentual */}
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
                                    Desconto aplicado sobre o valor integral (0-100%)
                                </p>
                            </div>

                            {/* Preview do Valor Total */}
                            {valorPorVaga && numVagas && (
                                <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                                    <h4 className="font-semibold text-sm text-blue-900 mb-2">Preview do Valor Total</h4>
                                    {(() => {
                                        const vagas = parseInt(numVagas) || 0;
                                        const valorUnitario = parseFloat(valorPorVaga) || 0;
                                        const desconto = parseFloat(porcentagemDesconto) || 0;

                                        const valorIntegral = vagas * valorUnitario;
                                        const valorDesconto = valorIntegral * (desconto / 100);
                                        const valorFinal = valorIntegral - valorDesconto;

                                        return (
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-700">Valor Integral ({vagas} vagas × R$ {valorUnitario.toFixed(2)}):</span>
                                                    <span className="font-semibold text-gray-900">R$ {valorIntegral.toFixed(2)}</span>
                                                </div>
                                                {desconto > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-700">Desconto ({desconto}%):</span>
                                                        <span className="font-semibold text-red-600">- R$ {valorDesconto.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between pt-2 border-t border-blue-300">
                                                    <span className="font-semibold text-blue-900">Valor Final:</span>
                                                    <span className="font-bold text-lg text-blue-900">R$ {valorFinal.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Datas de Fechamento e Vencimento - Convênio Corporativo */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="dia_fechamento">
                                        Dia de Fechamento <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="dia_fechamento"
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={diaFechamento}
                                        onChange={(e) => setDiaFechamento(e.target.value)}
                                        placeholder="1-31"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Data de fechamento do período de cobrança
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
                                        max="31"
                                        value={diaVencimento}
                                        onChange={(e) => setDiaVencimento(e.target.value)}
                                        placeholder="1-31"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        💡 Dias 29-31 serão ajustados para o último dia válido em meses mais curtos
                                    </p>
                                </div>
                            </div>

                            {/* Vagas Extras */}
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
                                <div className="space-y-4 border-l-2 border-blue-200 pl-4">
                                    {/* Tipo de Vaga Extra */}
                                    <div className="grid gap-2">
                                        <Label>Tipo de Vagas Extras <span className="text-red-500">*</span></Label>
                                        <RadioGroup value={tipoVagaExtra} onValueChange={(value) => setTipoVagaExtra(value as 'gratis' | 'paga')}>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="gratis" id="vaga_gratis" />
                                                <Label htmlFor="vaga_gratis" className="cursor-pointer font-normal">
                                                    Vagas Extras Gratuitas
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="paga" id="vaga_paga" />
                                                <Label htmlFor="vaga_paga" className="cursor-pointer font-normal">
                                                    Vagas Extras Pagas
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {/* Quantidade Máxima */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="max_vagas_extras">
                                            Quantidade Máxima de Vagas Extras <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="max_vagas_extras"
                                            type="number"
                                            min="1"
                                            value={maxVagasExtras}
                                            onChange={(e) => setMaxVagasExtras(e.target.value)}
                                            placeholder="Ex: 5"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Limite de vagas extras permitidas além das contratadas
                                        </p>
                                    </div>

                                    {/* Valor (só se paga) */}
                                    {tipoVagaExtra === 'paga' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="valor_vaga_extra">
                                                Valor por Vaga Extra <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="valor_vaga_extra"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={valorVagaExtra}
                                                onChange={(e) => setValorVagaExtra(e.target.value)}
                                                placeholder="0.00"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Valor cobrado por cada vaga extra utilizada
                                            </p>
                                        </div>
                                    )}
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
                                        <dd className="font-medium">Convênio Corporativo</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Vagas:</dt>
                                        <dd className="font-medium">{numVagas}</dd>
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
                            {loading ? 'Salvando...' : (mode === 'edit' ? 'Finalizar' : 'Criar Convênio')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent >
        </Dialog >
    );
}
