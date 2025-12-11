import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Calendar, CheckSquare, Square } from 'lucide-react';
import { format, subMonths, startOfMonth, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthCheckboxCalendarProps {
    dueDate: string; // Próximo vencimento (YYYY-MM-DD)
    monthlyValue: number; // Valor da mensalidade
    selectedMonths: string[]; // Array de meses selecionados (formato: "YYYY-MM")
    onMonthsChange: (months: string[]) => void;
}

export function MonthCheckboxCalendar({
    dueDate,
    monthlyValue,
    selectedMonths,
    onMonthsChange,
}: MonthCheckboxCalendarProps) {
    const [availableMonths, setAvailableMonths] = useState<string[]>([]);

    // Calcular meses disponíveis baseado no próximo vencimento
    useEffect(() => {
        if (!dueDate) {
            setAvailableMonths([]);
            return;
        }

        try {
            const due = parseISO(dueDate);
            const lastPaidMonth = subMonths(startOfMonth(due), 1); // Mês anterior ao vencimento
            const months: string[] = [];

            // Gerar últimos 12 meses (ou menos se vencimento for próximo)
            for (let i = 0; i < 12; i++) {
                const month = subMonths(lastPaidMonth, i);
                const today = new Date();

                // Só incluir meses passados
                if (isBefore(month, startOfMonth(today))) {
                    months.unshift(format(month, 'yyyy-MM'));
                }
            }

            setAvailableMonths(months);
        } catch (error) {
            console.error('Error calculating available months:', error);
            setAvailableMonths([]);
        }
    }, [dueDate]);

    // Agrupar meses por ano
    const monthsByYear = availableMonths.reduce((acc, month) => {
        const year = month.split('-')[0];
        if (!acc[year]) acc[year] = [];
        acc[year].push(month);
        return acc;
    }, {} as Record<string, string[]>);

    // Toggle individual month
    const toggleMonth = (month: string) => {
        if (selectedMonths.includes(month)) {
            onMonthsChange(selectedMonths.filter(m => m !== month));
        } else {
            onMonthsChange([...selectedMonths, month].sort());
        }
    };

    // Marcar todos os meses
    const selectAll = () => {
        onMonthsChange([...availableMonths]);
    };

    // Desmarcar todos os meses
    const deselectAll = () => {
        onMonthsChange([]);
    };

    // Formatar mês para exibição (ex: "Jan", "Fev")
    const formatMonthName = (monthStr: string) => {
        try {
            const date = parseISO(`${monthStr}-01`);
            return format(date, 'MMM', { locale: ptBR });
        } catch {
            return monthStr;
        }
    };

    // Calcular total
    const totalValue = selectedMonths.length * monthlyValue;

    if (availableMonths.length === 0) {
        return (
            <div className="bg-muted/30 rounded-lg p-4 text-center text-sm text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Defina o próximo vencimento para ver os meses disponíveis</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 bg-gradient-to-r from-primary/5 to-transparent border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">Histórico de Pagamentos Anteriores</h4>
            </div>

            <p className="text-sm text-muted-foreground">
                Marque os meses que <span className="font-medium">JÁ foram pagos</span> antes do cadastro no sistema:
            </p>

            {/* Calendário de meses por ano */}
            <div className="space-y-4">
                {Object.entries(monthsByYear).reverse().map(([year, months]) => (
                    <div key={year}>
                        <p className="text-sm font-medium text-muted-foreground mb-2">{year}</p>
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                            {months.map((month) => {
                                const isSelected = selectedMonths.includes(month);
                                return (
                                    <button
                                        key={month}
                                        type="button"
                                        onClick={() => toggleMonth(month)}
                                        className={`
                      flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                      transition-all border-2
                      ${isSelected
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background hover:bg-muted border-border hover:border-primary/50'
                                            }
                    `}
                                    >
                                        {isSelected ? (
                                            <CheckSquare className="h-3 w-3" />
                                        ) : (
                                            <Square className="h-3 w-3" />
                                        )}
                                        {formatMonthName(month)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2 pt-2 border-t">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    disabled={selectedMonths.length === availableMonths.length}
                >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Marcar Todos
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deselectAll}
                    disabled={selectedMonths.length === 0}
                >
                    <Square className="h-4 w-4 mr-2" />
                    Desmarcar Todos
                </Button>
            </div>

            {/* Totalizador */}
            <div className="bg-muted/50 rounded-md p-3 space-y-1">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meses selecionados:</span>
                    <span className="font-medium">{selectedMonths.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor por mês:</span>
                    <span className="font-medium">R$ {monthlyValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold pt-2 border-t">
                    <span>Total a registrar:</span>
                    <span className="text-primary">R$ {totalValue.toFixed(2)}</span>
                </div>
            </div>

            {selectedMonths.length > 0 && (
                <p className="text-xs text-muted-foreground italic">
                    💡 Estes pagamentos serão registrados como "importação inicial" e não afetarão os relatórios financeiros atuais.
                </p>
            )}
        </div>
    );
}
