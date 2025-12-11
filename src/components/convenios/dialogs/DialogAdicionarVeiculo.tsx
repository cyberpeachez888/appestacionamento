/**
 * Dialog: Adicionar Veículo
 * Adiciona veículo autorizado ao convênio
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface DialogAdicionarVeiculoProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    convenioId: string;
    onSuccess: () => void;
}

export function DialogAdicionarVeiculo({
    open,
    onOpenChange,
    convenioId,
    onSuccess,
}: DialogAdicionarVeiculoProps) {
    const [loading, setLoading] = useState(false);
    const [placa, setPlaca] = useState('');
    const [modelo, setModelo] = useState('');
    const [cor, setCor] = useState('');
    const [proprietarioNome, setProprietarioNome] = useState('');
    const [proprietarioCpf, setProprietarioCpf] = useState('');
    const [observacoes, setObservacoes] = useState('');

    const resetForm = () => {
        setPlaca('');
        setModelo('');
        setCor('');
        setProprietarioNome('');
        setProprietarioCpf('');
        setObservacoes('');
    };

    const handleSubmit = async () => {
        if (!placa) {
            alert('Placa é obrigatória');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const payload = {
                placa,
                modelo: modelo || undefined,
                cor: cor || undefined,
                proprietario_nome: proprietarioNome || undefined,
                proprietario_cpf: proprietarioCpf || undefined,
                observacoes: observacoes || undefined,
            };

            const response = await fetch(`${API_URL}/convenios/${convenioId}/veiculos`, {
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
                alert(error.error || 'Erro ao adicionar veículo');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao adicionar veículo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Adicionar Veículo</DialogTitle>
                    <DialogDescription>
                        Adicione um novo veículo autorizado ao convênio
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="placa">
                            Placa <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="placa"
                            value={placa}
                            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                            placeholder="ABC1234"
                            maxLength={7}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="modelo">Modelo</Label>
                            <Input
                                id="modelo"
                                value={modelo}
                                onChange={(e) => setModelo(e.target.value)}
                                placeholder="Ex: Civic"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="cor">Cor</Label>
                            <Input
                                id="cor"
                                value={cor}
                                onChange={(e) => setCor(e.target.value)}
                                placeholder="Ex: Prata"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="proprietario_nome">Nome do Proprietário</Label>
                        <Input
                            id="proprietario_nome"
                            value={proprietarioNome}
                            onChange={(e) => setProprietarioNome(e.target.value)}
                            placeholder="Nome completo"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="proprietario_cpf">CPF do Proprietário</Label>
                        <Input
                            id="proprietario_cpf"
                            value={proprietarioCpf}
                            onChange={(e) => setProprietarioCpf(e.target.value)}
                            placeholder="000.000.000-00"
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
                        disabled={!placa || loading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {loading ? 'Salvando...' : 'Adicionar Veículo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
