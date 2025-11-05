import { supabase, isSupabaseConfigured } from '../config/supabase.js';

// In-memory storage fallback
let inMemoryPayments = [];

export const createPayment = async (req, res, next) => {
  try {
    const paymentData = {
      ...req.body,
      payment_date: req.body.payment_date || new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      const payment = {
        id: Date.now().toString(),
        ...paymentData,
        created_at: new Date().toISOString()
      };
      inMemoryPayments.push(payment);
      return res.status(201).json({
        success: true,
        data: payment
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const { start_date, end_date, payment_method, ticket_id, monthly_client_id } = req.query;

    if (isSupabaseConfigured()) {
      let query = supabase.from('payments').select('*');

      if (start_date) query = query.gte('payment_date', start_date);
      if (end_date) query = query.lte('payment_date', end_date);
      if (payment_method) query = query.eq('payment_method', payment_method);
      if (ticket_id) query = query.eq('ticket_id', ticket_id);
      if (monthly_client_id) query = query.eq('monthly_client_id', monthly_client_id);

      query = query.order('payment_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return res.json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      let filtered = [...inMemoryPayments];
      
      if (payment_method) filtered = filtered.filter(p => p.payment_method === payment_method);
      if (ticket_id) filtered = filtered.filter(p => p.ticket_id === ticket_id);
      if (monthly_client_id) filtered = filtered.filter(p => p.monthly_client_id === monthly_client_id);
      
      filtered.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
      
      return res.json({
        success: true,
        data: filtered
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Payment not found'
          });
        }
        throw error;
      }

      return res.json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      const payment = inMemoryPayments.find(p => p.id === id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Payment not found'
        });
      }
      
      return res.json({
        success: true,
        data: payment
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getPaymentsByTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      return res.json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      const payments = inMemoryPayments.filter(p => p.ticket_id === ticketId);
      payments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
      
      return res.json({
        success: true,
        data: payments
      });
    }
  } catch (error) {
    next(error);
  }
};
