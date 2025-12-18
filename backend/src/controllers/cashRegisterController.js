import { supabase } from '../config/supabase.js';
import { logEvent } from '../services/auditLogger.js';
import { triggerCashRegisterOpened } from '../services/webhookService.js';
import reportGenerationService from '../services/reportGenerationService.js';

/**
 * Cash Register Controller
 * Handles cash register opening and closing operations
 */

export default {
  /**
   * Open Cash Register
   * POST /api/cash-register/open
   */
  async open(req, res) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Não autorizado' });

      const { openingAmount, operatorName, openedAt } = req.body;

      if (typeof openingAmount !== 'number' || openingAmount < 0) {
        return res.status(400).json({ error: 'Valor de abertura inválido' });
      }

      if (!operatorName || operatorName.trim() === '') {
        return res.status(400).json({ error: 'Nome do operador é obrigatório' });
      }

      const { data: openSession, error: checkError } = await supabase
        .from('cash_register_sessions')
        .select('id, opened_at, operator_name')
        .eq('is_open', true)
        .maybeSingle();

      if (openSession) {
        return res.status(400).json({ error: 'Caixa já está aberto' });
      }

      const { data: session, error: insertError } = await supabase
        .from('cash_register_sessions')
        .insert({
          opening_amount: openingAmount,
          operator_id: user.id,
          operator_name: operatorName.trim(),
          is_open: true,
          opened_at: openedAt || new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) return res.status(500).json({ error: insertError.message });

      await logEvent({
        userId: user.id,
        userLogin: user.login,
        action: 'cash_register.opened',
        targetType: 'cash_register_session',
        targetId: session.id,
        details: { openingAmount, operatorName: operatorName.trim() }
      });

      res.status(201).json({ success: true, session });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get Current Session Summary
   * GET /api/cash-register/summary
   */
  async getSummary(req, res) {
    try {
      const { data: session, error: sessionError } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .eq('is_open', true)
        .maybeSingle();

      if (sessionError) return res.status(500).json({ error: sessionError.message });
      if (!session) return res.status(404).json({ error: 'Nenhum caixa aberto' });

      const statsData = await this._getReportDataInternal(session.id);
      res.json(statsData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Close Cash Register
   * POST /api/cash-register/close
   */
  async close(req, res) {
    try {
      const { actualAmount, notes } = req.body;

      const { data: session, error: sessError } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .eq('is_open', true)
        .single();

      if (sessError || !session) return res.status(404).json({ error: 'Caixa aberto não encontrado' });

      const data = await this._getReportDataInternal(session.id);
      const expectedAmount = data.totals.saldoFinalEsperado;
      const difference = actualAmount - expectedAmount;
      const endTime = new Date().toISOString();

      const { data: closedSession, error: updateError } = await supabase
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
        .select()
        .single();

      if (updateError) return res.status(500).json({ error: updateError.message });

      await logEvent({
        userId: req.user.id,
        userLogin: req.user.login,
        action: 'cash_register.closed',
        targetType: 'cash_register_session',
        targetId: session.id,
        details: { expectedAmount, actualAmount, difference }
      });

      res.json({ success: true, session: closedSession });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Add Transaction (Sangria/Suprimento)
   * POST /api/cash-register/transaction
   */
  async addTransaction(req, res) {
    try {
      const { sessionId, type, amount, description } = req.body;

      if (!['sangria', 'suprimento'].includes(type)) {
        return res.status(400).json({ error: 'Tipo inválido' });
      }

      const { data, error } = await supabase
        .from('cash_transactions')
        .insert({
          session_id: sessionId,
          type,
          amount,
          description,
          operator_id: req.user.id
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      await logEvent({
        userId: req.user.id,
        userLogin: req.user.login,
        action: `cash_register.${type}`,
        targetType: 'cash_transaction',
        targetId: data.id,
        details: { amount, description }
      });

      res.status(201).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * List Closings
   * GET /api/cash-register/history
   */
  async history(req, res) {
    try {
      const { data, error } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .eq('is_open', false)
        .order('closed_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get Full Report Data for a specific session
   * GET /api/cash-register/report/:id
   */
  async getReportData(req, res) {
    try {
      const { id } = req.params;
      const data = await this._getReportDataInternal(id);
      if (!data) return res.status(404).json({ error: 'Relatório não encontrado' });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Internal Helper to get report data
   */
  async _getReportDataInternal(id) {
    const { data: session, error: sessionError } = await supabase
      .from('cash_register_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) return null;

    const startTime = session.opened_at;
    const endTime = session.is_open ? new Date().toISOString() : session.closed_at;

    const { data: payments } = await supabase.from('payments').select('*').gte('date', startTime).lte('date', endTime);
    const { data: transactions } = await supabase.from('cash_transactions').select('*').eq('session_id', id);
    const { data: tickets } = await supabase.from('tickets').select('*').gte('exit_time', startTime).lte('exit_time', endTime).eq('status', 'closed');
    const { data: company } = await supabase.from('company_config').select('*').eq('id', 'default').single();

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
  },

  /**
   * Download Report
   * GET /api/cash-register/report/:id/:format
   */
  async downloadReport(req, res) {
    try {
      const { id, format } = req.params;
      const data = await this._getReportDataInternal(id);
      if (!data) return res.status(404).json({ error: 'Relatório não encontrado' });

      let content;
      let contentType;
      const datePart = data.session.closed_at ? data.session.closed_at.split('T')[0] : new Date().toISOString().split('T')[0];
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

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: error.message });
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

      if (error && error.code !== 'PGRST116') return res.status(500).json({ error: 'Erro ao buscar estado do caixa' });

      if (!session) return res.status(200).json({ isOpen: false, session: null });

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
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};
