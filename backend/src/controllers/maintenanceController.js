import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';

// Maintenance utilities (non-production endpoints) for data backfill
export default {
  async backfillTicketPayments(req, res) {
    try {
      const { data: closedTickets, error: ticketsErr } = await supabase
        .from('tickets')
        .select('*')
        .eq('status', 'closed');
      if (ticketsErr) return res.status(500).json({ error: ticketsErr });

      let created = 0;
      for (const t of closedTickets || []) {
        const { data: existing, error: payErr } = await supabase
          .from('payments')
          .select('id')
          .eq('target_type', 'ticket')
          .eq('target_id', t.id)
          .limit(1);
        if (payErr) continue;
        if (existing && existing.length > 0) continue;
        const amount = t.amount || 0;
        await supabase.from('payments').insert({
          id: uuid(),
          target_type: 'ticket',
          target_id: t.id,
          date: t.exit_time || new Date().toISOString(),
          value: amount,
          method: 'cash'
        });
        created++;
      }
      res.json({ closedTickets: (closedTickets || []).length, paymentsCreated: created });
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }
};

// Non-default export for seeding admin in development fallback
export async function seedAdmin(req, res) {
  try {
    const ADMIN_LOGIN = 'admin';
    const ADMIN_PASSWORD = 'admin123';
    // Check exists
    const { data: existing } = await supabase.from('users').select('*').eq('login', ADMIN_LOGIN).limit(1);
    if (existing && existing.length) {
      return res.json({ status: 'exists', login: ADMIN_LOGIN });
    }
    // Hash password (fallback environment may not have bcrypt here; use pre-hash if bcrypt missing)
    let password_hash;
    try {
      const bcrypt = await import('bcryptjs');
      password_hash = await bcrypt.default.hash(ADMIN_PASSWORD, 10);
    } catch {
      // Extremely simplified fallback (DO NOT use in production)
      password_hash = `plain:${ADMIN_PASSWORD}`;
    }
    const adminUser = {
      id: 'admin-seed-' + Date.now(),
      name: 'Administrador',
      email: 'admin@example.com',
      login: ADMIN_LOGIN,
      password_hash,
      role: 'admin',
      permissions: {},
      created_at: new Date().toISOString()
    };
    await supabase.from('users').insert(adminUser);
    res.json({ status: 'created', login: ADMIN_LOGIN, password: ADMIN_PASSWORD });
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
}
