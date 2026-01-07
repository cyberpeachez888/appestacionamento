import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory (two levels up from config/)
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
// IMPORTANTE: Backend deve usar SERVICE_ROLE_KEY para bypassar RLS
// Se não existir, usa ANON_KEY (mas operações podem falhar por RLS)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

let supabase;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    '⚠️  SUPABASE_URL or SUPABASE_KEY not set. Falling back to in-memory store for development/testing.'
  );
  console.warn('SUPABASE_URL:', SUPABASE_URL);
  console.warn('SUPABASE_KEY:', SUPABASE_KEY ? 'SET' : 'NOT SET');

  // Minimal in-memory fallback that mimics required supabase.from(...).
  const store = {
    rates: [],
    monthly_customers: [],
    tickets: [],
    payments: [],
    company_config: [],
    users: [], // added for auth fallback
    user_events: [], // audit log fallback table
    expenses: [], // expenses table for financial management
    manual_revenues: [], // manual revenues table (sublocação and others)
  };

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function makeQuery(table) {
    let rows = store[table] || [];
    const state = { filter: null, orderBy: null, limitNum: null };

    const api = {
      select: (/*cols*/) => api,
      insert: (payload) => {
        const items = Array.isArray(payload) ? payload : [payload];
        store[table] = (store[table] || []).concat(items);
        return {
          ...api,
          _insertedData: clone(items),
          single: async () => ({ data: clone(items[0]), error: null }),
        };
      },
      update: (payload) => {
        state._updatePayload = payload;
        return api;
      },
      upsert: (payload) => {
        const items = Array.isArray(payload) ? payload : [payload];
        const upserted = items.map((item) => {
          const idx = store[table].findIndex((r) => r.id === item.id);
          if (idx >= 0) {
            store[table][idx] = { ...store[table][idx], ...item };
            return store[table][idx];
          } else {
            store[table].push(item);
            return item;
          }
        });
        return {
          ...api,
          select: () => ({
            ...api,
            single: async () => ({ data: clone(upserted[0]), error: null }),
          }),
        };
      },
      delete: async () => {
        if (!state.filter) return { data: null, error: 'No filter for delete' };
        store[table] = store[table].filter((r) => !state.filter(r));
        return { data: null, error: null };
      },
      eq: (field, value) => {
        state.filter = (r) => r[field] === value;
        return api;
      },
      gte: (field, value) => {
        state.filter = (r) => new Date(r[field]) >= new Date(value);
        return api;
      },
      lte: (field, value) => {
        state.filter = (r) => new Date(r[field]) <= new Date(value);
        return api;
      },
      order: (field, opts) => {
        state.orderBy = { field, opts };
        return api;
      },
      limit: (n) => {
        state.limitNum = n;
        return api;
      },
      single: async () => {
        // Handle update with filter
        if (state._updatePayload) {
          if (!state.filter) return { data: null, error: 'No filter for update' };
          let updated = null;
          store[table] = store[table].map((r) => {
            if (state.filter(r)) {
              const nu = { ...r, ...state._updatePayload };
              updated = nu;
              return nu;
            }
            return r;
          });
          return { data: updated ? clone(updated) : null, error: updated ? null : 'Not found' };
        }
        // Handle select with filter
        let res = store[table];
        if (state.filter) res = res.filter(state.filter);
        if (state.orderBy)
          res = res.sort((a, b) => (a[state.orderBy.field] > b[state.orderBy.field] ? 1 : -1));
        const out = res[0] ? clone(res[0]) : null;
        return { data: out, error: out ? null : { message: 'No rows' } };
      },
      maybeSingle: async () => {
        // same as single but never returns error when not found
        const { data } = await api.single();
        return { data, error: null };
      },
      selectAll: async () => {
        let res = store[table];
        if (state.filter) res = res.filter(state.filter);
        if (state.orderBy)
          res = res.sort((a, b) => (a[state.orderBy.field] > b[state.orderBy.field] ? 1 : -1));
        if (state.limitNum) res = res.slice(0, state.limitNum);
        return { data: clone(res), error: null };
      },
      // used by controllers which call select() then await the returned object
      then: async (resolve) => {
        const r = await api.selectAll();
        return resolve(r);
      },
    };
    return api;
  }

  supabase = { from: (table) => makeQuery(table) };
} else {
  const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON';
  console.log(`✅ Connecting to Supabase: ${SUPABASE_URL}`);
  console.log(`🔑 Using ${keyType} key`);

  if (keyType === 'ANON') {
    console.warn('⚠️  WARNING: Using ANON key - RLS policies will be enforced!');
    console.warn('⚠️  Set SUPABASE_SERVICE_ROLE_KEY in .env to bypass RLS');
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ============================================
// FUNÇÕES UTILITÁRIAS - ADICIONE AQUI
// ============================================

export function getScopedSupabaseClient(req) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[Supabase] Usando cliente in-memory (sem RLS)');
    return supabase;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Token de autenticação não fornecido');
    error.statusCode = 401;
    error.code = 'AUTH_TOKEN_MISSING';
    throw error;
  }

  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    const error = new Error('Token vazio ou inválido');
    error.statusCode = 401;
    error.code = 'AUTH_TOKEN_INVALID';
    throw error;
  }

  const scopedClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  console.log(`[Supabase] Cliente escopado criado (token: ${token.substring(0, 15)}...)`);

  return scopedClient;
}

export async function getAuthenticatedUser(req) {
  if (req.user) {
    console.log(`[Auth] Usando usuário do middleware: ${req.user.id}`);
    return req.user;
  }

  const scopedClient = getScopedSupabaseClient(req);

  const { data: { user }, error } = await scopedClient.auth.getUser();

  if (error || !user) {
    const authError = new Error('Falha ao autenticar usuário');
    authError.statusCode = 401;
    authError.code = 'AUTH_USER_INVALID';
    authError.details = error;
    throw authError;
  }

  console.log(`[Auth] Usuário autenticado via Supabase: ${user.id} (${user.email})`);

  return user;
}

export function attachScopedSupabase(req, res, next) {
  try {
    req.supabase = getScopedSupabaseClient(req);
    next();
  } catch (error) {
    res.status(error.statusCode || 401).json({
      error: error.message,
      code: error.code,
      hint: 'Certifique-se de incluir o header: Authorization: Bearer <token>'
    });
  }
}

// ============================================
// EXPORT FINAL
// ============================================
export { supabase };
