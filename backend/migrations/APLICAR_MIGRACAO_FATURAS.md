# Como Aplicar a Migração de Faturas

## Opção 1: Via Supabase SQL Editor (RECOMENDADO)

1. **Acesse o Supabase Dashboard**
   - Vá para https://app.supabase.com
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New query"

3. **Cole o conteúdo da migração**
   - Abra o arquivo: `/home/gab/appestacionamento/backend/migrations/add_invoice_pdf_fields.sql`
   - Copie TODO o conteúdo
   - Cole no SQL Editor

4. **Execute a migração**
   - Clique em "Run" ou pressione Ctrl+Enter
   - Aguarde a confirmação de sucesso

5. **Verifique a instalação**
   - Execute esta query para verificar:
   ```sql
   -- Verificar se as colunas foram adicionadas
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'convenios_faturas' 
   AND column_name IN ('pdf_path', 'pdf_filename', 'pdf_generated_at', 
                       'periodo_data_inicio', 'periodo_data_fim', 
                       'email_envio', 'num_vagas_cortesia', 'num_vagas_pagas');
   
   -- Verificar se a função foi criada
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'get_next_invoice_number';
   
   -- Verificar se a view foi criada
   SELECT table_name 
   FROM information_schema.views 
   WHERE table_name = 'convenios_vagas_extras_pendentes';
   ```

## Opção 2: Via psql (Se tiver PostgreSQL instalado localmente)

```bash
# Se conectando via URL do Supabase
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f /home/gab/appestacionamento/backend/migrations/add_invoice_pdf_fields.sql

# Ou se tiver variável de ambiente configurada
psql $DATABASE_URL -f backend/migrations/add_invoice_pdf_fields.sql
```

## O que a migração faz:

### 1. Adiciona colunas à tabela `convenios_faturas`:
- `pdf_path` - Caminho do arquivo PDF no storage
- `pdf_filename` - Nome do arquivo para download
- `pdf_generated_at` - Timestamp de quando o PDF foi gerado
- `periodo_data_inicio` - Data início do período de referência
- `periodo_data_fim` - Data fim do período de referência
- `email_envio` - Email de destino da fatura
- `num_vagas_cortesia` - Quantidade de vagas extras cortesia
- `num_vagas_pagas` - Quantidade de vagas extras pagas

### 2. Cria função `get_next_invoice_number(year INTEGER)`
- Gera números sequenciais de fatura no formato YYYY-NNN
- Reseta automaticamente a cada ano
- Thread-safe (evita duplicatas mesmo com requisições concorrentes)

### 3. Cria view `convenios_vagas_extras_pendentes`
- Lista vagas extras finalizadas (com data_saida)
- Filtra apenas as não faturadas (faturado = false)
- Útil para consultas rápidas de itens pendentes

### 4. Adiciona índices para performance:
- `idx_faturas_pdf_path` - Busca rápida por PDF
- `idx_faturas_periodo_datas` - Filtros por período
- `idx_movimentacoes_tipo_vaga_faturado` - Consultas de vagas extras

### 5. Adiciona constraints:
- `check_pdf_fields_consistency` - Garante que se há pdf_path, há pdf_filename
- `check_periodo_dates_order` - Garante que data_fim >= data_inicio

## Após aplicar a migração:

✅ O sistema estará pronto para:
- Gerar faturas com numeração automática YYYY-NNN
- Criar PDFs automaticamente
- Armazenar metadados de fatura
- Integrar vagas extras no faturamento

## Em caso de erro:

Se algo der errado, você pode reverter manualmente:

```sql
-- Remover função
DROP FUNCTION IF EXISTS get_next_invoice_number(INTEGER);

-- Remover view
DROP VIEW IF EXISTS convenios_vagas_extras_pendentes;

-- Remover colunas (CUIDADO: isso apaga dados!)
ALTER TABLE convenios_faturas 
  DROP COLUMN IF EXISTS pdf_path,
  DROP COLUMN IF EXISTS pdf_filename,
  DROP COLUMN IF EXISTS pdf_generated_at,
  DROP COLUMN IF EXISTS periodo_data_inicio,
  DROP COLUMN IF EXISTS periodo_data_fim,
  DROP COLUMN IF EXISTS email_envio,
  DROP COLUMN IF EXISTS num_vagas_cortesia,
  DROP COLUMN IF EXISTS num_vagas_pagas;

-- Remover índices
DROP INDEX IF EXISTS idx_faturas_pdf_path;
DROP INDEX IF EXISTS idx_faturas_periodo_datas;
DROP INDEX IF EXISTS idx_movimentacoes_tipo_vaga_faturado;
```

## Status:

- ✅ Arquivo de migração criado
- ✅ Diretório de storage criado
- ⏳ Migração precisa ser aplicada manualmente no Supabase
- ⏳ Testar endpoints após aplicação

---

**Próximo passo**: Aplicar a migração via Supabase SQL Editor conforme instruções acima.
