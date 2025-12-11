import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, CreditCard, TrendingUp } from 'lucide-react';

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
    if (!vehicle || !rate) return null;

    const isLongTerm = ['Pernoite', 'Semanal', 'Quinzenal', 'Mensal'].includes(rate.rateType);
    const isCompleted = vehicle.status === 'Concluído';

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
        </div>
    );
}
