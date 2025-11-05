import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { generateReceiptNumber } from '../utils/calculations.js';

// In-memory storage fallback
let inMemoryReceipts = [];

export const createReceipt = async (req, res, next) => {
  try {
    const receiptData = {
      receipt_number: generateReceiptNumber(),
      ...req.body,
      issued_date: req.body.issued_date || new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('receipts')
        .insert([receiptData])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      const receipt = {
        id: Date.now().toString(),
        ...receiptData,
        created_at: new Date().toISOString()
      };
      inMemoryReceipts.push(receipt);
      return res.status(201).json({
        success: true,
        data: receipt
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getReceipts = async (req, res, next) => {
  try {
    const { start_date, end_date, payment_id } = req.query;

    if (isSupabaseConfigured()) {
      let query = supabase.from('receipts').select('*');

      if (start_date) query = query.gte('issued_date', start_date);
      if (end_date) query = query.lte('issued_date', end_date);
      if (payment_id) query = query.eq('payment_id', payment_id);

      query = query.order('issued_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return res.json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      let filtered = [...inMemoryReceipts];
      
      if (payment_id) filtered = filtered.filter(r => r.payment_id === payment_id);
      
      filtered.sort((a, b) => new Date(b.issued_date) - new Date(a.issued_date));
      
      return res.json({
        success: true,
        data: filtered
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getReceiptById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Receipt not found'
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
      const receipt = inMemoryReceipts.find(r => r.id === id);
      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Receipt not found'
        });
      }
      
      return res.json({
        success: true,
        data: receipt
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getReceiptByPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('payment_id', paymentId)
        .order('issued_date', { ascending: false });

      if (error) throw error;

      return res.json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      const receipts = inMemoryReceipts.filter(r => r.payment_id === paymentId);
      receipts.sort((a, b) => new Date(b.issued_date) - new Date(a.issued_date));
      
      return res.json({
        success: true,
        data: receipts
      });
    }
  } catch (error) {
    next(error);
  }
};
