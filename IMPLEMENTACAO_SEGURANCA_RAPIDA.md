# 🚀 Implementação Rápida de Segurança

Este guia mostra como implementar as melhorias de segurança mais críticas em **menos de 30 minutos**.

---

## ⚡ Passo 1: Instalar Dependências (2 minutos)

```bash
cd backend
npm install helmet dompurify jsdom express-validator
```

**Dependências:**
- `helmet` - Headers de segurança HTTP
- `dompurify` + `jsdom` - Sanitização XSS
- `express-validator` - Validação de entrada

---

## ⚡ Passo 2: Atualizar server.js (5 minutos)

**Arquivo:** `backend/src/server.js`

**Adicionar imports no topo:**

```javascript
import { securityHeaders, globalRateLimiter, forceHTTPS, secureLogger } from './middleware/security.js';
import { sanitizeInput } from './middleware/validation.js';
```

**Aplicar middlewares ANTES das rotas:**

```javascript
const app = express();

// ✅ 1. Forçar HTTPS em produção (PRIMEIRO)
app.use(forceHTTPS);

// ✅ 2. Headers de segurança
app.use(securityHeaders);

// ✅ 3. Trust proxy (já existe, manter)
app.set('trust proxy', 1);

// ✅ 4. Rate limiting global
app.use('/api', globalRateLimiter);

// ✅ 5. Sanitização de entrada
app.use('/api', sanitizeInput);

// ✅ 6. Logger seguro (opcional, mas recomendado)
app.use(secureLogger);

// ... resto do código (CORS, bodyParser, rotas)
```

**Ordem completa recomendada:**

```javascript
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ✅ NOVOS IMPORTS
import { 
  securityHeaders, 
  globalRateLimiter, 
  forceHTTPS, 
  secureLogger 
} from './middleware/security.js';
import { sanitizeInput } from './middleware/validation.js';

import routes from './routes/index.js';
import scheduledBackupService from './services/scheduledBackupService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();

// ✅ 1. Forçar HTTPS (PRIMEIRO)
app.use(forceHTTPS);

// ✅ 2. Headers de segurança
app.use(securityHeaders);

// ✅ 3. Trust proxy
app.set('trust proxy', 1);

// ✅ 4. Rate limiting global
app.use('/api', globalRateLimiter);

// ✅ 5. Logger seguro
app.use(secureLogger);

// ✅ 6. Sanitização de entrada
app.use('/api', sanitizeInput);

// CORS (manter configuração existente)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://appestacionamento.vercel.app',
  // ... outros origins
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    const isAllowed = 
      allowedOrigins.includes(origin) ||
      origin.match(/^https:\/\/appestacionamento.*\.vercel\.app$/);
    
    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (origin.match(/^https:\/\/appestacionamento.*\.vercel\.app$/)) {
        return callback(null, true);
      }
      if (origin.match(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
        return callback(null, true);
      }
      console.warn(`🚫 CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(bodyParser.json());

// Rotas
app.use('/api', routes);
app.use('/', routes);

// Error handler (manter existente)
app.use((err, req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  console.error(err.stack);
  if (res.headersSent) return next(err);
  
  // Não expor stack trace em produção
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  scheduledBackupService
    .loadBackupConfig()
    .then(() => {
      console.log('Scheduled backup service initialized');
    })
    .catch((err) => {
      console.error('Failed to initialize scheduled backups:', err);
    });
});
```

---

## ⚡ Passo 3: Corrigir JWT_SECRET (3 minutos)

**Arquivo:** `backend/src/middleware/auth.js`

**Substituir:**

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
```

**Por:**

```javascript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ JWT_SECRET é obrigatório em produção! Configure a variável de ambiente.');
  }
  console.warn('⚠️  AVISO: Usando JWT_SECRET padrão (apenas desenvolvimento)');
}

const SECRET = JWT_SECRET || 'dev-secret-change-me';
```

**E atualizar todas as referências de `JWT_SECRET` para `SECRET` no arquivo.**

**Também atualizar:** `backend/src/controllers/authController.js` (mesma mudança)

---

## ⚡ Passo 4: Gerar JWT_SECRET Seguro (2 minutos)

```bash
# Gerar secret seguro
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Copiar o output e adicionar ao `.env`:**

```env
JWT_SECRET=<cole-o-secret-gerado-aqui>
```

**⚠️ IMPORTANTE:** Nunca commitar o `.env` no Git!

---

## ⚡ Passo 5: Adicionar Validação em Rotas Críticas (10 minutos)

**Exemplo: Atualizar rota de login**

**Arquivo:** `backend/src/routes/index.js`

**Adicionar import:**

```javascript
import { validateLogin } from '../middleware/validation.js';
```

**Aplicar na rota de login:**

```javascript
// ANTES:
router.post('/auth/login', authController.login);

// DEPOIS:
router.post('/auth/login', validateLogin, authController.login);
```

**Outras rotas recomendadas:**

```javascript
import { 
  validateUserCreate, 
  validatePasswordChange,
  validateMonthlyCustomer,
  validateTicket 
} from '../middleware/validation.js';

// Usuários
router.post('/users', requireAdmin, validateUserCreate, usersController.create);

// Mudança de senha
router.post('/auth/change-password', requireAuth, validatePasswordChange, authController.changePassword);

// Clientes mensalistas
router.post('/monthlyCustomers', requireAuth, validateMonthlyCustomer, monthlyController.create);

// Tickets
router.post('/tickets', requireAuth, validateTicket, ticketsController.create);
```

---

## ⚡ Passo 6: Testar (5 minutos)

```bash
# Reiniciar servidor
cd backend
npm start

# Testar em outro terminal
curl http://localhost:3000/api/health
```

**Verificar:**

1. ✅ Servidor inicia sem erros
2. ✅ Headers de segurança presentes:
   ```bash
   curl -I http://localhost:3000/api/health
   # Deve mostrar: X-Content-Type-Options, X-Frame-Options, etc
   ```
3. ✅ Rate limiting funciona:
   ```bash
   # Fazer 201 requisições rápidas - deve bloquear na 201ª
   for i in {1..201}; do curl http://localhost:3000/api/health; done
   ```
4. ✅ Validação funciona:
   ```bash
   # Deve retornar erro de validação
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"login":"ab","password":"123"}'
   ```

---

## ✅ Checklist de Implementação

- [ ] Dependências instaladas
- [ ] `server.js` atualizado com middlewares
- [ ] `auth.js` corrigido (JWT_SECRET)
- [ ] `authController.js` corrigido (JWT_SECRET)
- [ ] JWT_SECRET gerado e adicionado ao `.env`
- [ ] Validação aplicada em rotas críticas
- [ ] Servidor testado e funcionando
- [ ] Headers de segurança verificados
- [ ] Rate limiting testado

---

## 🎯 Resultado

Após implementar estes passos, você terá:

✅ **Headers de segurança HTTP** (Helmet)
✅ **Proteção contra XSS** (Sanitização)
✅ **Rate limiting global** (Proteção DDoS básica)
✅ **Validação de entrada** (Prevenção de dados inválidos)
✅ **JWT_SECRET seguro** (Sem fallback em produção)
✅ **HTTPS forçado** (Em produção)
✅ **Logging seguro** (Dados sensíveis mascarados)

**Tempo total:** ~30 minutos  
**Nível de segurança:** ⬆️⬆️⬆️⬆️ (de 2 para 4 de 5)

---

## 🚨 Próximos Passos (Opcional)

Após implementar o básico, considere:

1. **Logging de segurança estruturado** (ver `GUIA_SEGURANCA_COMPLETO.md`)
2. **Alertas de segurança** (email para admin)
3. **Dashboard de segurança** (visualizar tentativas de ataque)
4. **Testes de penetração** (contratar profissional)

---

## 📚 Documentação Completa

Para mais detalhes, consulte:
- `GUIA_SEGURANCA_COMPLETO.md` - Guia completo de segurança
- `SECURITY_AUDIT_COMPLETE.md` - Auditoria de segurança existente

---

**Última atualização:** Dezembro 2024

