// ============================================
// ARQUIVO: backend/src/controllers/cashRegisterController.js
// VERSÃO: 2.0 - Usando funções utilitárias globais
// ============================================

import {
  supabase,
  getScopedSupabaseClient,
  getAuthenticatedUser
} from '../config/supabase.js';

import { logEvent } from '../services/auditLogger.js';
import { triggerCashRegisterOpened } from '../services/webhookService.js';
import reportGenerationService from '../services/reportGenerationService.js';

/**
 * Cash Register Controller
 * Handles cash register opening and closing operations
 */

/**
 * Internal Helper to get report data
 * VERSÃO 2.0: Agora aceita cliente escopado como parâmetro
 */
async function _getReportDataInternal(id, scopedClient = null) {
  // Use o cliente fornecido ou fallback para global (queries públicas)
  const client = scopedClient || supabase;

  const { data: session, error: sessionError } = await client
    .from('cash_register_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (sessionError || !session) return null;

  const startTime = session.opened_at;
  const endTime = session.is_open ? new Date().toISOString() : session.closed_at;

  const { data: payments } = await client
    .from('payments')
    .select('*')
    .gte('date', startTime)
    .lte('date', endTime);

  const { data: transactions } = await client
    .from('cash_transactions')
    .select('*')
    .eq('session_id', id);

  const { data: tickets } = await client
    .from('tickets')
    .select('*')
    .gte('exit_time', startTime)
    .lte('exit_time', endTime)
    .eq('status', 'closed');

  const { data: company } = await client
    .from('company_config')
    .select('*')
    .eq('id', 'default')
    .single();

  const totals = {
    saldoInicial: Number(session.opening_amount),
    receitas: (payments || []).reduce((sum, p) => sum + Number(p.value), 0),
    suprimentos: (transactions || []).filter(t => t.type === 'suprimento').reduce((sum, t) => sum + Number(t.amount), 0),
    sangrias: (transactions || []).filter(t => t.type === 'sangria').reduce((sum, t) => sum + Number(t.amount), 0),
    porMetodo: (payments || []).reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + Number(p.value);
      return acc;
    }, {}),
    porCategoria: {
      mensalista: (payments || []).filter(p => p.target_type === 'monthly_customer').reduce((sum, p) => sum + Number(p.value), 0),
      avulso: (tickets || []).filter(t => !t.metadata?.isConvenio).reduce((sum, t) => sum + Number(t.amount), 0),
      convenio: (tickets || []).filter(t => t.metadata?.isConvenio).reduce((sum, t) => sum + Number(t.amount), 0)
    }
  };

  totals.saldoFinalEsperado = totals.saldoInicial + totals.receitas + totals.suprimentos - totals.sangrias;

  const stats = {
    totalVeiculos: tickets?.length || 0,
    ticketMedio: tickets?.length > 0 ? (tickets.reduce((sum, t) => sum + Number(t.amount), 0) / tickets.length) : 0,
    tempoMedio: tickets?.length > 0 ? (tickets.reduce((sum, t) => sum + (t.duration_minutes || 0), 0) / tickets.length) : 0,
    picoMovimento: 'N/A'
  };

  if (tickets && tickets.length > 0) {
    const hours = tickets.map(t => new Date(t.entry_time).getHours());
    const counts = hours.reduce((acc, h) => { acc[h] = (acc[h] || 0) + 1; return acc; }, {});
    const peakHour = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    stats.picoMovimento = `${peakHour}:00 - ${Number(peakHour) + 1}:00`;
  }

  return { session, payments, transactions, tickets, company, totals, stats };
}

export default {
  /**
   * Open Cash Register
   * POST /api/cash-register/open
   */
  async open(req, res) {
    try {
      console.log('[Cash Register] Iniciando abertura de caixa');

      // 1. Autenticar usuário
      const user = await getAuthenticatedUser(req);
      console.log(`[Cash Register] Usuário autenticado: ${user.id}`);

      // 2. Obter cliente escopado
      const scopedSupabase = getScopedSupabaseClient(req);

      const { openingAmount, operatorName, openedAt } = req.body;

      // 3. Validações
      if (typeof openingAmount !== 'number' || openingAmount < 0) {
        return res.status(400).json({ error: 'Valor de abertura inválido' });
      }

      if (!operatorName || operatorName.trim() === '') {
        return res.status(400).json({ error: 'Nome do operador é obrigatório' });
      }

      // 4. Verificar se já existe caixa aberto
      console.log(`[Cash Register] Verificando caixa aberto para operador: ${user.id}`);

      const { data: openSession, error: checkError } = await scopedSupabase
        .from('cash_register_sessions')
        .select('id, opened_at, operator_name')
        .is('closed_at', null)  // ✅ CORRETO: usa .is() para NULL
        .eq('operator_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('[Cash Register] Erro ao verificar caixa aberto:', checkError);
      }

      if (openSession) {
        console.log(`[Cash Register] Caixa já está aberto: ${openSession.id}`);
        return res.status(400).json({
          error: 'Caixa já está aberto',
          session: openSession
        });
      }

      // 5. Criar nova sessão
      console.log('[Cash Register] Criando nova sessão de caixa');

      const { data: session, error: insertError } = await scopedSupabase
        .from('cash_register_sessions')
        .insert({
          opening_amount: openingAmount,
          operator_id: user.id,  // ✅ Corresponde a auth.uid()
          operator_name: operatorName.trim(),
          is_open: true,
          closed_at: null,
          opened_at: openedAt || new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Cash Register] ❌ Erro ao inserir sessão:', insertError);
        console.error('[Cash Register] Código:', insertError.code);
        console.error('[Cash Register] Detalhes:', insertError.details);
        console.error('[Cash Register] Mensagem:', insertError.message);

        return res.status(500).json({
          error: insertError.message,
          code: insertError.code,
          details: insertError.details
        });
      }

      console.log(`[Cash Register] ✅ Caixa aberto com sucesso: ${session.id}`);

      // 6. Log de auditoria
      await logEvent({
        userId: user.id,
        userLogin: user.email || user.id,
        action: 'cash_register.opened',
        targetType: 'cash_register_session',
        targetId: session.id,
        details: { openingAmount, operatorName: operatorName.trim() }
      });

      // 7. Trigger webhook
      try {
        await triggerCashRegisterOpened(session);
      } catch (webhookError) {
        console.warn('[Cash Register] Webhook falhou:', webhookError.message);
        // Não bloqueia a resposta se webhook falhar
      }

      res.status(201).json({ success: true, session });
    } catch (error) {
      console.error('[Cash Register] ❌ Exceção ao abrir caixa:', error);
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code
      });
    }
  },

  /**
   * Get Current Session Summary
   * GET /api/cash-register/summary
   */
  async getSummary(req, res) {
    try {
      console.log('[Cash Register] Buscando resumo do caixa');

      // 1. Autenticar usuário
      const user = await getAuthenticatedUser(req);
      console.log(`[Cash Register] Buscando resumo para operador: ${user.id}`);

      // 2. Obter cliente escopado
      const scopedSupabase = getScopedSupabaseClient(req);

      // 3. Buscar sessão aberta
      const { data: session, error: sessionError } = await scopedSupabase
        .from('cash_register_sessions')
        .select('*')
        .is('closed_at', null)  // ✅ CORRETO
        .eq('operator_id', user.id)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) {
        console.error('[Cash Register] Erro ao buscar sessão:', sessionError);
        return res.status(500).json({ error: sessionError.message });
      }

      // 4. Retornar resposta apropriada
      if (!session) {
        console.log('[Cash Register] Nenhum caixa aberto');
        return res.status(200).json({
          hasOpenCashRegister: false,
          message: 'Nenhum caixa aberto'
        });
      }

      console.log(`[Cash Register] Caixa aberto encontrado: ${session.id}`);

      // 5. Buscar dados do relatório
      const statsData = await _getReportDataInternal(session.id, scopedSupabase);

      res.json({
        ...statsData,
        hasOpenCashRegister: true
      });
    } catch (error) {
      console.error('[Cash Register] ❌ Exceção ao buscar resumo:', error);
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code
      });
    }
  },

  /**
   * Close Cash Register
   * POST /api/cash-register/close
   */
  async close(req, res) {
    try {
      console.log('[Cash Register] Iniciando fechamento de caixa');

      const { actualAmount, notes } = req.body;

      // 1. Autenticar usuário
      const user = await getAuthenticatedUser(req);
      console.log(`[Cash Register] Fechando caixa para operador: ${user.id}`);

      // 2. Obter cliente escopado
      const scopedSupabase = getScopedSupabaseClient(req);

      // 3. Buscar sessão aberta
      const { data: session, error: sessError } = await scopedSupabase
        .from('cash_register_sessions')
        .select('*')
        .is('closed_at', null)  // ✅ CORRETO
        .eq('operator_id', user.id)
        .single();

      if (sessError || !session) {
        console.error('[Cash Register] Caixa aberto não encontrado:', sessError);
        return res.status(404).json({ error: 'Caixa aberto não encontrado' });
      }

      console.log(`[Cash Register] Fechando sessão: ${session.id}`);

      // 4. Calcular valores
      const data = await _getReportDataInternal(session.id, scopedSupabase);
      const expectedAmount = data.totals.saldoFinalEsperado;
      const difference = actualAmount - expectedAmount;
      const endTime = new Date().toISOString();

      // 5. Atualizar sessão
      const { data: closedSession, error: updateError } = await scopedSupabase
        .from('cash_register_sessions')
        .update({
          is_open: false,
          closed_at: endTime,
          closing_amount: actualAmount,
          expected_amount: expectedAmount,
          actual_amount: actualAmount,
          difference: difference,
          notes: notes
        })
        .eq('id', session.id)
        .eq('operator_id', user.id)  // ✅ Segurança adicional via RLS
        .select()
        .single();

      if (updateError) {
        console.error('[Cash Register] Erro ao fechar caixa:', updateError);
        return res.status(500).json({ error: updateError.message });
      }

      console.log(`[Cash Register] ✅ Caixa fechado: ${session.id}`);

      // 6. Log de auditoria
      await logEvent({
        userId: user.id,
        userLogin: user.email || user.id,
        action: 'cash_register.closed',
        targetType: 'cash_register_session',
        targetId: session.id,
        details: { expectedAmount, actualAmount, difference }
      });

      res.json({ success: true, session: closedSession });
    } catch (error) {
      console.error('[Cash Register] ❌ Exceção ao fechar caixa:', error);
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code
      });
    }
  },

  /**
   * Add Transaction (Sangria/Suprimento)
   * POST /api/cash-register/transaction
   */
  async addTransaction(req, res) {
    try {
      console.log('[Cash Register] Adicionando transação');

      const { sessionId, type, amount, description } = req.body;

      // 1. Validações
      if (!['sangria', 'suprimento'].includes(type)) {
        return res.status(400).json({ error: 'Tipo inválido' });
      }

      // 2. Autenticar usuário
      const user = await getAuthenticatedUser(req);

      // 3. Obter cliente escopado
      const scopedSupabase = getScopedSupabaseClient(req);

      // 4. Inserir transação
      const { data, error } = await scopedSupabase
        .from('cash_transactions')
        .insert({
          session_id: sessionId,
          type,
          amount,
          description,
          operator_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('[Cash Register] Erro ao inserir transação:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`[Cash Register] ✅ Transação criada: ${data.id}`);

      // 5. Log de auditoria
      await logEvent({
        userId: user.id,
        userLogin: user.email || user.id,
        action: `cash_register.${type}`,
        targetType: 'cash_transaction',
        targetId: data.id,
        details: { amount, description }
      });

      res.status(201).json(data);
    } catch (error) {
      console.error('[Cash Register] ❌ Exceção ao adicionar transação:', error);
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code
      });
    }
  },

  /**
   * List Closings
   * GET /api/cash-register/history
   */
  async history(req, res) {
    try {
      console.log('[Cash Register] Buscando histórico');

      // 1. Autenticar usuário (opcional - depende se quer filtrar por usuário)
      const user = await getAuthenticatedUser(req);

      // 2. Obter cliente escopado
      const scopedSupabase = getScopedSupabaseClient(req);

      // 3. Buscar histórico
      // Opção A: Todos os fechamentos (se RLS SELECT permite)
      const { data, error } = await scopedSupabase
        .from('cash_register_sessions')
        .select('*')
        .not('closed_at', 'is', null)  // ✅ Apenas fechados
        .order('closed_at', { ascending: false });

      // Opção B: Apenas do operador atual (mais restritivo)
      // .eq('operator_id', user.id)

      if (error) {
        console.error('[Cash Register] Erro ao buscar histórico:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`[Cash Register] Histórico encontrado: ${data?.length || 0} registros`);
      res.json(data);
    } catch (error) {
      console.error('[Cash Register] ❌ Exceção ao buscar histórico:', error);
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code
      });
    }
  },

  /**
   * Get Full Report Data for a specific session
   * GET /api/cash-register/report/:id
   */
  async getReportData(req, res) {
    try {
      const { id } = req.params;
      console.log(`[Cash Register] Buscando relatório: ${id}`);

      // 1. Autenticar usuário
      const user = await getAuthenticatedUser(req);

      // 2. Obter cliente escopado
      const scopedSupabase = getScopedSupabaseClient(req);

      // 3. Buscar dados do relatório
      const data = await _getReportDataInternal(id, scopedSupabase);

      if (!data) {
        console.log(`[Cash Register] Relatório não encontrado: ${id}`);
        return res.status(404).json({ error: 'Relatório não encontrado' });
      }

      console.log(`[Cash Register] ✅ Relatório encontrado: ${id}`);
      res.json(data);
    } catch (error) {
      console.error('[Cash Register] ❌ Exceção ao buscar relatório:', error);
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code
      });
    }
  },

  /**
   * Download Report
   * GET /api/cash-register/report/:id/:format
   */
  async downloadReport(req, res) {
    try {
      const { id, format } = req.params;
      console.log(`[Cash Register] Download de relatório: ${id} (${format})`);

      // 1. Autenticar usuário
      const user = await getAuthenticatedUser(req);

      // 2. Obter cliente escopado
      const scopedSupabase = getScopedSupabaseClient(req);

      // 3. Buscar dados
      const data = await _getReportDataInternal(id, scopedSupabase);

      if (!data) {
        return res.status(404).json({ error: 'Relatório não encontrado' });
      }

      let content;
      let contentType;
      const datePart = data.session.closed_at
        ? data.session.closed_at.split('T')[0]
        : new Date().toISOString().split('T')[0];
      let filename = `fechamento_${datePart}`;

      switch (format) {
        case 'pdf':
          content = await reportGenerationService.generatePDF(data);
          contentType = 'application/pdf';
          filename += '.pdf';
          break;
        case 'thermal':
          content = await reportGenerationService.generateThermal(data);
          contentType = 'text/plain';
          filename += '_termico.txt';
          break;
        case 'xml':
          content = await reportGenerationService.generateXML(data);
          contentType = 'application/xml';
          filename += '.xml';
          break;
        default:
          return res.status(400).json({ error: 'Formato inválido' });
      }

      console.log(`[Cash Register] ✅ Relatório gerado: ${filename}`);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      console.error('[Cash Register] ❌ Erro no download:', error);
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code
      });
    }
  },

  /**
   * Get Current Session
   * GET /api/cash-register/current
   */
  async getCurrent(req, res) {
    try {
      console.log('[Cash Register] Buscando sessão atual');

      // 1. Autenticar usuário
      const user = await getAuthenticatedUser(req);

      // 2. Obter cliente escopado
      const scopedSupabase = getScopedSupabaseClient(req);

      // 3. Buscar sessão aberta
      const { data: session, error } = await scopedSupabase
        .from('cash_register_sessions')
        .select('*')
        .is('closed_at', null)  // ✅ CORRETO
        .eq('operator_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[Cash Register] Erro ao buscar sessão atual:', error);
        return res.status(500).json({ error: 'Erro ao buscar estado do caixa' });
      }

      if (!session) {
        console.log('[Cash Register] Nenhuma sessão aberta');
        return res.status(200).json({ isOpen: false, session: null });
      }

      console.log(`[Cash Register] Sessão atual: ${session.id}`);

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
      console.error('[Cash Register] ❌ Exceção ao buscar sessão atual:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Erro interno do servidor',
        code: error.code
      });
    }
  }
};
