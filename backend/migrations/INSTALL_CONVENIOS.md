# Guia de Instalação - Módulo de Convênios

## Passo 1: Executar Migration no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo `backend/migrations/convenios_schema.sql`
4. Copie todo o conteúdo
5. Cole no SQL Editor do Supabase
6. Clique em **Run** (ou pressione `Ctrl+Enter`)

**Resultado esperado:**
```
Success. No rows returned
```

## Passo 2: Verificar Tabelas Criadas

Execute esta query para verificar:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'convenios%' OR table_name = 'notificacoes'
ORDER BY table_name;
```

**Deve retornar:**
- convenios
- convenios_documentos
- convenios_faturas
- convenios_historico
- convenios_movimentacoes
- convenios_planos
- convenios_veiculos
- notificacoes

## Passo 3: Verificar Views

```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'convenios%';
```

**Deve retornar:**
- convenios_com_plano_ativo
- convenios_ocupacao

## Passo 4: Testar Inserção

```sql
-- Teste básico de inserção
INSERT INTO convenios (
  nome_empresa,
  cnpj,
  razao_social,
  tipo_convenio,
  categoria,
  data_inicio,
  contato_nome,
  contato_email,
  contato_telefone
) VALUES (
  'Empresa Teste LTDA',
  '12.345.678/0001-90',
  'Empresa Teste LTDA',
  'pre-pago',
  'clientes',
  CURRENT_DATE,
  'João Silva',
  'joao@teste.com',
  '(11) 98765-4321'
) RETURNING id, nome_empresa, status;
```

Se retornar o ID e dados, está tudo OK! ✅

## Passo 5: Limpar Teste (Opcional)

```sql
-- Deletar o registro de teste
DELETE FROM convenios WHERE cnpj = '12.345.678/0001-90';
```

## Próximos Passos

Após confirmar que o banco está OK:
1. ✅ Criar estrutura de pastas do frontend
2. ✅ Implementar API routes
3. ✅ Criar componentes da interface

---

**Status:** Database schema criado e pronto para uso! 🚀
