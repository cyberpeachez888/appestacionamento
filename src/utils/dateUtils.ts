/**
 * Date Utilities for Convenios Billing
 * Handles intelligent date normalization for billing days (1-31)
 */

/**
 * Normaliza um dia de vencimento para um mês específico
 * Se o dia não existe no mês (ex: 31 em fevereiro), usa o último dia válido
 * 
 * @param dayOfMonth - Dia configurado (1-31)
 * @param referenceDate - Data de referência (padrão: hoje)
 * @returns Data válida ajustada para o mês
 * 
 * @example
 * // Fevereiro não tem dia 31 → retorna 28/02
 * normalizeDueDate(31, new Date(2026, 1, 15)) // → 2026-02-28
 * 
 * @example
 * // Janeiro tem dia 31 → retorna 31/01
 * normalizeDueDate(31, new Date(2026, 0, 15)) // → 2026-01-31
 * 
 * @example
 * // Abril só tem 30 dias → retorna 30/04
 * normalizeDueDate(31, new Date(2026, 3, 15)) // → 2026-04-30
 */
export function normalizeDueDate(dayOfMonth: number, referenceDate: Date = new Date()): Date {
    // Validação de entrada
    if (dayOfMonth < 1 || dayOfMonth > 31) {
        throw new Error(`Invalid day: ${dayOfMonth}. Must be between 1 and 31.`);
    }

    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();

    // Descobre o último dia do mês
    // Truque: new Date(year, month + 1, 0) retorna o último dia do mês atual
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    // Se o dia configurado excede o mês, usa o último dia válido
    const normalizedDay = Math.min(dayOfMonth, lastDayOfMonth);

    return new Date(year, month, normalizedDay);
}

/**
 * Formata o dia de vencimento para exibição com indicação de ajuste
 * 
 * @param dayOfMonth - Dia configurado (1-31)
 * @param currentMonth - Mês atual (0-11)
 * @returns String formatada com indicação se foi ajustado
 * 
 * @example
 * formatDueDateDisplay(31, 1) // → "Dia 28 (ajustado de 31)"
 * formatDueDateDisplay(15, 1) // → "Dia 15"
 */
export function formatDueDateDisplay(dayOfMonth: number, currentMonth: number): string {
    const tempDate = new Date(2026, currentMonth, 1);
    const lastDay = new Date(2026, currentMonth + 1, 0).getDate();

    if (dayOfMonth > lastDay) {
        return `Dia ${lastDay} (ajustado de ${dayOfMonth})`;
    }

    return `Dia ${dayOfMonth}`;
}

/**
 * Calcula a próxima data de vencimento baseada no dia configurado
 * Se a data já passou no mês atual, retorna para o próximo mês
 * 
 * @param dayOfMonth - Dia configurado (1-31)
 * @param fromDate - Data de referência (padrão: hoje)
 * @returns Próxima data de vencimento
 * 
 * @example
 * // Hoje é 10/01, vencimento dia 15 → retorna 15/01
 * getNextDueDate(15, new Date(2026, 0, 10)) // → 2026-01-15
 * 
 * @example
 * // Hoje é 20/01, vencimento dia 15 → retorna 15/02 (próximo mês)
 * getNextDueDate(15, new Date(2026, 0, 20)) // → 2026-02-15
 */
export function getNextDueDate(dayOfMonth: number, fromDate: Date = new Date()): Date {
    const normalizedThisMonth = normalizeDueDate(dayOfMonth, fromDate);

    // Se a data de vencimento deste mês já passou, pegar o próximo mês
    if (normalizedThisMonth < fromDate) {
        const nextMonth = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 1);
        return normalizeDueDate(dayOfMonth, nextMonth);
    }

    return normalizedThisMonth;
}

/**
 * Gera um calendário de vencimentos para os próximos N meses
 * Útil para visualização e planejamento
 * 
 * @param dayOfMonth - Dia configurado (1-31)
 * @param monthsAhead - Número de meses para gerar
 * @param startDate - Data de início (padrão: hoje)
 * @returns Array de datas de vencimento
 * 
 * @example
 * // Gerar próximos 12 vencimentos para dia 31
 * generateDueDateCalendar(31, 12)
 * // → [2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30, ...]
 */
export function generateDueDateCalendar(
    dayOfMonth: number,
    monthsAhead: number,
    startDate: Date = new Date()
): Date[] {
    const calendar: Date[] = [];

    for (let i = 0; i < monthsAhead; i++) {
        const targetMonth = new Date(
            startDate.getFullYear(),
            startDate.getMonth() + i,
            1
        );
        calendar.push(normalizeDueDate(dayOfMonth, targetMonth));
    }

    return calendar;
}

/**
 * Verifica se um dia de vencimento será ajustado em algum mês do ano
 * Útil para mostrar avisos ao usuário
 * 
 * @param dayOfMonth - Dia configurado (1-31)
 * @returns true se o dia precisará ser ajustado em algum mês
 * 
 * @example
 * willBeAdjusted(31) // → true (fevereiro, abril, junho, setembro, novembro)
 * willBeAdjusted(28) // → false (todos os meses têm pelo menos 28 dias)
 * willBeAdjusted(30) // → true (fevereiro não tem 30 dias)
 */
export function willBeAdjusted(dayOfMonth: number): boolean {
    if (dayOfMonth <= 28) return false;

    // Verificar todos os meses do ano
    for (let month = 0; month < 12; month++) {
        const lastDay = new Date(2026, month + 1, 0).getDate();
        if (dayOfMonth > lastDay) return true;
    }

    return false;
}

/**
 * Retorna quais meses terão o dia ajustado
 * Útil para feedback detalhado ao usuário
 * 
 * @param dayOfMonth - Dia configurado (1-31)
 * @returns Array com nomes dos meses que terão ajuste
 * 
 * @example
 * getAffectedMonths(31) 
 * // → ['Fevereiro', 'Abril', 'Junho', 'Setembro', 'Novembro']
 */
export function getAffectedMonths(dayOfMonth: number): string[] {
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const affected: string[] = [];

    for (let month = 0; month < 12; month++) {
        const lastDay = new Date(2026, month + 1, 0).getDate();
        if (dayOfMonth > lastDay) {
            affected.push(monthNames[month]);
        }
    }

    return affected;
}
