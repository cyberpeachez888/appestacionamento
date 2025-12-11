import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../services/auditLogger.js';

const table = 'rate_thresholds';

function toFrontendFormat(row) {
  return {
    id: row.id,
    sourceRateId: row.source_rate_id,
    targetRateId: row.target_rate_id,
    thresholdAmount: Number(row.threshold_amount),
    autoApply: row.auto_apply,
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
        .eq('source_rate_id', rateId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      res.json((data || []).map(toFrontendFormat));
    } catch (err) {
      console.error('Rate thresholds list error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },

  async create(req, res) {
    try {
      const { rateId } = req.params;
      const payload = {
        id: uuid(),
        source_rate_id: rateId,
        target_rate_id: req.body.targetRateId,
        threshold_amount: req.body.thresholdAmount,
        auto_apply: req.body.autoApply ?? false,
      };

      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;

      await logEvent({
        actor: req.user,
        action: 'rate.threshold.create',
        targetType: 'rate_threshold',
        targetId: payload.id,
        details: payload,
      });

      res.status(201).json(toFrontendFormat(data));
    } catch (err) {
      console.error('Rate thresholds create error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = {};
      if (req.body.targetRateId !== undefined) updates.target_rate_id = req.body.targetRateId;
      if (req.body.thresholdAmount !== undefined)
        updates.threshold_amount = req.body.thresholdAmount;
      if (req.body.autoApply !== undefined) updates.auto_apply = req.body.autoApply;

      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await logEvent({
        actor: req.user,
        action: 'rate.threshold.update',
        targetType: 'rate_threshold',
        targetId: id,
        details: updates,
      });

      res.json(toFrontendFormat(data));
    } catch (err) {
      console.error('Rate thresholds update error:', err);
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
        action: 'rate.threshold.delete',
        targetType: 'rate_threshold',
        targetId: id,
      });

      res.sendStatus(204);
    } catch (err) {
      console.error('Rate thresholds delete error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },
};
