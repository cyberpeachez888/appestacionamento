# Fix: ChangePasswordDialog - Botão Desabilitado e Barra de Senha

## Problema Identificado

O usuário completou o setup inicial com sucesso e fez login, mas ao tentar alterar a senha obrigatória do primeiro acesso:
- ✗ Botão "Alterar" permanecia desabilitado
- ✗ Barra de força da senha não preenchia (ficava apagada)
- ✗ Mesmo com senha válida e requisitos atendidos, nada acontecia

## Causa Raiz

O componente `ChangePasswordDialog.tsx` estava fazendo chamadas HTTP diretas usando `fetch()` para endpoints relativos como `/api/auth/validate-password`, em vez de usar o cliente API centralizado que conhece a URL base correta (`http://localhost:3000`).

Além disso, havia bugs no backend:
1. **Bug no authController.js**: Tentava acessar `validation.isValid` mas a função `validatePassword()` retorna `validation.valid`
2. **Estrutura de resposta incorreta**: Retornava `strength` como número, mas o frontend esperava `{ score: number, feedback: {...} }`

## Correções Implementadas

### 1. Frontend: `src/components/ChangePasswordDialog.tsx`
✅ Adicionado import do cliente API centralizado:
```typescript
import api from '@/lib/api';
```

✅ Refatorado `fetchPasswordRequirements()`:
```typescript
const fetchPasswordRequirements = async () => {
  try {
    const data = await api.getPasswordRequirements();
    setPasswordRequirements(data);
  } catch (err) {
    console.error('Error fetching password requirements:', err);
  }
};
```

✅ Refatorado `validatePasswordStrength()`:
```typescript
const validatePasswordStrength = async (password: string) => {
  try {
    const data = await api.validatePasswordStrength(password);
    setValidation(data);
  } catch (err) {
    console.error('Error validating password:', err);
  }
};
```

✅ Refatorado `handleSubmit()`:
```typescript
await api.changePassword({
  currentPassword: isFirstLogin ? undefined : currentPassword,
  newPassword
});
```

✅ Corrigida interface TypeScript:
```typescript
interface PasswordValidation {
  valid: boolean;
  errors: string[];
  strength?: {
    score: number;
    feedback?: {  // Tornado opcional
      warning?: string;
      suggestions?: string[];
    };
  };
  suggestions?: string[];
}
```

### 2. Frontend: `src/lib/api.ts`
✅ Adicionados métodos para validação de senha:
```typescript
async validatePasswordStrength(password: string) {
  return this.request<{
    valid: boolean;
    strength: { score: number };
    errors: string[];
  }>(`/auth/validate-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

async getPasswordRequirements() {
  return this.request<{
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  }>(`/auth/password-requirements`);
}

async changePassword(data: { currentPassword?: string; newPassword: string }) {
  return this.request<void>(`/auth/change-password`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

### 3. Backend: `backend/src/controllers/authController.js`
✅ Corrigido bug `isValid` → `valid` no método `validatePasswordStrength`:
```javascript
res.json({
  valid: validation.valid,  // Era: validation.isValid
  errors: validation.errors,
  strength: {
    score: validation.strength,
    feedback: validation.feedback
  },
  suggestions: validation.suggestions
});
```

✅ Corrigido bug `isValid` → `valid` no método `changePassword`:
```javascript
const validation = validatePassword(newPassword);
if (!validation.valid) {  // Era: validation.isValid
  return res.status(400).json({ 
    error: 'Senha não atende aos requisitos de segurança',
    errors: validation.errors
  });
}
```

## Resultado

Agora o diálogo de alteração de senha funciona corretamente:
- ✅ API calls usam o cliente centralizado com URL base correta
- ✅ Validação de senha em tempo real funciona
- ✅ Barra de força da senha preenche conforme a complexidade:
  - 🔴 Muito fraca (score 0)
  - 🟠 Fraca (score 1)
  - 🟡 Razoável (score 2)
  - 🟢 Boa (score 3)
  - 🟢 Forte (score 4)
- ✅ Botão "Alterar" habilita quando:
  - Senha atual informada (se não for primeiro login)
  - Nova senha válida (atende requisitos)
  - Senhas coincidem
  - validation.valid === true
- ✅ Mensagens de erro detalhadas
- ✅ Backend e frontend sincronizados

## Testes

Para testar:
1. ✅ Faça login com credenciais criadas no setup
2. ✅ Sistema detecta primeiro login e abre diálogo automaticamente
3. ✅ Digite uma senha fraca (ex: "12345678")
   - Barra vermelha deve aparecer
   - Erros devem ser listados
   - Botão deve ficar desabilitado
4. ✅ Digite uma senha forte (ex: "MinhaSenh@Forte123")
   - Barra verde deve aparecer
   - Força deve mostrar "Forte" ou "Boa"
   - Botão deve habilitar quando confirmar a senha
5. ✅ Clique em "Alterar"
   - Senha deve ser alterada com sucesso
   - Toast de sucesso deve aparecer
   - Usuário deve conseguir acessar o sistema

## Servidores Iniciados

```
Backend:  http://localhost:3000 ✅
Frontend: http://localhost:8080 ✅
```

Ambos servidores foram reiniciados com as correções aplicadas.
