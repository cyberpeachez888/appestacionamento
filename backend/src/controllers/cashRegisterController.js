import { supabase } from '../config/supabase.js';
import { logEvent } from '../services/auditLogger.js';
import { triggerCashRegisterOpened } from '../services/webhookService.js';

/**
 * Cash Register Controller
 * Handles cash register opening and closing operations
 */

export default {
  /**
   * Open Cash Register
   * POST /api/cash-register/open
   *
   * Body: {
   *   openingAmount: number,
   *   operatorName?: string
   * }
   */
  async open(req, res) {
    try {
      const user = req.user; // From auth middleware
      if (!user) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const { openingAmount, operatorName } = req.body;

      // Validações
      if (typeof openingAmount !== 'number' || openingAmount < 0) {
        return res.status(400).json({ error: 'Valor de abertura inválido. Deve ser um número maior ou igual a zero.' });
      }

      if (!operatorName || operatorName.trim() === '') {
        return res.status(400).json({ error: 'Nome do operador é obrigatório' });
      }

      // Verificar se já existe uma sessão aberta
      const { data: openSession, error: checkError } = await supabase
        .from('cash_register_sessions')
        .select('id, opened_at, operator_name')
        .eq('is_open', true)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Erro ao verificar sessão aberta:', checkError);
        return res.status(500).json({ error: 'Erro ao verificar estado do caixa' });
      }

      if (openSession) {
        return res.status(400).json({
          error: 'Caixa já está aberto',
          details: {
            openedAt: openSession.opened_at,
            operator: openSession.operator_name
          }
        });
      }

      // Criar nova sessão
      const { data: session, error: insertError } = await supabase
        .from('cash_register_sessions')
        .insert({
          opening_amount: openingAmount,
          operator_id: user.id,
          operator_name: operatorName.trim(),
          is_open: true,
          opened_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao abrir caixa:', insertError);
        return res.status(500).json({ error: 'Erro ao abrir caixa no banco de dados' });
      }

      // Registrar evento de auditoria
      try {
        await logEvent({
          userId: user.id,
          userLogin: user.login,
          userName: user.name,
          action: 'cash_register.opened',
          targetType: 'cash_register_session',
          targetId: session.id,
          details: {
            openingAmount,
            operatorName: operatorName.trim()
          }
        });
      } catch (auditError) {
        console.error('Erro ao registrar auditoria:', auditError);
        // Não falha a operação se auditoria falhar
      }

      // Trigger webhook se configurado
      try {
        await triggerCashRegisterOpened({
          userId: user.id,
          userName: user.name,
          openingBalance: openingAmount,
          openedAt: session.opened_at
        });
      } catch (webhookError) {
        console.error('Erro ao disparar webhook:', webhookError);
        // Não falha a operação se webhook falhar
      }

      res.status(201).json({
        success: true,
        session: {
          id: session.id,
          openedAt: session.opened_at,
          openingAmount: session.opening_amount,
          operatorName: session.operator_name
        }
      });
    } catch (error) {
      console.error('Erro inesperado ao abrir caixa:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  /**
   * Get Current Session
   * GET /api/cash-register/current
   */
  async getCurrent(req, res) {
    try {
      const { data: session, error } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .eq('is_open', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar sessão atual:', error);
        return res.status(500).json({ error: 'Erro ao buscar estado do caixa' });
      }

      if (!session) {
        return res.status(200).json({ isOpen: false, session: null });
      }

      res.status(200).json({
        isOpen: true,
        session: {
          id: session.id,
          openedAt: session.opened_at,
          openingAmount: session.opening_amount,
          operatorName: session.operator_name,
          operatorId: session.operator_id
        }
      });
    } catch (error) {
      console.error('Erro inesperado ao buscar sessão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

