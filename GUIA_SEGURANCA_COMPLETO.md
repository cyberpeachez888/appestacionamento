# 🔐 Guia Completo de Segurança - Sistema de Estacionamento

## 📋 Índice
1. [Análise de Vulnerabilidades Atuais](#análise-de-vulnerabilidades-atuais)
2. [Melhorias Críticas Imediatas](#melhorias-críticas-imediatas)
3. [Proteções Contra Ataques Comuns](#proteções-contra-ataques-comuns)
4. [Configurações de Produção](#configurações-de-produção)
5. [Monitoramento e Logging](#monitoramento-e-logging)
6. [Checklist de Segurança](#checklist-de-segurança)

---

## 🔍 Análise de Vulnerabilidades Atuais

### ✅ O que JÁ está implementado:

1. **Autenticação JWT** ✅
   - Tokens com expiração de 12h
   - Hash de senhas com bcrypt
   - Middleware de autenticação

2. **Rate Limiting** ✅
   - Limite de 5 tentativas de login por 15 minutos
   - Limite geral de 100 requisições por 15 minutos

3. **Controle de Acesso (RBAC)** ✅
   - Roles: admin e operator
   - Permissões granulares
   - Middleware de autorização

4. **Proteção de Senhas** ✅
   - Validação de força de senha
   - Prevenção de reutilização (últimas 3)
   - Expiração de senha (90 dias)
   - Bloqueio de conta após tentativas falhadas

5. **Audit Logging** ✅
   - Registro de ações importantes
   - Logs de tentativas de login

### ❌ O que FALTA implementar:

1. **Headers de Segurança HTTP** ❌
   - Falta Helmet.js para proteção básica
   - Sem Content-Security-Policy
   - Sem X-Frame-Options, X-Content-Type-Options

2. **Validação e Sanitização de Entrada** ⚠️
   - Validação básica existe, mas pode ser melhorada
   - Falta sanitização contra XSS
   - Falta validação de tipos e formatos

3. **Proteção CSRF** ❌
   - Sem tokens CSRF
   - Vulnerável a ataques cross-site

4. **JWT Secret Inseguro** ⚠️
   - Fallback para 'dev-secret-change-me' em produção
   - Deve ser obrigatório em produção

5. **HTTPS Enforcement** ❌
   - Sem redirecionamento forçado para HTTPS
   - Cookies sem flag Secure

6. **Logging de Segurança** ⚠️
   - Logs básicos existem, mas falta estrutura
   - Sem alertas de segurança
   - Sem dashboard de monitoramento

7. **Proteção de Dados Sensíveis** ⚠️
   - Dados podem estar expostos em logs
   - Falta mascaramento de informações sensíveis

---

## 🚨 Melhorias Críticas Imediatas

### 1. Instalar e Configurar Helmet.js

**Objetivo:** Proteger contra vulnerabilidades comuns via headers HTTP

**Passos:**

```bash
cd backend
npm install helmet
```

**Implementação:**

Adicionar ao `backend/src/server.js`:

```javascript
import helmet from 'helmet';

// Configurar Helmet ANTES de outras rotas
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Necessário para alguns frameworks
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL],
    },
  },
  crossOriginEmbedderPolicy: false, // Pode causar problemas com alguns recursos
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  }
}));
```

### 2. Melhorar JWT Secret

**Problema:** Fallback inseguro em produção

**Solução:**

1. Gerar secret seguro:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

2. Atualizar `backend/src/middleware/auth.js`:
```javascript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET é obrigatório em produção!');
  }
  console.warn('⚠️  Usando JWT_SECRET padrão (apenas desenvolvimento)');
}

const SECRET = JWT_SECRET || 'dev-secret-change-me';
```

3. Adicionar ao `.env`:
```env
JWT_SECRET=<seu-secret-gerado>
```

### 3. Implementar Validação e Sanitização

**Instalar dependências:**
```bash
npm install express-validator dompurify jsdom
```

**Criar middleware de validação:**

`backend/src/middleware/validation.js`:
```javascript
import { body, validationResult } from 'express-validator';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Sanitizar strings contra XSS
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [] });
}

// Sanitizar objeto recursivamente
export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const key in obj) {
    sanitized[key] = sanitizeObject(obj[key]);
  }
  return sanitized;
}

// Middleware de sanitização
export function sanitizeInput(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}

// Validação de erros
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array()
    });
  }
  next();
}

// Validadores comuns
export const validators = {
  email: body('email').isEmail().normalizeEmail(),
  login: body('login')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/),
  password: body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  plate: body('plate')
    .trim()
    .matches(/^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/),
  uuid: body('id').isUUID(),
};
```

**Usar nos controllers:**

```javascript
import { sanitizeInput, validators, handleValidationErrors } from '../middleware/validation.js';

// Aplicar sanitização em todas as rotas
app.use('/api', sanitizeInput);

// Exemplo de uso em rota específica
router.post('/users',
  validators.email,
  validators.login,
  validators.password,
  handleValidationErrors,
  usersController.create
);
```

### 4. Forçar HTTPS em Produção

**Adicionar ao `backend/src/server.js`:**

```javascript
// Forçar HTTPS em produção
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### 5. Melhorar Configuração de Cookies (se usar)

**Se implementar cookies no futuro:**

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET || JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true, // Não acessível via JavaScript
    sameSite: 'strict', // Proteção CSRF
    maxAge: 12 * 60 * 60 * 1000 // 12 horas
  }
}));
```

---

## 🛡️ Proteções Contra Ataques Comuns

### 1. SQL Injection

**Status:** ✅ Protegido (usa Supabase que previne SQL injection)

**Verificação:** Supabase usa prepared statements automaticamente. Não é necessário código adicional.

### 2. XSS (Cross-Site Scripting)

**Implementação:** Usar sanitização (item 3 acima)

**Frontend também precisa proteger:**

```typescript
// No frontend, sempre usar React que já escapa por padrão
// Mas para conteúdo HTML dinâmico:
import DOMPurify from 'dompurify';

function renderHTML(html: string) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}
```

### 3. CSRF (Cross-Site Request Forgery)

**Opção 1: Token CSRF (recomendado para forms)**

```bash
npm install csurf
```

```javascript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

// Aplicar em rotas que modificam dados
app.use('/api', csrfProtection);

// Endpoint para obter token
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

**Opção 2: SameSite Cookies (mais simples)**

Já implementado no item 5 acima.

### 4. Brute Force

**Status:** ✅ Já implementado com rate limiting

**Melhorias opcionais:**

```javascript
// Rate limiting mais agressivo após múltiplas falhas
import rateLimit from 'express-rate-limit';

export const aggressiveLoginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 tentativas por hora
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    // Log IP para possível bloqueio
    console.warn(`⚠️  Múltiplas tentativas de login do IP: ${req.ip}`);
    res.status(429).json({
      error: 'Muitas tentativas. Conta bloqueada temporariamente.',
      retryAfter: '1 hora'
    });
  }
});
```

### 5. Session Hijacking

**Proteções:**

1. **Rotação de tokens:**
```javascript
// No login, invalidar tokens antigos
// Adicionar campo `token_version` na tabela users
// Incrementar a cada mudança de senha/login
```

2. **Detecção de IP diferente:**
```javascript
// No middleware de auth
export function requireAuth(req, res, next) {
  // ... validação JWT ...
  
  // Verificar se IP mudou (opcional, pode ser muito restritivo)
  const tokenIP = req.user.lastLoginIP;
  const currentIP = req.ip;
  
  if (tokenIP && tokenIP !== currentIP && process.env.STRICT_IP_CHECK === 'true') {
    console.warn(`⚠️  IP diferente detectado: ${tokenIP} -> ${currentIP}`);
    // Opcional: invalidar token e forçar novo login
  }
  
  next();
}
```

### 6. DDoS (Distributed Denial of Service)

**Proteções:**

1. **Rate limiting global:**
```javascript
import rateLimit from 'express-rate-limit';

// Limite geral mais restritivo
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Ajustar conforme necessário
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalLimiter);
```

2. **Usar serviço de proteção:**
   - Cloudflare (recomendado)
   - AWS WAF
   - Render/Vercel já oferecem proteção básica

### 7. Exposição de Dados Sensíveis

**Proteções:**

1. **Mascarar dados em logs:**
```javascript
function maskSensitiveData(obj) {
  const sensitive = ['password', 'password_hash', 'token', 'secret', 'email'];
  const masked = { ...obj };
  
  for (const key in masked) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }
  
  return masked;
}

// Usar antes de logar
console.log('Request body:', maskSensitiveData(req.body));
```

2. **Não retornar dados sensíveis:**
```javascript
// Sempre filtrar antes de retornar
function toSafeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}
```

---

## 🏭 Configurações de Produção

### 1. Variáveis de Ambiente Obrigatórias

**Criar arquivo `.env.example`:**

```env
# Obrigatórias
JWT_SECRET=<gerar-com-crypto-randomBytes>
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon-key

# Opcionais mas recomendadas
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://seu-dominio.com
SESSION_SECRET=<gerar-secret-diferente>
STRICT_IP_CHECK=false

# Segurança
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
PASSWORD_MIN_LENGTH=8
PASSWORD_EXPIRATION_DAYS=90
```

**Script de verificação:**

`backend/scripts/check-env.js` (já existe, melhorar):

```javascript
const REQUIRED_VARS = [
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

const missing = REQUIRED_VARS.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Variáveis de ambiente faltando:', missing);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
} else {
  console.log('✅ Todas as variáveis obrigatórias estão configuradas');
}
```

### 2. Configuração de CORS para Produção

**Atualizar `backend/src/server.js`:**

```javascript
const allowedOrigins = [
  // Produção
  process.env.FRONTEND_URL,
  // Desenvolvimento (apenas se NODE_ENV !== 'production')
  ...(process.env.NODE_ENV !== 'production' ? [
    'http://localhost:5173',
    'http://localhost:3000',
  ] : [])
].filter(Boolean); // Remove undefined

app.use(cors({
  origin: function (origin, callback) {
    // Em produção, não permitir requisições sem origin
    if (process.env.NODE_ENV === 'production' && !origin) {
      return callback(new Error('CORS: Origin required in production'));
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS bloqueado: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 horas
}));
```

### 3. Desabilitar Informações de Debug

```javascript
// Não expor stack traces em produção
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack }) // Apenas em desenvolvimento
  });
});
```

### 4. Timeout de Requisições

```javascript
import timeout from 'connect-timeout';

// Timeout de 30 segundos
app.use(timeout('30s'));

app.use((req, res, next) => {
  if (!req.timedout) next();
});
```

---

## 📊 Monitoramento e Logging

### 1. Estrutura de Logs de Segurança

**Criar `backend/src/services/securityLogger.js`:**

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function logSecurityEvent({
  type, // 'login_attempt', 'password_change', 'permission_change', etc
  severity, // 'low', 'medium', 'high', 'critical'
  userId,
  ipAddress,
  userAgent,
  details,
  success = true
}) {
  try {
    await supabase.from('security_logs').insert({
      type,
      severity,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      success,
      created_at: new Date().toISOString()
    });
    
    // Log crítico também no console
    if (severity === 'critical') {
      console.error(`🚨 SECURITY ALERT [${type}]:`, {
        userId,
        ipAddress,
        details
      });
    }
  } catch (error) {
    console.error('Erro ao registrar log de segurança:', error);
  }
}

// Helper functions
export const securityLog = {
  loginAttempt: (data) => logSecurityEvent({ type: 'login_attempt', ...data }),
  passwordChange: (data) => logSecurityEvent({ type: 'password_change', severity: 'high', ...data }),
  permissionChange: (data) => logSecurityEvent({ type: 'permission_change', severity: 'high', ...data }),
  suspiciousActivity: (data) => logSecurityEvent({ type: 'suspicious_activity', severity: 'critical', ...data }),
};
```

**Criar tabela no Supabase:**

```sql
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES users(id),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_security_logs_type ON security_logs(type);
CREATE INDEX idx_security_logs_severity ON security_logs(severity);
CREATE INDEX idx_security_logs_created ON security_logs(created_at DESC);
```

### 2. Alertas de Segurança

**Integração com email (opcional):**

```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  // Configurar conforme seu provedor
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendSecurityAlert({ type, severity, details }) {
  if (severity !== 'critical') return; // Apenas críticos
  
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 Alerta de Segurança: ${type}`,
      html: `
        <h2>Alerta de Segurança</h2>
        <p><strong>Tipo:</strong> ${type}</p>
        <p><strong>Severidade:</strong> ${severity}</p>
        <pre>${JSON.stringify(details, null, 2)}</pre>
      `
    });
  } catch (error) {
    console.error('Erro ao enviar alerta:', error);
  }
}
```

### 3. Dashboard de Segurança (Futuro)

**Endpoints para dashboard:**

```javascript
// GET /api/security/stats
router.get('/security/stats', requireAdmin, async (req, res) => {
  const { start, end } = req.query;
  
  const stats = await supabase
    .from('security_logs')
    .select('type, severity, success, created_at')
    .gte('created_at', start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .lte('created_at', end || new Date());
  
  // Processar estatísticas
  res.json({
    totalEvents: stats.data.length,
    byType: groupBy(stats.data, 'type'),
    bySeverity: groupBy(stats.data, 'severity'),
    failedLogins: stats.data.filter(e => e.type === 'login_attempt' && !e.success).length
  });
});
```

---

## ✅ Checklist de Segurança

### Configuração Inicial

- [ ] JWT_SECRET configurado e seguro (não usar fallback em produção)
- [ ] Todas as variáveis de ambiente obrigatórias configuradas
- [ ] HTTPS habilitado e forçado em produção
- [ ] CORS configurado apenas para origens permitidas
- [ ] Helmet.js instalado e configurado

### Autenticação e Autorização

- [ ] Rate limiting configurado em endpoints de autenticação
- [ ] Bloqueio de conta após tentativas falhadas
- [ ] Validação de força de senha implementada
- [ ] Prevenção de reutilização de senhas
- [ ] Expiração de senhas configurada
- [ ] Tokens JWT com expiração adequada
- [ ] Middleware de autenticação em todas as rotas protegidas

### Proteção de Dados

- [ ] Sanitização de entrada implementada
- [ ] Validação de tipos e formatos
- [ ] Dados sensíveis mascarados em logs
- [ ] Senhas nunca retornadas em respostas
- [ ] Headers de segurança HTTP configurados

### Monitoramento

- [ ] Logs de segurança implementados
- [ ] Tentativas de login registradas
- [ ] Mudanças de permissão registradas
- [ ] Alertas para atividades suspeitas (opcional)
- [ ] Dashboard de segurança (opcional)

### Produção

- [ ] NODE_ENV=production configurado
- [ ] Stack traces desabilitados em produção
- [ ] Timeout de requisições configurado
- [ ] Backup automático configurado
- [ ] Plano de recuperação de desastres documentado

### Manutenção Contínua

- [ ] Dependências atualizadas regularmente
- [ ] Logs revisados periodicamente
- [ ] Testes de segurança realizados
- [ ] Política de senhas revisada
- [ ] Usuários inativos desativados

---

## 🚀 Próximos Passos Recomendados

### Prioridade ALTA (Fazer Agora):

1. ✅ Instalar e configurar Helmet.js
2. ✅ Corrigir JWT_SECRET (remover fallback em produção)
3. ✅ Implementar sanitização de entrada
4. ✅ Forçar HTTPS em produção

### Prioridade MÉDIA (Próximas Semanas):

5. ✅ Implementar logging de segurança estruturado
6. ✅ Melhorar validação de entrada
7. ✅ Adicionar proteção CSRF (se necessário)
8. ✅ Configurar alertas de segurança

### Prioridade BAIXA (Melhorias Futuras):

9. ⚪ Dashboard de segurança
10. ⚪ Integração com serviços de monitoramento (Sentry, etc)
11. ⚪ Testes de penetração
12. ⚪ Certificação de segurança

---

## 📚 Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Supabase Security](https://supabase.com/docs/guides/auth/security)

---

**Última atualização:** Dezembro 2024  
**Versão:** 1.0  
**Status:** Documento de referência para implementação

