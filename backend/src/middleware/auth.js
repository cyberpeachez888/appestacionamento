import jwt from 'jsonwebtoken';

// JWT_SECRET deve ser obrigatório em produção
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '❌ JWT_SECRET é obrigatório em produção! Configure a variável de ambiente.'
    );
  }
  console.warn(
    '⚠️  AVISO: Usando JWT_SECRET padrão (apenas desenvolvimento). Configure JWT_SECRET no .env para produção!'
  );
}

const SECRET = JWT_SECRET || 'dev-secret-change-me';

export function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload; // { id, name, role, permissions }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

// Generic permission middleware. Admin bypasses checks.
export function requirePermission(permissionKey) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role === 'admin') return next();
    const perms = req.user.permissions || {};
    if (!perms[permissionKey]) {
      return res.status(403).json({ error: 'Forbidden: missing permission ' + permissionKey });
    }
    next();
  };
}

// Allow passing any of a set of permissions (OR logic)
export function requireAnyPermission(...permissionKeys) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role === 'admin') return next();
    const perms = req.user.permissions || {};
    const ok = permissionKeys.some((k) => perms[k]);
    if (!ok)
      return res
        .status(403)
        .json({ error: 'Forbidden: requires one of [' + permissionKeys.join(',') + ']' });
    next();
  };
}
