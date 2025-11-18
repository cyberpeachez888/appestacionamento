import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../middleware/auditLogger.js';

const table = 'manual_revenues';

// Transform to frontend format
function toFrontendFormat(revenue) {
  if (!revenue) return null;
  
  return {
    id: revenue.id,
    description: revenue.description,
    value: Number(revenue.value) || 0,
    date: revenue.date,
    category: revenue.category || '', // Campo livre agora
    status: revenue.status || 'Não Pago', // 'Pago', 'Não Pago'
    notes: revenue.notes || null,
    createdAt: revenue.created_at,
    updatedAt: revenue.updated_at,
  };
}

// Transform to database format
function toDbFormat(revenue) {
  return {
    id: revenue.id || uuid(),
    description: revenue.description,
    value: Number(revenue.value) || 0,
    date: revenue.date,
    category: revenue.category || '',
    status: revenue.status || 'Não Pago',
    notes: revenue.notes || null,
  };
}

export default {
  async list(req, res) {
    try {
      const { start, end, category } = req.query;
      let q = supabase.from(table).select('*');
      
      if (start) q = q.gte('date', start);
      if (end) q = q.lte('date', end);
      if (category) q = q.eq('category', category);
      
      const { data, error } = await q.order('date', { ascending: false });
      if (error) return res.status(500).json({ error });
      
      res.json(data.map(toFrontendFormat));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Manual revenue not found' });
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
        action: 'manualRevenue.create',
        targetType: 'manual_revenue',
        targetId: data.id,
        details: { description: data.description, value: data.value, category: data.category },
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
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Manual revenue not found' });
        return res.status(500).json({ error });
      }
      
      await logEvent({
        actor: req.user,
        action: 'manualRevenue.update',
        targetType: 'manual_revenue',
        targetId: id,
        details: { description: data.description, value: data.value },
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
        action: 'manualRevenue.delete',
        targetType: 'manual_revenue',
        targetId: id,
      });
      
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },
};

