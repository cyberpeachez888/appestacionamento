import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../services/auditLogger.js';

const table = 'payments';

// Transform snake_case to camelCase for frontend
function toConfigFrontendFormat(config) {
  if (!config) return {};
  return {
    id: config.id,
    name: config.name,
    legalName: config.legal_name,
    cnpj: config.cnpj,
    address: config.address,
    phone: config.phone,
    primaryColor: config.primary_color,
    receiptCounter: config.receipt_counter,
    printerConfig: config.printer_config || {}, // JSONB field
    createdAt: config.created_at,
    updatedAt: config.updated_at,
  };
}

// Transform camelCase to snake_case for database
function toConfigDbFormat(config) {
  return {
    id: config.id || 'default',
    name: config.name,
    legal_name: config.legalName,
    cnpj: config.cnpj,
    address: config.address,
    phone: config.phone,
    primary_color: config.primaryColor,
    receipt_counter: config.receiptCounter,
    printer_config: config.printerConfig || {}, // JSONB field
  };
}

export default {
  async create(req, res) {
    try {
      const id = uuid();
      const payload = { id, date: new Date().toISOString(), ...req.body };
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) return res.status(500).json({ error });
      await logEvent({
        actor: req.user,
        action: 'payment.create',
        targetType: payload.target_type,
        targetId: payload.target_id,
        details: { value: payload.value, method: payload.method },
      });
      res.status(201).json(data);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async list(req, res) {
    const { start, end } = req.query;
    let q = supabase.from(table).select('*');
    if (start) q = q.gte('date', start);
    if (end) q = q.lte('date', end);
    const { data, error } = await q.order('date', { ascending: false });
    if (error) return res.status(500).json({ error });
    res.json(data);
  },

  // company config stored in 'company_config' table (single row)
  async getCompanyConfig(req, res) {
    const { data, error } = await supabase.from('company_config').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') return res.status(500).json({ error });
    res.json(toConfigFrontendFormat(data) || {});
  },

  async updateCompanyConfig(req, res) {
    // Transform and upsert: if row exists update, else insert
    const payload = toConfigDbFormat(req.body);
    const { data, error } = await supabase.from('company_config').upsert(payload).select().single();
    if (error) return res.status(500).json({ error });
    await logEvent({
      actor: req.user,
      action: 'companyConfig.update',
      targetType: 'company_config',
      targetId: data?.id || 'default',
    });
    res.json(toConfigFrontendFormat(data));
  },
};
