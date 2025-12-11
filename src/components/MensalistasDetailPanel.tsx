import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, CreditCard, TrendingUp, User, Phone, Car, MapPin, FileText } from 'lucide-react';
import { MonthlyCustomer, Payment } from '@/contexts/ParkingContext';
import { CustomerStatusInfo } from '@/types/mensalistas';

interface MensalistasDetailPanelProps {
    customer: MonthlyCustomer;
    statusInfo: CustomerStatusInfo;
}

export function MensalistasDetailPanel({ customer, statusInfo }: MensalistasDetailPanelProps) {
    // Format payment method
    const formatPaymentMethod = (method: string | undefined): string => {
        if (!method) return '-';
        const methodMap: Record<string, string> = {
            cash: 'Dinheiro',
            pix: 'Pix',
            debit_card: 'Cartão Débito',
            credit_card: 'Cartão Crédito',
            Dinheiro: 'Dinheiro',
            Pix: 'Pix',
            'Cartão Débito': 'Cartão Débito',
            'Cartão Crédito': 'Cartão Crédito',
        };
        return methodMap[method] || method;
    };

    // Sort payment history by date (most recent first)
    const sortedHistory = [...(customer.paymentHistory || [])].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <div className="mt-4 bg-gradient-to-r from-primary/5 to-transparent border border-primary/20 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-primary flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Detalhes do Cliente
            </h3>

            {/* Seção 1: Informações Básicas */}
            <div className="mb-6">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Informações Básicas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Nome</p>
                        <p className="font-medium">{customer.name}</p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            Placa(s)
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {customer.plates.map((plate, idx) => (
                                <span key={idx} className="text-xs bg-muted px-2 py-1 rounded font-medium">
                                    {plate}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Telefone
                        </p>
                        <p className="font-medium">{customer.phone || '—'}</p>
                    </div>

                    {customer.cpf && (
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                CPF
                            </p>
                            <p className="font-medium">{customer.cpf}</p>
                        </div>
                    )}

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Vaga
                        </p>
                        <p className="font-medium">Vaga {customer.parkingSlot}</p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Tipo de Contrato</p>
                        <p className="font-medium">Mensalista</p>
                    </div>
                </div>
            </div>

            {/* Seção 2: Situação Atual */}
            <div className="mb-6 pt-4 border-t border-primary/10">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Situação Atual
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                            {statusInfo.status}
                        </span>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Próximo Vencimento</p>
                        <p className="font-medium">
                            {format(new Date(customer.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Último Pagamento</p>
                        <p className="font-medium">
                            {customer.lastPayment
                                ? format(new Date(customer.lastPayment), 'dd/MM/yyyy', { locale: ptBR })
                                : '—'}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Valor Mensal</p>
                        <p className="font-bold text-lg text-primary">R$ {customer.value.toFixed(2)}</p>
                    </div>

                    {statusInfo.daysOverdue !== undefined && statusInfo.daysOverdue > 0 && (
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Dias de Atraso</p>
                            <p className="font-medium text-destructive">{statusInfo.daysOverdue} dia(s)</p>
                        </div>
                    )}

                    {statusInfo.daysUntilDue !== undefined && statusInfo.daysUntilDue >= 0 && (
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Dias Restantes</p>
                            <p className="font-medium text-success">{statusInfo.daysUntilDue} dia(s)</p>
                        </div>
                    )}

                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Data de Contratação</p>
                        <p className="font-medium">
                            {customer.contractDate
                                ? format(new Date(customer.contractDate), 'dd/MM/yyyy', { locale: ptBR })
                                : '—'}
                        </p>
                    </div>

                    {customer.operatorName && (
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Operador</p>
                            <p className="font-medium">{customer.operatorName}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Seção 3: Histórico de Pagamentos */}
            <div className="pt-4 border-t border-primary/10">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Histórico de Pagamentos
                </h4>

                {sortedHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhum pagamento registrado ainda</p>
                ) : (
                    <>
                        <div className="mb-3 text-sm text-muted-foreground">
                            Total de pagamentos: <span className="font-medium text-foreground">{sortedHistory.length}</span>
                            {' | '}
                            Total acumulado: <span className="font-medium text-primary">R$ {sortedHistory.reduce((sum, p) => sum + p.value, 0).toFixed(2)}</span>
                        </div>

                        <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Data</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Valor</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Método</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Recibo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedHistory.map((payment, idx) => (
                                        <tr key={payment.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                                            <td className="px-3 py-2">
                                                {format(new Date(payment.date), 'dd/MM/yyyy', { locale: ptBR })}
                                            </td>
                                            <td className="px-3 py-2 font-medium">
                                                R$ {payment.value.toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted">
                                                    {formatPaymentMethod(payment.method)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                #{payment.receiptNumber}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
