import { supabase } from '../config/supabase.js';

export default {
  async summary(req, res) {
    try {
      const { start, end } = req.query;
      let q = supabase.from('payments').select('*, target_type').order('date', { ascending: false });
      if (start) q = q.gte('date', start);
      if (end) q = q.lte('date', end);
      const paymentsResp = await q;
      if (paymentsResp.error) return res.status(500).json({ error: paymentsResp.error });

      const payments = paymentsResp.data || [];
      const total = payments.reduce((s, p) => s + (Number(p.value) || 0), 0);
      const byMethod = payments.reduce((acc, p) => {
        acc[p.method || 'unknown'] = (acc[p.method || 'unknown'] || 0) + (Number(p.value) || 0);
        return acc;
      }, {});

      res.json({ total, count: payments.length, byMethod, payments });
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }
};
