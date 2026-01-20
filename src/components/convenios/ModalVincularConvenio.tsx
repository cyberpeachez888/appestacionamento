/**
 * Modal: Vincular Convênio
 * Permite vincular registros operacionais (visitantes) a convênios como vagas extras
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Search, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ModalVincularConvenioProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vehicle?: any; // Objeto do veículo (opcional - pode buscar por placa)
    onSuccess: () => void;
}

interface Convenio {
    id: string;
    nome_empresa: string;
    cnpj: string;
    permite_vagas_extras: boolean;
    valor_vaga_extra: number | null;
    vagas_ocupadas: number;
    vagas_contratadas: number;
}

interface RegistroOperacional {
    id: string;
    plate: string;
    vehicleType: string;
    entryDate: string;
    entryTime: string;
    exitDate: string | null;
    exitTime: string | null;
    status: string;
    metadata?: {
        convenioId?: string;
    };
}

export function ModalVincularConvenio({
    open,
    onOpenChange,
    vehicle,
    onSuccess,
}: ModalVincularConvenioProps) {
    const { toast } = useToast();
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [buscandoPlaca, setBuscandoPlaca] = useState(false);
    const [buscandoConvenios, setBuscandoConvenios] = useState(false);

    // Estado do formulário
    const [placa, setPlaca] = useState('');
    const [registro, setRegistro] = useState<RegistroOperacional | null>(null);
    const [convenios, setConvenios] = useState<Convenio[]>([]);
    const [convenioSelecionado, setConvenioSelecionado] = useState<string>('');
    const [tipoVagaExtra, setTipoVagaExtra] = useState<'paga' | 'cortesia'>('cortesia');

    // Reset ao abrir/fechar
    useEffect(() => {
        if (open) {
            setPlaca('');
            setConvenioSelecionado('');
            setTipoVagaExtra('cortesia');

            // Se já tem vehicle prop, usar direto
            if (vehicle) {
                setRegistro(vehicle);
                setPlaca(vehicle.plate || '');
            } else {
                setRegistro(null);
            }

            // Buscar convênios disponíveis
            buscarConvenios();
        }
    }, [open, vehicle]);

    const buscarPorPlaca = async () => {
        if (!placa || placa.length < 7) {
            toast({
                title: 'Placa inválida',
                description: 'Digite uma placa válida (7 caracteres).',
                variant: 'destructive',
            });
            return;
        }

        try {
            setBuscandoPlaca(true);
            const response = await fetch(`${API_URL}/vehicles?plate=${placa.toUpperCase()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Pegar o registro mais recente não vinculado
                const registroNaoVinculado = Array.isArray(data)
                    ? data.find(r => !r.metadata?.convenioId && r.status === 'Em andamento')
                    : data;

                if (registroNaoVinculado) {
                    setRegistro(registroNaoVinculado);
                } else {
                    toast({
                        title: 'Nenhum registro encontrado',
                        description: 'Não há registros em andamento não vinculados para esta placa.',
                        variant: 'destructive',
                    });
                }
            } else {
                toast({
                    title: 'Placa não encontrada',
                    description: 'Nenhum registro encontrado para esta placa.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Erro ao buscar por placa:', error);
            toast({
                title: 'Erro',
                description: 'Erro ao buscar registro.',
                variant: 'destructive',
            });
        } finally {
            setBuscandoPlaca(false);
        }
    };

    const buscarConvenios = async () => {
        try {
            setBuscandoConvenios(true);
            console.log('[ModalVincularConvenio] Token:', token ? 'EXISTE' : 'NÃO EXISTE');
            console.log('[ModalVincularConvenio] Buscando:', `${API_URL}/convenios?status=ativo`);

            const response = await fetch(`${API_URL}/convenios?status=ativo`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            console.log('[ModalVincularConvenio] Status response:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('[ModalVincularConvenio] Convênios recebidos:', data.length);
                console.log('[ModalVincularConvenio] Dados completos:', data);

                // Filtrar apenas convênios que permitem vagas extras
                const conveniosComExtras = data.filter((c: Convenio) => {
                    console.log(`[ModalVincularConvenio] Convênio ${c.nome_empresa}:`, {
                        permite_vagas_extras: c.permite_vagas_extras,
                        tipo: typeof c.permite_vagas_extras,
                        check: c.permite_vagas_extras === true
                    });
                    return c.permite_vagas_extras === true;
                });
                console.log('[ModalVincularConvenio] Convênios com vagas extras:', conveniosComExtras.length);
                setConvenios(conveniosComExtras);
            } else {
                console.error('[ModalVincularConvenio] Erro HTTP:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Erro ao buscar convênios:', error);
        } finally {
            setBuscandoConvenios(false);
        }
    };

    const handleVincular = async () => {
        if (!registro) {
            toast({
                title: 'Registro não encontrado',
                description: 'Busque um registro primeiro.',
                variant: 'destructive',
            });
            return;
        }

        if (!convenioSelecionado) {
            toast({
                title: 'Convênio não selecionado',
                description: 'Selecione um convênio.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/vehicles/${registro.id}/vincular-convenio`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    convenio_id: convenioSelecionado,
                    tipo_vaga_extra: tipoVagaExtra, // 'paga' or 'cortesia'
                }),
            });

            if (response.ok) {
                const selectedConvenio = convenios.find(c => c.id === convenioSelecionado);
                toast({
                    title: 'Vinculação realizada!',
                    description: `Vaga extra vinculada ao convênio ${selectedConvenio?.nome_empresa || ''}`,
                });
                onSuccess();
                onOpenChange(false);
            } else {
                const error = await response.json();
                toast({
                    title: 'Erro ao vincular',
                    description: error.error || 'Não foi possível vincular o registro.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Erro ao vincular:', error);
            toast({
                title: 'Erro',
                description: 'Erro ao processar vinculação.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const convenioInfo = convenios.find(c => c.id === convenioSelecionado);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Vincular a Convênio
                    </DialogTitle>
                    <DialogDescription>
                        Vincule um registro operacional a um convênio como vaga extra
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Busca por placa - só mostrar se NÃO recebeu veículo */}
                    {!vehicle && (
                        <div className="grid gap-2">
                            <Label htmlFor="placa">Placa do Veículo</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="placa"
                                    placeholder="ABC1234"
                                    value={placa}
                                    onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                                    maxLength={7}
                                    className="uppercase"
                                    disabled={buscandoPlaca}
                                />
                                <Button
                                    onClick={buscarPorPlaca}
                                    disabled={buscandoPlaca || placa.length < 7}
                                    variant="outline"
                                >
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Info do registro encontrado */}
                    {registro && (
                        <Alert className="bg-blue-50 border-blue-200">
                            <Check className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                                <strong>Registro encontrado:</strong><br />
                                Placa: {registro.plate} • {registro.vehicleType}<br />
                                Entrada: {new Date(registro.entryDate).toLocaleDateString('pt-BR')} às {registro.entryTime}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Seleção de convênio */}
                    {registro && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="convenio">
                                    Convênio <span className="text-red-500">*</span>
                                </Label>
                                <Select value={convenioSelecionado} onValueChange={setConvenioSelecionado}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um convênio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {buscandoConvenios ? (
                                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                        ) : convenios.length === 0 ? (
                                            <SelectItem value="none" disabled>Nenhum convênio disponível</SelectItem>
                                        ) : (
                                            convenios.map((convenio) => (
                                                <SelectItem key={convenio.id} value={convenio.id}>
                                                    {convenio.nome_empresa} ({convenio.vagas_ocupadas || 0}/{convenio.vagas_contratadas || 0} vagas)
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Info sobre vagas extras do convênio */}
                            {convenioInfo && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Vagas Extras:</strong><br />
                                        {tipoVagaExtra === 'paga' ? (
                                            <>Paga (valor calculado na saída usando tarifa hora/fração)</>
                                        ) : (
                                            <>Cortesia (sem cobrança)</>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Tipo de vaga extra */}
                            <div className="grid gap-2">
                                <Label htmlFor="tipo_vaga_extra">Tipo de Vaga Extra</Label>
                                <Select value={tipoVagaExtra} onValueChange={(v) => setTipoVagaExtra(v as 'paga' | 'cortesia')}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cortesia">Cortesia (R$ 0,00)</SelectItem>
                                        <SelectItem value="paga">Paga (calculado pelo sistema)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Vagas pagas usarão o motor de tarifação hora/fração ao registrar a saída.
                                </p>
                            </div>


                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleVincular}
                        disabled={!registro || !convenioSelecionado || loading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {loading ? 'Vinculando...' : 'Vincular'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
