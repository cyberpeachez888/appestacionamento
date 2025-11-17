import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../middleware/auditLogger.js';

const table = 'expenses';

// Calculate expense status based on due date and payment date
function calculateStatus(dueDate, paymentDate) {
  if (paymentDate) {
    return 'Pago';
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'Atrasado';
  } else if (diffDays <= 3) {
    return 'Perto do Vencimento';
  } else {
    return 'Em dia';
  }
}

// Transform to frontend format
function toFrontendFormat(expense) {
  if (!expense) return null;
  
  const status = calculateStatus(expense.due_date, expense.payment_date);
  
  return {
    id: expense.id,
    name: expense.name,
    value: Number(expense.value) || 0,
    dueDate: expense.due_date,
    paymentDate: expense.payment_date || null,
    status,
    category: expense.category,
    isRecurring: expense.is_recurring || false,
    recurringFrequency: expense.recurring_frequency || null, // 'monthly', 'weekly', etc.
    notes: expense.notes || null,
    createdAt: expense.created_at,
    updatedAt: expense.updated_at,
  };
}

// Transform to database format
function toDbFormat(expense) {
  return {
    id: expense.id || uuid(),
    name: expense.name,
    value: Number(expense.value) || 0,
    due_date: expense.dueDate,
    payment_date: expense.paymentDate || null,
    category: expense.category,
    is_recurring: expense.isRecurring || false,
    recurring_frequency: expense.recurringFrequency || null,
    notes: expense.notes || null,
  };
}

export default {
  async list(req, res) {
    try {
      const { start, end, category, status } = req.query;
      let q = supabase.from(table).select('*');
      
      if (start) q = q.gte('due_date', start);
      if (end) q = q.lte('due_date', end);
      if (category) q = q.eq('category', category);
      
      const { data, error } = await q.order('due_date', { ascending: true });
      if (error) return res.status(500).json({ error });
      
      // Filter by status if provided (client-side filtering since status is calculated)
      let expenses = data.map(toFrontendFormat);
      if (status) {
        expenses = expenses.filter((e) => e.status === status);
      }
      
      res.json(expenses);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Expense not found' });
        return res.status(500).json({ error });
      }
      res.json(toFrontendFormat(data));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async create(req, res) {
    try {
      const payload = toDbFormat(req.body);
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) return res.status(500).json({ error });
      
      await logEvent({
        actor: req.user,
        action: 'expense.create',
        targetType: 'expense',
        targetId: data.id,
        details: { name: data.name, value: data.value, category: data.category },
      });
      
      res.status(201).json(toFrontendFormat(data));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const payload = toDbFormat({ ...req.body, id });
      
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Expense not found' });
        return res.status(500).json({ error });
      }
      
      await logEvent({
        actor: req.user,
        action: 'expense.update',
        targetType: 'expense',
        targetId: id,
        details: { name: data.name, value: data.value },
      });
      
      res.json(toFrontendFormat(data));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) return res.status(500).json({ error });
      
      await logEvent({
        actor: req.user,
        action: 'expense.delete',
        targetType: 'expense',
        targetId: id,
      });
      
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },
};

