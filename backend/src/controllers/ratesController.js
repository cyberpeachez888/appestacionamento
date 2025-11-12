import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../middleware/auditLogger.js';

const table = 'rates';

// Transform snake_case to camelCase for frontend
function toFrontendFormat(rate) {
  return {
    id: rate.id,
    vehicleType: rate.vehicle_type,
    rateType: rate.rate_type,
    value: rate.value,
    unit: rate.unit,
    courtesyMinutes: rate.courtesy_minutes || 0,
    config: rate.config || {},
  };
}

export default {
  async list(req, res) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) return res.status(500).json({ error });
    const formatted = (data || []).map(toFrontendFormat);
    res.json(formatted);
  },

  async create(req, res) {
    // normalize field names to snake_case for consistency
    const payload = {
      id: uuid(),
      vehicle_type: req.body.vehicleType || req.body.vehicle_type,
      rate_type: req.body.rateType || req.body.rate_type,
      value: req.body.value,
      unit: req.body.unit,
      courtesy_minutes: req.body.courtesyMinutes || req.body.courtesy_minutes || 0,
      config: req.body.config || {},
    };
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) return res.status(500).json({ error });
    await logEvent({
      actor: req.user,
      action: 'rate.create',
      targetType: 'rate',
      targetId: data.id,
      details: payload,
    });
    res.status(201).json(toFrontendFormat(data));
  },

  async update(req, res) {
    const { id } = req.params;
    // Normalize incoming fields to snake_case
    const payload = {};
    if (req.body.vehicleType) payload.vehicle_type = req.body.vehicleType;
    if (req.body.rateType) payload.rate_type = req.body.rateType;
    if (req.body.value !== undefined) payload.value = req.body.value;
    if (req.body.unit) payload.unit = req.body.unit;
    if (req.body.courtesyMinutes !== undefined) payload.courtesy_minutes = req.body.courtesyMinutes;
    if (req.body.config !== undefined) payload.config = req.body.config;

    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error });
    await logEvent({
      actor: req.user,
      action: 'rate.update',
      targetType: 'rate',
      targetId: id,
      details: payload,
    });
    res.json(toFrontendFormat(data));
  },

  async remove(req, res) {
    const { id } = req.params;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return res.status(500).json({ error });
    await logEvent({ actor: req.user, action: 'rate.delete', targetType: 'rate', targetId: id });
    res.sendStatus(204);
  },
};
