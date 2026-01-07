import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../services/auditLogger.js';

/**
 * Monthly Reports Controller
 * Handles end-of-month financial cycle closure:
 * - Generates comprehensive monthly financial reports
 * - Archives operational data (tickets, payments)
 * - Clears operational tables to start fresh month
 * - Stores reports in database for long-term access
 */

export default {
  /**
   * Generate Monthly Report
   * POST /api/reports/monthly
   *
   * Body: {
   *   month: number,     // 1-12 (optional, defaults to previous month)
   *   year: number,      // e.g., 2025 (optional, defaults to current year)
   *   clearOperational: boolean  // Whether to clear tickets table (default: true)
   * }
   */
  async generateMonthly(req, res) {
    try {
      const user = req.user; // From auth middleware
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Determine report period
      const now = new Date();
      const requestedMonth = req.body.month || now.getMonth() + 1; // Frontend sends 1-12
      const requestedYear = req.body.year || now.getFullYear();
      const clearOperational = req.body.clearOperational !== false; // Default true

      // Month comes in 1-12 format from frontend
      const reportMonth = requestedMonth;
      const reportYear = requestedYear;

      // Check if report already exists for this period
      const { data: existingReport, error: checkError } = await supabase
        .from('monthly_reports')
        .select('id, generated_at')
        .eq('report_month', reportMonth)
        .eq('report_year', reportYear)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        return res
          .status(500)
          .json({ error: 'Error checking existing reports', details: checkError.message });
      }

      if (existingReport) {
        return res.status(409).json({
          error: 'Report already exists',
          message: `Um relatório para ${reportMonth}/${reportYear} já foi gerado em ${new Date(existingReport.generated_at).toLocaleString('pt-BR')}.`,
          existingReportId: existingReport.id,
        });
      }

      // === STEP 1: Fetch Company Config ===
      const { data: companyConfig, error: companyError } = await supabase
        .from('company_config')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (companyError) {
        console.error('Error fetching company config:', companyError);
      }

      // === STEP 2: Fetch All Payments for the Period ===
      // Month is 1-12, JavaScript Date uses 0-11, so subtract 1
      const startDate = new Date(reportYear, reportMonth - 1, 1, 0, 0, 0).toISOString();
      const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59, 999).toISOString();

      console.log(`📅 Generating report for ${reportMonth}/${reportYear}`);
      console.log(`📅 Date range: ${startDate} to ${endDate}`);
      console.log(`🧹 Clear operational: ${clearOperational}`);

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (paymentsError) {
        return res
          .status(500)
          .json({ error: 'Error fetching payments', details: paymentsError.message });
      }

      console.log(`💰 Found ${payments?.length || 0} payments in period`);

      // === STEP 3: Calculate Financial Summary ===
      const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.value) || 0), 0);

      const avulsosRevenue = payments
        .filter((p) => p.target_type === 'ticket')
        .reduce((sum, p) => sum + (Number(p.value) || 0), 0);

      const mensalistasRevenue = payments
        .filter((p) => p.target_type === 'monthly_customer')
        .reduce((sum, p) => sum + (Number(p.value) || 0), 0);

      // Payment methods breakdown
      const cashTotal = payments
        .filter((p) => p.method === 'cash' || p.method === 'Dinheiro')
        .reduce((sum, p) => sum + (Number(p.value) || 0), 0);

      const pixTotal = payments
        .filter((p) => p.method === 'pix' || p.method === 'Pix')
        .reduce((sum, p) => sum + (Number(p.value) || 0), 0);

      const debitCardTotal = payments
        .filter((p) => p.method === 'debit_card' || p.method === 'Cartão Débito')
        .reduce((sum, p) => sum + (Number(p.value) || 0), 0);

      const creditCardTotal = payments
        .filter((p) => p.method === 'credit_card' || p.method === 'Cartão Crédito')
        .reduce((sum, p) => sum + (Number(p.value) || 0), 0);

      // === STEP 4: Fetch Operational Data ===
      // All tickets for the period
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .gte('entry_time', startDate)
        .lte('entry_time', endDate)
        .order('entry_time', { ascending: true });

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
      }

      console.log(`🎫 Found ${tickets?.length || 0} tickets in period`);

      const totalTickets = tickets?.length || 0;
      const ticketsClosed = tickets?.filter((t) => t.status === 'closed').length || 0;

      // Monthly customers snapshot
      const { data: monthlyCustomers, error: customersError } = await supabase
        .from('monthly_customers')
        .select('*');

      if (customersError) {
        console.error('Error fetching monthly customers:', customersError);
      }

      const monthlyCustomersCount = monthlyCustomers?.length || 0;
      const monthlyPaymentsCount = payments.filter(
        (p) => p.target_type === 'monthly_customer'
      ).length;

      // === STEP 5: Build Comprehensive Report JSON ===
      const reportJson = {
        period: {
          month: reportMonth,
          year: reportYear,
          startDate,
          endDate,
        },
        company: {
          name: companyConfig?.name || 'Estacionamento',
          legalName: companyConfig?.legal_name || '',
          cnpj: companyConfig?.cnpj || '',
          address: companyConfig?.address || '',
          phone: companyConfig?.phone || '',
        },
        operator: {
          id: user.id,
          name: user.name,
          login: user.login,
        },
        financial: {
          totalRevenue,
          avulsosRevenue,
          mensalistasRevenue,
          byPaymentMethod: {
            cash: cashTotal,
            pix: pixTotal,
            debitCard: debitCardTotal,
            creditCard: creditCardTotal,
          },
        },
        operational: {
          totalTickets,
          ticketsClosed,
          monthlyCustomersCount,
          monthlyPaymentsCount,
        },
        generatedAt: new Date().toISOString(),
      };

      // === STEP 6: Create Monthly Report Record ===
      const reportId = uuid();
      const reportPayload = {
        id: reportId,
        report_month: reportMonth,
        report_year: reportYear,
        company_name: companyConfig?.name || 'Estacionamento',
        company_legal_name: companyConfig?.legal_name || '',
        company_cnpj: companyConfig?.cnpj || '',
        company_address: companyConfig?.address || '',
        company_phone: companyConfig?.phone || '',
        operator_id: user.id,
        operator_name: user.name,
        total_revenue: totalRevenue,
        avulsos_revenue: avulsosRevenue,
        mensalistas_revenue: mensalistasRevenue,
        cash_total: cashTotal,
        pix_total: pixTotal,
        debit_card_total: debitCardTotal,
        credit_card_total: creditCardTotal,
        total_tickets: totalTickets,
        tickets_closed: ticketsClosed,
        monthly_customers_count: monthlyCustomersCount,
        monthly_payments_count: monthlyPaymentsCount,
        tickets_data: tickets || [],
        payments_data: payments || [],
        monthly_customers_data: monthlyCustomers || [],
        report_json: reportJson,
        status: 'completed',
      };

      const { data: savedReport, error: saveError } = await supabase
        .from('monthly_reports')
        .insert(reportPayload)
        .select()
        .single();

      if (saveError) {
        return res.status(500).json({ error: 'Error saving report', details: saveError.message });
      }

      // === STEP 7: Archive Tickets to Archive Table (Optional) ===
      if (tickets && tickets.length > 0) {
        const archivedTickets = tickets.map((t) => ({
          id: uuid(),
          report_id: reportId,
          original_ticket_id: t.id,
          vehicle_plate: t.vehicle_plate,
          vehicle_type: t.vehicle_type,
          entry_time: t.entry_time,
          exit_time: t.exit_time,
          duration_minutes: t.duration_minutes,
          amount: t.amount,
          status: t.status,
          metadata: t.metadata,
        }));

        const { error: archiveError } = await supabase
          .from('archived_tickets')
          .insert(archivedTickets);

        if (archiveError) {
          console.error('Error archiving tickets:', archiveError);
          // Non-fatal: report is saved, archiving is bonus
        }
      }

      // === STEP 8: Clear Operational Tables ===
      let clearedTickets = 0;
      let clearedPayments = 0;
      const cleanupErrors = [];

      if (clearOperational) {
        console.log('🧹 Starting operational cleanup...');

        // Clear tickets for the period
        if (tickets && tickets.length > 0) {
          const ticketIds = tickets.map((t) => t.id);
          console.log(`🧹 Attempting to delete ${ticketIds.length} tickets...`);

          const { error: deleteTicketsError, count } = await supabase
            .from('tickets')
            .delete()
            .in('id', ticketIds);

          if (deleteTicketsError) {
            console.error('❌ Error clearing tickets:', deleteTicketsError);
            console.error('❌ Error code:', deleteTicketsError.code);
            console.error('❌ Error details:', deleteTicketsError.details);
            console.error('❌ Error message:', deleteTicketsError.message);
            cleanupErrors.push({ table: 'tickets', error: deleteTicketsError.message });
          } else {
            clearedTickets = ticketIds.length;
            console.log(`✅ Successfully deleted ${clearedTickets} tickets`);
          }
        } else {
          console.log('ℹ️  No tickets to clear');
        }

        // Clear payments for the period (avulsos only - don't clear monthly customer payments)
        if (payments && payments.length > 0) {
          const paymentIds = payments
            .filter((p) => p.target_type !== 'monthly_customer') // Keep monthly customer payments
            .map((p) => p.id);

          if (paymentIds.length > 0) {
            console.log(`🧹 Attempting to delete ${paymentIds.length} payments...`);

            const { error: deletePaymentsError, count } = await supabase
              .from('payments')
              .delete()
              .in('id', paymentIds);

            if (deletePaymentsError) {
              console.error('❌ Error clearing payments:', deletePaymentsError);
              console.error('❌ Error code:', deletePaymentsError.code);
              console.error('❌ Error details:', deletePaymentsError.details);
              console.error('❌ Error message:', deletePaymentsError.message);
              cleanupErrors.push({ table: 'payments', error: deletePaymentsError.message });
            } else {
              clearedPayments = paymentIds.length;
              console.log(`✅ Successfully deleted ${clearedPayments} payments`);
            }
          } else {
            console.log('ℹ️  No avulso payments to clear (all are monthly customer payments)');
          }
        } else {
          console.log('ℹ️  No payments to clear');
        }

        console.log(`🧹 Cleanup complete: ${clearedTickets} tickets, ${clearedPayments} payments deleted`);

        if (cleanupErrors.length > 0) {
          console.error('⚠️  Cleanup completed with errors:', cleanupErrors);
        }
      } else {
        console.log('ℹ️  Operational cleanup skipped (clearOperational = false)');
      }

      // === STEP 9: Log Audit Event ===
      await logEvent({
        actor: user,
        action: 'monthlyReport.generate',
        targetType: 'monthly_report',
        targetId: reportId,
        details: {
          period: `${reportMonth}/${reportYear}`,
          totalRevenue,
          ticketsCleared: clearedTickets,
          paymentsCleared: clearedPayments,
        },
      });

      // === STEP 10: Return Success Response ===
      const responseMessage = `Relatório mensal de ${reportMonth}/${reportYear} gerado com sucesso!${clearOperational ? ` ${clearedTickets} tickets e ${clearedPayments} pagamentos foram arquivados e removidos.` : ''}${cleanupErrors.length > 0 ? ` ⚠️ Alguns erros ocorreram durante a limpeza.` : ''}`;

      res.status(201).json({
        success: true,
        message: responseMessage,
        report: {
          id: savedReport.id,
          month: reportMonth,
          year: reportYear,
          totalRevenue,
          avulsosRevenue,
          mensalistasRevenue,
          totalTickets,
          ticketsClosed,
          operationalCleared: clearOperational,
          clearedTickets,
          clearedPayments,
          cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
          generatedAt: savedReport.generated_at,
        },
      });
    } catch (err) {
      console.error('Error generating monthly report:', err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  },

  /**
   * List Monthly Reports
   * GET /api/reports/monthly
   *
   * Query params:
   * - year: number (optional, filter by year)
   * - limit: number (optional, default 12)
   */
  async listMonthly(req, res) {
    try {
      const { year, limit = 12 } = req.query;

      let query = supabase
        .from('monthly_reports')
        .select(
          'id, report_month, report_year, generated_at, operator_name, total_revenue, avulsos_revenue, mensalistas_revenue, status'
        )
        .order('report_year', { ascending: false })
        .order('report_month', { ascending: false })
        .limit(Number(limit));

      if (year) {
        query = query.eq('report_year', Number(year));
      }

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ error: 'Error fetching reports', details: error.message });
      }

      res.json(data || []);
    } catch (err) {
      console.error('Error listing monthly reports:', err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  },

  /**
   * Get Monthly Report Details
   * GET /api/reports/monthly/:id
   */
  async getMonthly(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Report not found' });
        }
        return res.status(500).json({ error: 'Error fetching report', details: error.message });
      }

      res.json(data);
    } catch (err) {
      console.error('Error getting monthly report:', err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  },

  /**
   * Delete Monthly Report
   * DELETE /api/reports/monthly/:id
   * (Admin only - for corrections/errors)
   */
  async deleteMonthly(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin permission required' });
      }

      const { error } = await supabase.from('monthly_reports').delete().eq('id', id);

      if (error) {
        return res.status(500).json({ error: 'Error deleting report', details: error.message });
      }

      await logEvent({
        actor: user,
        action: 'monthlyReport.delete',
        targetType: 'monthly_report',
        targetId: id,
      });

      res.status(204).send();
    } catch (err) {
      console.error('Error deleting monthly report:', err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  },
};
