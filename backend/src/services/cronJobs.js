/**
 * Cron Jobs Service
 * Agendamento de tarefas automáticas
 */

import cron from 'node-cron';
import { checkVencimentos, checkFaturas } from '../controllers/conveniosJobsController.js';

class CronService {
    constructor() {
        this.jobs = [];
    }

    init() {
        console.log('Inicializando Cron Jobs...');

        // Verificar Vencimentos de Contrato: Todo dia às 08:00
        this.schedule('0 8 * * *', async () => {
            console.log('[Cron] Verificando vencimentos de contrato...');
            try {
                const count = await checkVencimentos();
                console.log(`[Cron] Vencimentos verificados. ${count} notificações geradas.`);
            } catch (error) {
                console.error('[Cron] Erro ao verificar vencimentos:', error);
            }
        });

        // Verificar Faturas Atrasadas: Todo dia às 09:00
        this.schedule('0 9 * * *', async () => {
            console.log('[Cron] Verificando faturas atrasadas...');
            try {
                const count = await checkFaturas();
                console.log(`[Cron] Faturas verificadas. ${count} notificações geradas.`);
            } catch (error) {
                console.error('[Cron] Erro ao verificar faturas:', error);
            }
        });

        console.log(`Cron Jobs inicializados: ${this.jobs.length} tarefas agendadas.`);
    }

    schedule(cronExpression, task) {
        const job = cron.schedule(cronExpression, task, {
            scheduled: true,
            timezone: "America/Sao_Paulo"
        });
        this.jobs.push(job);
    }
}

export default new CronService();
