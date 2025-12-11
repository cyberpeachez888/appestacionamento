export type CustomerStatus =
    | 'Em dia'
    | 'Próximo do vencimento'
    | 'Atrasado'
    | 'Atraso crítico';

export interface CustomerStatusInfo {
    status: CustomerStatus;
    daysOverdue?: number;
    daysUntilDue?: number;
    color: string;
    bgColor: string;
    textColor: string;
}

/**
 * Calcula o status de um cliente mensalista baseado na data de vencimento
 * 
 * NOTA: Os thresholds (5 dias, 30 dias) são placeholders e serão ajustados
 * em uma fase posterior quando as regras de negócio forem definidas.
 */
export function calculateCustomerStatus(dueDate: string): CustomerStatusInfo {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Cliente em atraso
    if (diffDays < 0) {
        const daysOverdue = Math.abs(diffDays);

        // Atraso crítico (placeholder: > 30 dias)
        if (daysOverdue > 30) {
            return {
                status: 'Atraso crítico',
                daysOverdue,
                color: 'destructive',
                bgColor: 'bg-destructive/20',
                textColor: 'text-destructive',
            };
        }

        // Atraso normal
        return {
            status: 'Atrasado',
            daysOverdue,
            color: 'destructive',
            bgColor: 'bg-destructive/10',
            textColor: 'text-destructive',
        };
    }

    // Próximo do vencimento (placeholder: <= 5 dias)
    if (diffDays <= 5) {
        return {
            status: 'Próximo do vencimento',
            daysUntilDue: diffDays,
            color: 'warning',
            bgColor: 'bg-warning/10',
            textColor: 'text-warning',
        };
    }

    // Em dia
    return {
        status: 'Em dia',
        daysUntilDue: diffDays,
        color: 'success',
        bgColor: 'bg-success/10',
        textColor: 'text-success',
    };
}

/**
 * Retorna a cor de fundo da linha baseada no status
 */
export function getRowBackgroundColor(status: CustomerStatus, isSelected: boolean, index: number): string {
    if (isSelected) {
        return 'bg-primary/10 border-l-4 border-primary';
    }

    const baseColor = index % 2 === 0 ? 'bg-background' : 'bg-muted/20';

    switch (status) {
        case 'Próximo do vencimento':
            return `${baseColor} hover:bg-warning/5`;
        case 'Atrasado':
            return `${baseColor} hover:bg-destructive/5`;
        case 'Atraso crítico':
            return `${baseColor} hover:bg-destructive/10`;
        default:
            return `${baseColor} hover:bg-muted/30`;
    }
}
