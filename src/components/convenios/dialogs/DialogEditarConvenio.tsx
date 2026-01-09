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
    onSuccess: () => void;
}

export function DialogEditarConvenio({
    open,
    onOpenChange,
    convenioId,
    convenioAtual,
    onSuccess,
}: DialogEditarConvenioProps) {
    const [loading, setLoading] = useState(false);

    // Form fields
    const [nomeEmpresa, setNomeEmpresa] = useState('');
    const [razaoSocial, setRazaoSocial] = useState('');
    const [categoria, setCategoria] = useState('');
    const [contatoNome, setContatoNome] = useState('');
    const [contatoEmail, setContatoEmail] = useState('');
    const [contatoTelefone, setContatoTelefone] = useState('');
    const [endereco, setEndereco] = useState('');
    const [observacoes, setObservacoes] = useState('');

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
        }
    }, [open, convenioAtual]);

    const handleSubmit = async () => {
        if (!nomeEmpresa || !razaoSocial || !categoria || !contatoNome || !contatoEmail || !contatoTelefone) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        try {
            setLoading(true);

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
