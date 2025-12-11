/**
 * Audit Service
 * Serviço de auditoria para registro de ações do sistema
 */

import { supabase } from '../config/supabase.js';

const AUDIT_TABLE = 'audit_logs';

/**
 * Registra um evento de auditoria
 * @param {Object} params
 * @param {Object} params.actor - Usuário que realizou a ação
 * @param {string} params.action - Ação realizada (ex: 'user.create')
 * @param {string} params.targetType - Tipo do alvo (ex: 'vehicle')
 * @param {string} params.targetId - ID do alvo
 * @param {Object} params.details - Detalhes adicionais
 */
export async function logEvent({ actor, action, targetType, targetId, details }) {
    try {
        const logData = {
            actor_id: actor?.id || null,
            actor_email: actor?.email || 'system',
            action,
            target_type: targetType,
            target_id: targetId,
            details: details || {},
            ip_address: null, // Pode ser adicionado se passar req
            user_agent: null,  // Pode ser adicionado se passar req
            created_at: new Date().toISOString()
        };

        // Log no console para debug
        console.log(`[AUDIT] ${action} by ${logData.actor_email}`, details);

        // Tentar salvar no banco se a tabela existir
        // Não vamos travar a operação se falhar o log
        const { error } = await supabase
            .from(AUDIT_TABLE)
            .insert(logData);

        if (error) {
            // Silently fail or log error
            console.warn('Falha ao salvar log de auditoria:', error.message);
        }

    } catch (err) {
        console.error('Erro no serviço de auditoria:', err);
    }
}
