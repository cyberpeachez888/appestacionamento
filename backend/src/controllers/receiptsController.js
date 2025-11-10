import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../middleware/auditLogger.js';

const table = 'receipts';

// Transform snake_case to camelCase for frontend
function toFrontendFormat(receipt) {
  if (!receipt) return null;
  return {
    id: receipt.id,
    ticketId: receipt.ticket_id,
    receiptType: receipt.receipt_type,
    clientName: receipt.client_name,
    clientCpf: receipt.client_cpf,
    notes: receipt.notes,
    createdAt: receipt.created_at,
    updatedAt: receipt.updated_at
  };
}

// Transform camelCase to snake_case for database
function toDbFormat(receipt) {
  return {
    id: receipt.id || uuid(),
    ticket_id: receipt.ticketId,
    receipt_type: receipt.receiptType || 'simple',
    client_name: receipt.clientName,
    client_cpf: receipt.clientCpf,
    notes: receipt.notes
  };
}

export default {
  async create(req, res) {
    try {
      const payload = toDbFormat(req.body);
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();
      
      if (error) return res.status(500).json({ error });
      await logEvent({ actor: req.user, action: 'receipt.create', targetType: 'receipt', targetId: data.id, details: { ticketId: data.ticket_id } });
      res.status(201).json(toFrontendFormat(data));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async list(req, res) {
    try {
      const { ticketId } = req.query;
      let query = supabase.from(table).select('*');
      
      if (ticketId) {
        query = query.eq('ticket_id', ticketId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) return res.status(500).json({ error });
      res.json(data.map(toFrontendFormat));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async getById(req, res) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', req.params.id)
        .single();
      
      if (error) return res.status(404).json({ error: 'Receipt not found' });
      res.json(toFrontendFormat(data));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async delete(req, res) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', req.params.id);
      
      if (error) return res.status(500).json({ error });
      await logEvent({ actor: req.user, action: 'receipt.delete', targetType: 'receipt', targetId: req.params.id });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }
};
