import jwt from 'jsonwebtoken';

// JWT_SECRET validation - lazy to allow environment variables to be set
function getSecret() {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ JWT_SECRET não configurado em produção!');
      // Don't throw immediately, allow server to start and show better error
      return 'MISSING_JWT_SECRET_CONFIGURE_IN_RENDER';
    }
    console.warn(
      '⚠️  AVISO: Usando JWT_SECRET padrão (apenas desenvolvimento). Configure JWT_SECRET no .env para produção!'
    );
    return 'dev-secret-change-me';
  }

  return JWT_SECRET;
}

export function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, getSecret());
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
