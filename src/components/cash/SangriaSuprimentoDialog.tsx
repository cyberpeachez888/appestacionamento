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
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    type: 'sangria' | 'suprimento';
    sessionId: string;
    onSuccess: () => void;
}

export const SangriaSuprimentoDialog = ({ isOpen, onClose, type, sessionId, onSuccess }: Props) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) {
            return toast({ title: 'Valor inválido', variant: 'destructive' });
        }

        try {
            setSubmitting(true);
            await api.post('/cash-register/transaction', {
                sessionId,
                type,
                amount: Number(amount),
                description
            });

            toast({
                title: `${type === 'sangria' ? 'Sangria' : 'Suprimento'} realizada`,
                description: `O valor de R$ ${Number(amount).toFixed(2)} foi registrado.`
            });

            setAmount('');
            setDescription('');
            onSuccess();
        } catch (error: any) {
            toast({
                title: 'Erro ao registrar operação',
                description: error.response?.data?.error || 'Tente novamente mais tarde',
                variant: 'destructive'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {type === 'sangria' ? (
                            <><ArrowDownCircle className="h-5 w-5 text-rose-500" /> Registrar Sangria</>
                        ) : (
                            <><ArrowUpCircle className="h-5 w-5 text-emerald-500" /> Registrar Suprimento</>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {type === 'sangria'
                            ? 'Retirada de valores do caixa para despesas ou transferências.'
                            : 'Adição de valores ao caixa para troco ou reforço de saldo.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Valor (R$)</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="desc">Observação / Motivo</Label>
                        <Textarea
                            id="desc"
                            placeholder="Ex: Pagamento de fornecedor, Troco inicial..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className={type === 'sangria' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                            disabled={submitting}
                        >
                            {submitting ? 'Registrando...' : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
