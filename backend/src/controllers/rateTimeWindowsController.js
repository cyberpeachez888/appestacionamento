import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../services/auditLogger.js';

const table = 'rate_time_windows';

function toFrontendFormat(row) {
  return {
    id: row.id,
    rateId: row.rate_id,
    windowType: row.window_type,
    startTime: row.start_time,
    endTime: row.end_time,
    startDay: row.start_day,
    endDay: row.end_day,
    durationLimitMinutes: row.duration_limit_minutes,
    extraRateId: row.extra_rate_id,
    metadata: row.metadata || {},
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export default {
  async list(req, res) {
    try {
      const { rateId } = req.params;
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('rate_id', rateId)
        .order('window_type', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      res.json((data || []).map(toFrontendFormat));
    } catch (err) {
      console.error('Rate time windows list error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },

  async create(req, res) {
    try {
      const { rateId } = req.params;
      const payload = {
        id: uuid(),
        rate_id: rateId,
        window_type: req.body.windowType,
        start_time: req.body.startTime || null,
        end_time: req.body.endTime || null,
        start_day: req.body.startDay ?? null,
        end_day: req.body.endDay ?? null,
        duration_limit_minutes: req.body.durationLimitMinutes ?? null,
        extra_rate_id: req.body.extraRateId || null,
        metadata: req.body.metadata || {},
        is_active: req.body.isActive !== undefined ? req.body.isActive : true,
      };

      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;

      await logEvent({
        actor: req.user,
        action: 'rate.window.create',
        targetType: 'rate_time_window',
        targetId: payload.id,
        details: payload,
      });

      res.status(201).json(toFrontendFormat(data));
    } catch (err) {
      console.error('Rate time windows create error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = {};
      if (req.body.windowType !== undefined) updates.window_type = req.body.windowType;
      if (req.body.startTime !== undefined) updates.start_time = req.body.startTime;
      if (req.body.endTime !== undefined) updates.end_time = req.body.endTime;
      if (req.body.startDay !== undefined) updates.start_day = req.body.startDay;
      if (req.body.endDay !== undefined) updates.end_day = req.body.endDay;
      if (req.body.durationLimitMinutes !== undefined) {
        updates.duration_limit_minutes = req.body.durationLimitMinutes;
      }
      if (req.body.extraRateId !== undefined) updates.extra_rate_id = req.body.extraRateId;
      if (req.body.metadata !== undefined) updates.metadata = req.body.metadata;
      if (req.body.isActive !== undefined) updates.is_active = req.body.isActive;

      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await logEvent({
        actor: req.user,
        action: 'rate.window.update',
        targetType: 'rate_time_window',
        targetId: id,
        details: updates,
      });

      res.json(toFrontendFormat(data));
    } catch (err) {
      console.error('Rate time windows update error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },

  async remove(req, res) {
    try {
      const { id } = req.params;
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;

      await logEvent({
        actor: req.user,
        action: 'rate.window.delete',
        targetType: 'rate_time_window',
        targetId: id,
      });

      res.sendStatus(204);
    } catch (err) {
      console.error('Rate time windows delete error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },
};
