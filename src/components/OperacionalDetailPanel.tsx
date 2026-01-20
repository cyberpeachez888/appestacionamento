import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, CreditCard, TrendingUp, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface OperacionalDetailPanelProps {
    vehicle: any;
    rate: any;
    currentValue: number;
    excessHours?: number;
    excessValue?: number;
}

export function OperacionalDetailPanel({
    vehicle,
    rate,
    currentValue,
    excessHours,
    excessValue,
}: OperacionalDetailPanelProps) {
    const { token } = useAuth();
    const [convenioName, setConvenioName] = useState<string>('');
    const [loadingConvenio, setLoadingConvenio] = useState(false);

    if (!vehicle || !rate) return null;

    const isLongTerm = ['Pernoite', 'Semanal', 'Quinzenal', 'Mensal'].includes(rate.rateType);
    const isCompleted = vehicle.status === 'Concluído';
    const isVagaExtra = vehicle.metadata?.isConvenio && vehicle.metadata?.tipoVaga === 'extra';

    // Fetch convenio name if is vaga extra
    useEffect(() => {
        const fetchConvenioName = async () => {
            if (!isVagaExtra || !vehicle.metadata?.convenioId) {
                console.log('[DetailPanel] Não é vaga extra ou sem convenioId:', { isVagaExtra, convenioId: vehicle.metadata?.convenioId });
                return;
            }

            try {
                setLoadingConvenio(true);
                console.log('[DetailPanel] Buscando convênio:', vehicle.metadata.convenioId);

                const response = await fetch(`${API_URL}/convenios/${vehicle.metadata.convenioId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                console.log('[DetailPanel] Response status:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    console.log('[DetailPanel] Dados recebidos:', data);
                    setConvenioName(data.nome_empresa || 'Sem nome');
                } else {
                    console.error('[DetailPanel] Erro HTTP:', response.status);
                    setConvenioName('Erro ao carregar');
                }
            } catch (error) {
                console.error('[DetailPanel] Erro ao buscar convênio:', error);
                setConvenioName('Erro ao carregar');
            } finally {
                setLoadingConvenio(false);
            }
        };

        fetchConvenioName();
    }, [isVagaExtra, vehicle.metadata?.convenioId, token]);

    // Format dates for display
    const entryDate = vehicle.entryDate
        ? format(new Date(vehicle.entryDate), 'dd/MM/yyyy', { locale: ptBR })
        : '';
    const exitDate = vehicle.exitDate
        ? format(new Date(vehicle.exitDate), 'dd/MM/yyyy', { locale: ptBR })
        : '';

    // For long-term rates, calculate date range
    const getDateRange = () => {
        if (!isLongTerm || !vehicle.entryDate) return '';

        const startDate = new Date(vehicle.entryDate);
        const endDate = vehicle.contractedEndDate
            ? new Date(vehicle.contractedEndDate)
            : new Date(startDate.getTime() + (vehicle.contractedDays || 7) * 24 * 60 * 60 * 1000);

        return `${format(startDate, 'dd/MM', { locale: ptBR })} – ${format(endDate, 'dd/MM', { locale: ptBR })}`;
    };

    const getFullStartDateTime = () => {
        if (!vehicle.entryDate || !vehicle.entryTime) return '';
        return `${format(new Date(vehicle.entryDate), 'dd/MM/yyyy', { locale: ptBR })} – ${vehicle.entryTime}`;
    };

    const getFullEndDateTime = () => {
        if (!vehicle.contractedEndDate || !vehicle.contractedEndTime) return '';
        return `${format(new Date(vehicle.contractedEndDate), 'dd/MM/yyyy', { locale: ptBR })} – ${vehicle.contractedEndTime}`;
    };

    const formatExcessHours = () => {
        if (!excessHours || excessHours <= 0) return '0h00';
        const hours = Math.floor(excessHours / 60);
        const minutes = excessHours % 60;
        return `${hours}h${minutes.toString().padStart(2, '0')}`;
    };

    return (
        <div className="mt-4 bg-gradient-to-r from-primary/5 to-transparent border border-primary/20 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-primary flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Detalhes do Registro
            </h3>

            {!isLongTerm ? (
                // Short-term rates (Hora/Fração, Diária)
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Tarifa</p>
                        <p className="font-medium">{rate.rateType}</p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Data
                        </p>
                        <p className="font-medium">{entryDate}</p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Entrada
                        </p>
                        <p className="font-medium">{vehicle.entryTime || '—'}</p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Saída
                        </p>
                        <p className="font-medium">
                            {vehicle.exitTime ? `${exitDate} ${vehicle.exitTime}` : '(não registrada)'}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Preview do valor {isCompleted ? 'final' : 'atual'}</p>
                        <p className="font-bold text-lg text-primary">R$ {currentValue.toFixed(2)}</p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            Forma de Pagamento
                        </p>
                        <p className="font-medium">
                            {vehicle.paymentMethod || '(aguardando saída)'}
                        </p>
                    </div>
                </div>
            ) : (
                // Long-term rates (Pernoite, Semanal, Quinzenal, Mensal)
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Tarifa</p>
                            <p className="font-medium">{rate.rateType}</p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Data
                            </p>
                            <p className="font-medium">{getDateRange()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-primary/10">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Data Início</p>
                            <p className="font-medium">{getFullStartDateTime()}</p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Data Fim (contratada)</p>
                            <p className="font-medium">{getFullEndDateTime()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-primary/10">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Horas excedentes</p>
                            <p className="font-medium text-warning">{formatExcessHours()}</p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Valor base</p>
                            <p className="font-medium">R$ {rate.value.toFixed(2)}</p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Excedentes</p>
                            <p className="font-medium text-warning">R$ {(excessValue || 0).toFixed(2)}</p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Preview do valor total</p>
                            <p className="font-bold text-lg text-primary">R$ {currentValue.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-primary/10">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                Forma de Pagamento
                            </p>
                            <p className="font-medium">
                                {vehicle.paymentMethod || '(aguardando saída)'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* NOVA SEÇÃO: Informações de Vaga Extra */}
            {isVagaExtra && (
                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-900 flex items-center gap-2 mb-3">
                        <Building2 className="h-4 w-4" />
                        Vaga Extra - Convênio
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Convênio</p>
                            <p className="font-medium">
                                {loadingConvenio ? 'Carregando...' : convenioName || 'Não identificado'}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Tipo</p>
                            <Badge
                                variant="secondary"
                                className={
                                    (vehicle.metadata?.valorCobrado || 0) === 0
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-blue-100 text-blue-800'
                                }
                            >
                                {(vehicle.metadata?.valorCobrado || 0) === 0 ? 'Cortesia' : 'Paga'}
                            </Badge>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Valor</p>
                            <p className="font-medium">
                                R$ {(vehicle.metadata?.valorCobrado || 0).toFixed(2)}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Vinculado em</p>
                            <p className="text-sm">
                                {vehicle.metadata?.vinculadoEm
                                    ? format(new Date(vehicle.metadata.vinculadoEm), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                                    : 'Não disponível'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
