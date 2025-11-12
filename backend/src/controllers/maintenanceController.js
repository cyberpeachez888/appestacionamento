import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { validatePassword } from '../services/securityService.js';

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
    const envSecret = process.env.SEED_ADMIN_SECRET;
    if (!envSecret) {
      return res.status(404).json({ error: 'Função indisponível' });
    }

    const { secret, login, password, name, email, permissions } = req.body || {};
    const requestSecret = secret || req.headers['x-seed-secret'];

    if (requestSecret !== envSecret) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Senha obrigatória' });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: 'Senha não atende aos requisitos de segurança', errors: passwordCheck.errors });
    }

    const adminLogin = (login || 'admin').trim();
    if (!adminLogin) {
      return res.status(400).json({ error: 'Login obrigatório' });
    }

    const { data: existing } = await supabase.from('users').select('*').eq('login', adminLogin).limit(1);
    if (existing && existing.length) {
      return res.json({ status: 'exists', login: adminLogin });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    const adminUser = {
      id: 'admin-seed-' + Date.now(),
      name: name || 'Administrador',
      email: email || 'admin@example.com',
      login: adminLogin,
      password_hash,
      role: 'admin',
      permissions: permissions && typeof permissions === 'object' ? permissions : {},
      must_change_password: true,
      is_first_login: true,
      created_at: now,
      password_changed_at: now,
      password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    };
    await supabase.from('users').insert(adminUser);
    res.json({ status: 'created', login: adminLogin });
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
}
