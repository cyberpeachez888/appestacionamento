import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { logEvent } from '../middleware/auditLogger.js';

const TABLE = 'users';

export default {
  async list(req, res) {
    const { data, error } = await supabase.from(TABLE).select('id,name,email,login,role,permissions,created_at');
    if (error) return res.status(500).json({ error });
    res.json(data);
  },

  async create(req, res) {
    try {
      const { name, dateOfBirth, email, login, password, permissions, role } = req.body;
      if (!name || !email || !login || !password) return res.status(400).json({ error: 'Missing required fields' });
      const password_hash = await bcrypt.hash(password, 10);
      const payload = {
        id: uuid(),
        name,
        date_of_birth: dateOfBirth || null,
        email,
        login,
        password_hash,
        role: role || 'operator',
        permissions: sanitizePermissions(permissions),
      };
      const { data, error } = await supabase.from(TABLE).insert(payload).select('id,name,email,login,role,permissions,created_at').single();
      if (error) return res.status(500).json({ error });
      await logEvent({ actor: req.user, action: 'user.create', targetType: 'user', targetId: data.id, details: { role: data.role } });
      res.status(201).json(data);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async update(req, res) {
    const { id } = req.params;
    const { name, dateOfBirth, email, login, role, permissions } = req.body;
    const patch = {
      ...(name !== undefined ? { name } : {}),
      ...(dateOfBirth !== undefined ? { date_of_birth: dateOfBirth } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(login !== undefined ? { login } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(permissions !== undefined ? { permissions: sanitizePermissions(permissions) } : {}),
    };
    const { data, error } = await supabase.from(TABLE).update(patch).eq('id', id).select('id,name,email,login,role,permissions,created_at').single();
    if (error) return res.status(500).json({ error });
    await logEvent({ actor: req.user, action: 'user.update', targetType: 'user', targetId: id, details: { changed: Object.keys(patch) } });
    res.json(data);
  },

  async updatePassword(req, res) {
    try {
      const { id } = req.params;
      const { oldPassword, newPassword } = req.body;
      const actor = req.user; // set by middleware

      if (!actor) return res.status(401).json({ error: 'Unauthorized' });
      const isSelf = actor.id === id;
      const isAdmin = actor.role === 'admin';

      if (!newPassword) return res.status(400).json({ error: 'New password required' });

      // Admin can set password for any user without old password
      if (!isAdmin) {
        if (!isSelf) return res.status(403).json({ error: 'Forbidden' });
        if (!oldPassword) return res.status(400).json({ error: 'Old password required' });
      }

      // Fetch target user
      const { data: targetUser, error: userErr } = await supabase.from(TABLE).select('*').eq('id', id).single();
      if (userErr) return res.status(500).json({ error: userErr });
      if (!targetUser) return res.status(404).json({ error: 'User not found' });

      if (!isAdmin) {
        const ok = await bcrypt.compare(oldPassword, targetUser.password_hash);
        if (!ok) return res.status(400).json({ error: 'Old password does not match' });
      }

      const password_hash = await bcrypt.hash(newPassword, 10);
      const { error } = await supabase.from(TABLE).update({ password_hash }).eq('id', id);
      if (error) return res.status(500).json({ error });
      await logEvent({ actor: req.user, action: 'user.password.update', targetType: 'user', targetId: id });
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async remove(req, res) {
    try {
      const { id } = req.params;
      const actor = req.user;
      if (!actor) return res.status(401).json({ error: 'Unauthorized' });

      // Prevent deleting own account
      if (actor.id === id) return res.status(400).json({ error: 'You cannot delete your own account' });

      // Prevent deleting the last admin
      const { data: admins, error: adminsErr } = await supabase.from(TABLE).select('id').eq('role', 'admin');
      if (adminsErr) return res.status(500).json({ error: adminsErr });
      const remainingAdmins = (admins || []).filter(u => u.id !== id);
      if (remainingAdmins.length === 0) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }

      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) return res.status(500).json({ error });
      await logEvent({ actor: req.user, action: 'user.delete', targetType: 'user', targetId: id });
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }
};

// Whitelist + normalize boolean permissions
function sanitizePermissions(raw) {
  const DEFAULTS = {
    manageRates: false,
    manageMonthlyCustomers: false,
    viewReports: true,
    manageUsers: false,
    manageCompanyConfig: false,
    manageVehicleTypes: false,
    openCloseCash: true,
    manageBackups: false,
  };
  if (!raw || typeof raw !== 'object') return DEFAULTS;
  const out = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    out[key] = Boolean(raw[key]);
  }
  return out;
}
