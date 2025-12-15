/**
 * Notificações Controller
 * Gerencia as notificações do usuário/sistema
 */

import { supabase } from '../config/supabase.js';

const NOTIFICACOES_TABLE = 'notificacoes';

export default {
    /**
     * GET /api/notificacoes
     * Lista notificações do usuário (ou globais de sistema)
     */
    async list(req, res) {
        try {
            // Supondo que notificações podem ser globais (sem usuario_id) ou específicas
            // Se tiver autenticação, filtrar pelo usuário ou perfil

            let query = supabase
                .from(NOTIFICACOES_TABLE)
                .select('*')
                .order('data_criacao', { ascending: false })
                .limit(50); // Limitar às últimas 50

            // Se quiser filtrar por lidas/não lidas: req.query.lidas
            if (req.query.unreadOnly === 'true') {
                query = query.eq('lida', false);
            }

            const { data, error } = await query;

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json(data);
        } catch (err) {
            console.error('Erro ao listar notificações:', err);
            res.status(500).json({ error: err.message });
        }
    },

    /**
     * GET /api/notificacoes/count
     * Conta notificações não lidas
     */
    async countUnread(req, res) {
        try {
            const { count, error } = await supabase
                .from(NOTIFICACOES_TABLE)
                .select('*', { count: 'exact', head: true })
                .eq('lida', false);

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json({ count });
        } catch (err) {
            console.error('Erro ao contar notificações:', err);
            res.status(500).json({ error: err.message });
        }
    },

    /**
     * PATCH /api/notificacoes/:id/read
     * Marca notificação como lida
     */
    async markAsRead(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from(NOTIFICACOES_TABLE)
                .update({ lida: true, data_leitura: new Date() })
                .eq('id', id)
                .select();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json(data);
        } catch (err) {
            console.error('Erro ao marcar notificação:', err);
            res.status(500).json({ error: err.message });
        }
    },

    /**
     * PATCH /api/notificacoes/read-all
     * Marca todas como lidas
     */
    async markAllAsRead(req, res) {
        try {
            const { error } = await supabase
                .from(NOTIFICACOES_TABLE)
                .update({ lida: true, data_leitura: new Date() })
                .eq('lida', false);

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json({ message: 'Todas as notificações marcadas como lidas' });
        } catch (err) {
            console.error('Erro ao marcar todas notificações:', err);
            res.status(500).json({ error: err.message });
        }
    }
};
