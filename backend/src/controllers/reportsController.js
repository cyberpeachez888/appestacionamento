import { supabase, isSupabaseConfigured } from '../config/supabase.js';

export const getDailyReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const startDate = `${targetDate}T00:00:00`;
    const endDate = `${targetDate}T23:59:59`;

    if (isSupabaseConfigured()) {
      // Get payments for the day
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (error) throw error;

      const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const paymentsByMethod = payments.reduce((acc, p) => {
        acc[p.payment_method] = (acc[p.payment_method] || 0) + parseFloat(p.amount);
        return acc;
      }, {});

      return res.json({
        success: true,
        data: {
          date: targetDate,
          total_revenue: totalRevenue,
          total_payments: payments.length,
          payments_by_method: paymentsByMethod,
          payments
        }
      });
    } else {
      // In-memory fallback
      return res.json({
        success: true,
        data: {
          date: targetDate,
          total_revenue: 0,
          total_payments: 0,
          payments_by_method: {},
          payments: []
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getMonthlyReport = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || String(new Date().getMonth() + 1).padStart(2, '0');
    
    const startDate = `${targetYear}-${targetMonth}-01T00:00:00`;
    const lastDay = new Date(targetYear, parseInt(targetMonth), 0).getDate();
    const endDate = `${targetYear}-${targetMonth}-${lastDay}T23:59:59`;

    if (isSupabaseConfigured()) {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (error) throw error;

      const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const paymentsByMethod = payments.reduce((acc, p) => {
        acc[p.payment_method] = (acc[p.payment_method] || 0) + parseFloat(p.amount);
        return acc;
      }, {});

      // Group by day
      const dailyRevenue = payments.reduce((acc, p) => {
        const day = new Date(p.payment_date).toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + parseFloat(p.amount);
        return acc;
      }, {});

      return res.json({
        success: true,
        data: {
          year: targetYear,
          month: targetMonth,
          total_revenue: totalRevenue,
          total_payments: payments.length,
          payments_by_method: paymentsByMethod,
          daily_revenue: dailyRevenue
        }
      });
    } else {
      // In-memory fallback
      return res.json({
        success: true,
        data: {
          year: targetYear,
          month: targetMonth,
          total_revenue: 0,
          total_payments: 0,
          payments_by_method: {},
          daily_revenue: {}
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    if (isSupabaseConfigured()) {
      // Get total revenue
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount');

      if (paymentsError) throw paymentsError;

      const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // Get total tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, status');

      if (ticketsError) throw ticketsError;

      // Get active monthly clients
      const { data: clients, error: clientsError } = await supabase
        .from('monthly_clients')
        .select('id')
        .eq('is_active', true);

      if (clientsError) throw clientsError;

      // Get active tickets
      const activeTickets = tickets.filter(t => t.status === 'active').length;
      const completedTickets = tickets.filter(t => t.status === 'completed').length;

      return res.json({
        success: true,
        data: {
          total_revenue: totalRevenue,
          total_tickets: tickets.length,
          active_tickets: activeTickets,
          completed_tickets: completedTickets,
          active_monthly_clients: clients.length,
          total_payments: payments.length
        }
      });
    } else {
      // In-memory fallback
      return res.json({
        success: true,
        data: {
          total_revenue: 0,
          total_tickets: 0,
          active_tickets: 0,
          completed_tickets: 0,
          active_monthly_clients: 0,
          total_payments: 0
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getRevenueByVehicleType = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    if (isSupabaseConfigured()) {
      let query = supabase
        .from('payments')
        .select('amount, ticket_id, monthly_client_id');

      if (start_date) query = query.gte('payment_date', start_date);
      if (end_date) query = query.lte('payment_date', end_date);

      const { data: payments, error } = await query;
      if (error) throw error;

      // Get tickets with vehicle types
      const ticketIds = payments.filter(p => p.ticket_id).map(p => p.ticket_id);
      const clientIds = payments.filter(p => p.monthly_client_id).map(p => p.monthly_client_id);

      let revenueByType = {};

      if (ticketIds.length > 0) {
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('id, vehicle_type')
          .in('id', ticketIds);

        if (ticketsError) throw ticketsError;

        payments.forEach(payment => {
          const ticket = tickets.find(t => t.id === payment.ticket_id);
          if (ticket) {
            revenueByType[ticket.vehicle_type] = (revenueByType[ticket.vehicle_type] || 0) + parseFloat(payment.amount);
          }
        });
      }

      if (clientIds.length > 0) {
        const { data: clients, error: clientsError } = await supabase
          .from('monthly_clients')
          .select('id, vehicle_type')
          .in('id', clientIds);

        if (clientsError) throw clientsError;

        payments.forEach(payment => {
          const client = clients.find(c => c.id === payment.monthly_client_id);
          if (client) {
            revenueByType[client.vehicle_type] = (revenueByType[client.vehicle_type] || 0) + parseFloat(payment.amount);
          }
        });
      }

      return res.json({
        success: true,
        data: revenueByType
      });
    } else {
      // In-memory fallback
      return res.json({
        success: true,
        data: {}
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getDateRangeReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'start_date and end_date are required'
      });
    }

    if (isSupabaseConfigured()) {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .gte('payment_date', start_date)
        .lte('payment_date', end_date)
        .order('payment_date', { ascending: true });

      if (error) throw error;

      const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const paymentsByMethod = payments.reduce((acc, p) => {
        acc[p.payment_method] = (acc[p.payment_method] || 0) + parseFloat(p.amount);
        return acc;
      }, {});

      // Group by date
      const dailyRevenue = payments.reduce((acc, p) => {
        const day = new Date(p.payment_date).toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + parseFloat(p.amount);
        return acc;
      }, {});

      return res.json({
        success: true,
        data: {
          start_date,
          end_date,
          total_revenue: totalRevenue,
          total_payments: payments.length,
          payments_by_method: paymentsByMethod,
          daily_revenue: dailyRevenue,
          payments
        }
      });
    } else {
      // In-memory fallback
      return res.json({
        success: true,
        data: {
          start_date,
          end_date,
          total_revenue: 0,
          total_payments: 0,
          payments_by_method: {},
          daily_revenue: {},
          payments: []
        }
      });
    }
  } catch (error) {
    next(error);
  }
};
