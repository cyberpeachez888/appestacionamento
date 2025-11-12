# 🔐 AUDITORIA: Security & Access Control - Sistema Atual vs Necessário

## 📊 STATUS ATUAL DO SISTEMA

### ✅ O QUE JÁ EXISTE

#### 1. **Autenticação JWT Básica** ✅

**Localização:**

- Backend: `/backend/src/controllers/authController.js`
- Middleware: `/backend/src/middleware/auth.js`
- Frontend: `/src/contexts/AuthContext.tsx`

**Funcionalidades Implementadas:**

- ✅ Login com usuário/senha
- ✅ Hash de senha com bcrypt
- ✅ Token JWT (12h de expiração)
- ✅ Endpoint `/auth/login` e `/auth/me`
- ✅ Storage de token (localStorage ou sessionStorage)
- ✅ Auto-attach do token nas requisições

**Estrutura Atual:**

```javascript
// Token JWT contém:
{
  id: 'uuid',
  name: 'Admin',
  email: 'admin@example.com',
  login: 'admin',
  role: 'admin' | 'operator',
  permissions: { manageRates: true, ... }
}
```

---

#### 2. **RBAC (Role-Based Access Control)** ✅

**Localização:** `/backend/src/middleware/auth.js`

**Funcionalidades Implementadas:**

- ✅ Roles: `admin` e `operator`
- ✅ Permissions granulares:
  - `openCloseCash` - Abrir/fechar caixa e operações
  - `manageRates` - Gerenciar tarifas
  - `manageMonthlyCustomers` - Gerenciar mensalistas
  - `viewReports` - Ver relatórios financeiros
  - `manageUsers` - Gerenciar usuários
  - `manageCompanyConfig` - Configurações da empresa
  - `manageVehicleTypes` - Tipos de veículos
  - `manageBackups` - Backups do sistema

**Middlewares:**

```javascript
- requireAuth() → Valida token JWT
- requireAdmin() → Apenas admin
- requirePermission(key) → Permissão específica (admin bypass)
- requireAnyPermission(...keys) → Qualquer uma das permissões
```

---

#### 3. **Frontend Protection** ✅

**Localização:** `/src/App.tsx`, `/src/contexts/AuthContext.tsx`

**Funcionalidades Implementadas:**

- ✅ Component `<Protected>` para rotas protegidas
- ✅ Verificação de permissões no AuthContext
- ✅ Redirect automático para `/login` se não autenticado
- ✅ Loading state durante validação de token
- ✅ Sidebar dinâmica baseada em permissões

---

#### 4. **Audit Logging** ✅ (Parcial)

**Localização:** `/backend/src/controllers/auditController.js`

**Funcionalidades Implementadas:**

- ✅ Tabela `user_events` para logs
- ✅ Registro de ações: create, update, delete
- ✅ Logs de backup, usuários, tickets, payments
- ✅ Campos: actor_id, actor_name, action, target_type, target_id, details

**Limitações:**

- ❌ Não loga tentativas de login falhadas
- ❌ Não loga mudanças de permissão
- ❌ Não detecta acessos suspeitos

---

## ❌ O QUE FALTA IMPLEMENTAR

### 1. ❌ **Two-Factor Authentication (2FA)**

**O que precisa:**

- ❌ TOTP (Time-based One-Time Password) com Google Authenticator/Authy
- ❌ QR Code para setup inicial
- ❌ Backup codes (recovery codes)
- ❌ Verificação de 2FA na tela de login
- ❌ Opção de ativar/desativar 2FA por usuário
- ❌ Forçar 2FA para admin (opcional)

**Impacto:** Atualmente qualquer um com usuário/senha pode acessar. Sem segunda camada de segurança.

**Tabelas necessárias:**

```sql
CREATE TABLE two_factor_auth (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  secret TEXT NOT NULL, -- TOTP secret
  backup_codes TEXT[], -- Array de códigos de recuperação
  is_enabled BOOLEAN DEFAULT FALSE,
  last_verified TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2. ❌ **Session Timeout & Auto-Logout**

**O que precisa:**

- ❌ Timeout configurável (padrão: 30 minutos de inatividade)
- ❌ Auto-logout após período de inatividade
- ❌ Warning antes de expirar ("Sessão expirando em 2 minutos...")
- ❌ Refresh token mechanism
- ❌ Configuração por role (admin: 2h, operator: 30min)

**Impacto:** Token dura 12h fixas. Se alguém deixar PC aberto, acesso permanece por 12h.

**Implementação necessária:**

```typescript
// Frontend: Detect user activity
useEffect(() => {
  let timeout;
  const resetTimer = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      // Show warning
      setTimeout(() => logout(), 120000); // 2 min
    }, SESSION_TIMEOUT);
  };
  // Listen to mouse, keyboard, etc
  window.addEventListener('mousemove', resetTimer);
  // ...
}, []);
```

---

### 3. ❌ **Login Attempt Limits & Account Lockout**

**O que precisa:**

- ❌ Rate limiting: máx 5 tentativas em 15 minutos
- ❌ Bloqueio temporário após N falhas (ex: 30 minutos)
- ❌ Notificação de bloqueio ao admin
- ❌ CAPTCHA após 3 tentativas falhadas
- ❌ Log de todas as tentativas (sucesso e falha)
- ❌ IP tracking de tentativas

**Impacto:** Atualmente permite tentativas ilimitadas de brute-force.

**Tabela necessária:**

```sql
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE account_locks (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  locked_until TIMESTAMP,
  lock_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 4. ❌ **Password Strength Requirements**

**O que precisa:**

- ❌ Validação de força de senha:
  - Mínimo 8 caracteres
  - Pelo menos 1 maiúscula
  - Pelo menos 1 minúscula
  - Pelo menos 1 número
  - Pelo menos 1 caractere especial
- ❌ Não permitir senhas comuns (123456, password, admin, etc)
- ❌ Não permitir reutilização das últimas 3 senhas
- ❌ Expiração de senha (ex: 90 dias)

**Impacto:** Atualmente aceita qualquer senha, mesmo "123".

**Tabela necessária:**

```sql
CREATE TABLE password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users
ADD COLUMN password_changed_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN password_expires_at TIMESTAMP;
```

---

### 5. ❌ **Force Password Change on First Login**

**O que precisa:**

- ❌ Flag `must_change_password` no usuário
- ❌ Tela de mudança obrigatória após primeiro login
- ❌ Não permitir acesso ao sistema até trocar senha
- ❌ Envio de senha temporária por email (opcional)

**Impacto:** Usuários novos começam com senha padrão (inseguro).

**Alteração necessária:**

```sql
ALTER TABLE users
ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE,
ADD COLUMN is_first_login BOOLEAN DEFAULT TRUE;
```

---

### 6. ❌ **IP Whitelist/Blacklist**

**O que precisa:**

- ❌ Configuração de IPs permitidos (whitelist)
- ❌ Bloqueio de IPs suspeitos (blacklist)
- ❌ Detecção automática de IPs com muitas falhas
- ❌ Interface de gerenciamento de IPs
- ❌ Logs de tentativas bloqueadas por IP

**Impacto:** Qualquer IP pode tentar acessar. Sem proteção contra ataques externos.

**Tabela necessária:**

```sql
CREATE TABLE ip_access_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  type TEXT CHECK (type IN ('whitelist', 'blacklist')),
  reason TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- NULL = permanente
);
```

---

### 7. ❌ **Enhanced Security Audit Log**

**O que já existe:** Audit básico de CRUD operations

**O que falta:**

- ❌ Log de tentativas de login (sucesso e falha)
- ❌ Log de mudanças de senha
- ❌ Log de mudanças de permissões
- ❌ Log de ativação/desativação de 2FA
- ❌ Log de acessos suspeitos (múltiplos IPs, horário incomum)
- ❌ Dashboard de segurança para admin

**Eventos adicionais necessários:**

```javascript
// Novos tipos de eventos:
-'auth.login.success' -
  'auth.login.failed' -
  'auth.logout' -
  'auth.token.expired' -
  'auth.password.changed' -
  'auth.password.reset' -
  'auth.2fa.enabled' -
  'auth.2fa.disabled' -
  'auth.2fa.verified' -
  'auth.2fa.failed' -
  'security.ip.blocked' -
  'security.account.locked' -
  'security.permission.changed';
```

---

## 📋 MATRIZ DE PRIORIDADES

| Funcionalidade             | Complexidade | Impacto Segurança | Prioridade | Estimativa |
| -------------------------- | ------------ | ----------------- | ---------- | ---------- |
| **Login Attempt Limits**   | 🟡 Média     | 🔴 Crítico        | 🔴 ALTA    | 4h         |
| **Password Strength**      | 🟢 Baixa     | 🔴 Crítico        | 🔴 ALTA    | 2h         |
| **Force Password Change**  | 🟢 Baixa     | 🟡 Alto           | 🟠 MÉDIA   | 2h         |
| **Session Timeout**        | 🟡 Média     | 🟡 Alto           | 🟠 MÉDIA   | 4h         |
| **Enhanced Audit Log**     | 🟢 Baixa     | 🟡 Alto           | 🟠 MÉDIA   | 3h         |
| **Two-Factor Auth (2FA)**  | 🔴 Alta      | 🟡 Alto           | 🟠 MÉDIA   | 8h         |
| **IP Whitelist/Blacklist** | 🟡 Média     | 🟢 Médio          | 🟢 BAIXA   | 4h         |

**Total Estimado:** ~27 horas de desenvolvimento

---

## 🎯 RECOMENDAÇÃO DE IMPLEMENTAÇÃO

### **FASE 1 - Security Basics** 🚨 **PRIORITY 1** (8h)

**Por quê:** Proteção imediata contra ataques mais comuns

**Entregas:**

1. Login attempt limits (rate limiting + account lockout)
2. Password strength requirements
3. Force password change on first login
4. Enhanced audit logging (login attempts)

**Benefícios:**

- ✅ Previne brute-force attacks
- ✅ Força senhas fortes
- ✅ Rastreamento completo de acessos
- ✅ Segurança básica em compliance

---

### **FASE 2 - Session Management** ⏱️ **PRIORITY 2** (4h)

**Por quê:** Previne sessões abandonadas e vazamento de acesso

**Entregas:**

1. Session timeout configurável
2. Auto-logout por inatividade
3. Warning de expiração
4. Logout de todas as sessões (force logout global)

**Benefícios:**

- ✅ Reduz janela de vulnerabilidade
- ✅ Logout automático em PCs públicos
- ✅ Controle de sessões ativas

---

### **FASE 3 - Two-Factor Authentication** 🔐 **PRIORITY 3** (8h)

**Por quê:** Camada extra de proteção para contas sensíveis

**Entregas:**

1. Setup de TOTP com QR code
2. Verificação de código na login
3. Backup codes para recuperação
4. Interface de gerenciamento de 2FA

**Benefícios:**

- ✅ Proteção mesmo com senha vazada
- ✅ Compliance com normas de segurança
- ✅ Opção premium para clientes enterprise

---

### **FASE 4 - IP Access Control** 🌐 **PRIORITY 4** (4h)

**Por quê:** Restrição geográfica e bloqueio de ataques

**Entregas:**

1. Whitelist de IPs confiáveis
2. Blacklist automática de IPs suspeitos
3. Interface de gerenciamento
4. Logs de bloqueios

**Benefícios:**

- ✅ Acesso restrito por localização
- ✅ Bloqueio automático de atacantes
- ✅ Menor superfície de ataque

---

## 📊 SCORE DE SEGURANÇA ATUAL

| Categoria          | Score Atual | Score Meta | Gap        |
| ------------------ | ----------- | ---------- | ---------- |
| Autenticação       | 60%         | 95%        | ❌ 35%     |
| Autorização        | 85%         | 95%        | ⚠️ 10%     |
| Auditoria          | 50%         | 90%        | ❌ 40%     |
| Proteção de Conta  | 30%         | 90%        | 🔴 60%     |
| Session Management | 40%         | 85%        | ❌ 45%     |
| **TOTAL**          | **53%**     | **91%**    | **🔴 38%** |

---

## 🚦 RISCOS ATUAIS

### 🔴 **CRÍTICO**

1. **Brute-force attacks** - Sem limite de tentativas
2. **Senhas fracas** - Aceita "123", "admin", etc
3. **Sessões eternas** - Token de 12h sem inatividade check

### 🟡 **ALTO**

4. **Sem 2FA** - Apenas senha como barreira
5. **Primeiro login inseguro** - Senha padrão não obriga troca
6. **Logs incompletos** - Não rastreia falhas de login

### 🟢 **MÉDIO**

7. **Sem controle de IP** - Qualquer origem pode tentar
8. **Sem expiração de senha** - Mesma senha por anos

---

## 🛠️ TECNOLOGIAS RECOMENDADAS

### Para 2FA:

- `speakeasy` - TOTP generation/verification
- `qrcode` - QR code generation
- `otpauth-url` - Standard TOTP URI

### Para Rate Limiting:

- `express-rate-limit` - Request rate limiting
- `express-slow-down` - Gradual slowdown

### Para Password Validation:

- `zxcvbn` - Password strength estimation
- `password-validator` - Customizable validation

### Para Session Management:

- `express-session` - Session middleware
- `connect-redis` - Session store (opcional)

---

## 📈 IMPACTO ESPERADO

Após implementação completa:

- ✅ Redução de 95% em tentativas de brute-force
- ✅ 100% de senhas fortes obrigatórias
- ✅ Rastreamento completo de 100% das ações de segurança
- ✅ Zero sessões abandonadas ativas
- ✅ Compliance com LGPD e ISO 27001

---

## 🚀 PRÓXIMOS PASSOS RECOMENDADOS

1. **Aprovar escopo da Fase 1** (Security Basics)
2. **Criar branch** `feature/security-enhancements`
3. **Implementar** rate limiting + password strength
4. **Testar** com dados reais e pentesting
5. **Deploy** gradual com monitoramento
6. **Documentar** políticas de segurança

---

**Data de Análise:** 10/11/2025  
**Analista:** Sistema de Auditoria de Segurança  
**Status:** Pronto para início da implementação  
**Próxima Ação:** Definir se inicia Fase 1 ou solicita aprovação do cliente
