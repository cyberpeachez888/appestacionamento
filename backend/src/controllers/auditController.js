import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';

// Direct API to log arbitrary events (for frontend-triggered actions like cash open/close)
export default {
  async create(req, res) {
    try {
      const actor = req.user;
      if (!actor) return res.status(401).json({ error: 'Unauthorized' });
      const { action, targetType, targetId, details } = req.body || {};
      if (!action) return res.status(400).json({ error: 'Missing action' });
      const payload = {
        id: uuid(),
        actor_id: actor.id,
        actor_login: actor.login,
        actor_name: actor.name,
        action,
        target_type: targetType || null,
        target_id: targetId || null,
        details: details ? JSON.stringify(details) : null,
        created_at: new Date().toISOString(),
      };
      await supabase.from('user_events').insert(payload);
      res.status(201).json({ id: payload.id });
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },
  async list(req, res) {
    try {
      const { start, end, action, actorId } = req.query;
      let q = supabase.from('user_events').select('*').order('created_at', { ascending: false });
      if (start) q = q.gte('created_at', start);
      if (end) q = q.lte('created_at', end);
      if (action) q = q.eq('action', action);
      if (actorId) q = q.eq('actor_id', actorId);
      const { data, error } = await q;
      if (error) return res.status(500).json({ error });
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },
};
