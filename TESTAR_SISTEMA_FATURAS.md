# 🧪 Testando o Sistema de Faturas

Este documento fornece um roteiro completo para testar o novo sistema de preview e geração de faturas.

## ✅ Pré-requisitos

Antes de começar os testes, certifique-se de que:

- [x] Diretório `/backend/storage/faturas` foi criado
- [ ] Migração do banco de dados foi aplicada (ver `APLICAR_MIGRACAO_FATURAS.md`)
- [ ] Backend está rodando (`npm run dev` em `/backend`)
- [ ] Frontend está rodando (`npm run dev` em raiz)

## 📋 Roteiro de Testes

### Teste 1: Verificar Migração do Banco

**Objetivo**: Confirmar que a migração foi aplicada corretamente.

**Como testar**:
1. Acesse o Supabase SQL Editor
2. Execute esta query:

```sql
-- Verificar colunas adicionadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'convenios_faturas' 
AND column_name IN ('pdf_path', 'pdf_filename', 'pdf_generated_at', 
                    'periodo_data_inicio', 'periodo_data_fim', 
                    'email_envio', 'num_vagas_cortesia', 'num_vagas_pagas')
ORDER BY column_name;

-- Verificar função de numeração
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_next_invoice_number';

-- Verificar view de vagas extras
SELECT table_name, view_definition
FROM information_schema.views 
WHERE table_name = 'convenios_vagas_extras_pendentes';
```

**Resultado esperado**:
- ✅ 8 colunas devem aparecer
- ✅ Função `get_next_invoice_number` existe
- ✅ View `convenios_vagas_extras_pendentes` existe

---

### Teste 2: Preview de Fatura (Sem Vagas Extras)

**Objetivo**: Testar o endpoint de preview com um convênio simples.

**Como testar**:
1. Abra a aplicação frontend
2. Navegue para "Convênios"
3. Clique em um convênio ATIVO
4. Vá para a aba "Financeiro"
5. Clique no botão "Gerar Nova Fatura"

**Resultado esperado**:
- ✅ Dialog de preview abre automaticamente
- ✅ Mostra período de referência (mês atual)
- ✅ Mostra mensalidade calculada
- ✅ Se há desconto, mostra valor descontado
- ✅ Email do convênio aparece pré-preenchido
- ✅ Data de vencimento sugerida aparece
- ✅ Total calculado corretamente

**Teste via API** (opcional):
```bash
curl -X GET "http://localhost:3000/api/convenios/[CONVENIO_ID]/fatura/preview" \
  -H "Authorization: Bearer [SEU_TOKEN]" \
  -H "Content-Type: application/json"
```

---

### Teste 3: Geração de Fatura (Sucesso)

**Objetivo**: Gerar uma fatura completa com PDF.

**Como testar**:
1. No dialog de preview (Teste 2)
2. Verifique o email
3. Ajuste a data de vencimento se necessário
4. Adicione observações (opcional)
5. Clique em "Gerar Fatura"

**Resultado esperado**:
- ✅ Loading aparece
- ✅ Mensagem de sucesso: "Fatura gerada com sucesso!"
- ✅ Dialog fecha
- ✅ Nova fatura aparece na lista
- ✅ Número da fatura no formato 2026-001, 2026-002, etc.
- ✅ Botão de download aparece

**Verificar no banco**:
```sql
-- Ver fatura criada
SELECT 
  numero_fatura,
  periodo_referencia,
  valor_total,
  pdf_path,
  pdf_filename,
  pdf_generated_at,
  status,
  created_at
FROM convenios_faturas 
ORDER BY created_at DESC 
LIMIT 1;
```

**Verificar arquivo PDF**:
```bash
ls -lh /home/gab/appestacionamento/backend/storage/faturas/2026/
```

---

### Teste 4: Download de PDF

**Objetivo**: Baixar o PDF da fatura gerada.

**Como testar**:
1. Na lista de faturas (aba Financeiro)
2. Localize a fatura recém-gerada
3. Clique no botão de download (ícone Download)

**Resultado esperado**:
- ✅ Arquivo PDF baixa automaticamente
- ✅ Nome do arquivo: `Fatura-2026-001-NomeEmpresa.pdf`
- ✅ PDF abre sem erros
- ✅ PDF contém:
  - Cabeçalho com número da fatura
  - Dados do convênio
  - Período de referência
  - Itens (mensalidade)
  - Totais
  - Instruções de pagamento

**Teste via API** (opcional):
```bash
curl -X GET "http://localhost:3000/api/convenios/[CONVENIO_ID]/faturas/[FATURA_ID]/download" \
  -H "Authorization: Bearer [SEU_TOKEN]" \
  --output teste-fatura.pdf

# Verificar se PDF é válido
file teste-fatura.pdf
# Deve retornar: teste-fatura.pdf: PDF document...
```

---

### Teste 5: Fatura com Vagas Extras

**Objetivo**: Testar integração complete com vagas extras.

**Pré-requisito**: Criar vagas extras para o convênio

**Como criar vagas extras para teste**:
1. Vá para "Operacional" → Registrar Entrada
2. Digite uma placa qualquer (ex: ABC1234)
3. Tipo de veículo: Carro
4. Clique em "Vincular a Convênio"
5. Selecione o convênio de teste
6. Escolha "Vaga Extra Paga" ou "Vaga Extra Cortesia"
7. Registre a SAÍDA do veículo (importante!)

**Como testar**:
1. Abra o convênio com vagas extras
2. Vá para aba "Vagas Extras"
3. Verifique que as vagas finalizadas aparecem
4. Volte para aba "Financeiro"
5. Clique "Gerar Nova Fatura"

**Resultado esperado**:
- ✅ Preview mostra seção "VAGAS EXTRAS PAGAS" (se houver)
- ✅ Preview mostra seção "VAGAS EXTRAS CORTESIA" (se houver)
- ✅ Cada vaga extra lista: placa e data
- ✅ Valores das vagas pagas somados no total
- ✅ Vagas cortesia listadas mas com valor zero

**Após gerar**:
```sql
-- Verificar que vagas extras foram marcadas como faturadas
SELECT 
  placa,
  tipo_vaga_extra,
  valor_cobrado,
  faturado,
  fatura_id
FROM convenios_movimentacoes
WHERE convenio_id = '[CONVENIO_ID]'
  AND tipo_vaga = 'extra'
  AND faturado = true
ORDER BY data_saida DESC;
```

---

### Teste 6: Numeração Sequencial

**Objetivo**: Verificar que a numeração é sequencial e não duplica.

**Como testar**:
1. Gere 3 faturas para convênios diferentes
2. Anote os números gerados

**Resultado esperado**:
- ✅ Primeira: 2026-001
- ✅ Segunda: 2026-002
- ✅ Terceira: 2026-003
- ✅ Nenhum número duplicado

**Verificar**:
```sql
SELECT numero_fatura, created_at
FROM convenios_faturas
WHERE numero_fatura LIKE '2026-%'
ORDER BY numero_fatura;
```

---

### Teste 7: Rollback Atômico (Erro)

**Objetivo**: Verificar que o sistema faz rollback se houver erro.

**Como simular erro**:

**Opção 1 - Remover permissões de escrita**:
```bash
chmod 555 /home/gab/appestacionamento/backend/storage/faturas
```

**Opção 2 - Comentar linha de criação do PDF** (temporariamente):
No arquivo `conveniosFaturasController.js`, linha ~595:
```javascript
// Comentar temporariamente esta linha:
// const { pdfPath: generatedPdfPath, pdfFilename } = await gerarPDFFatura(...)
// throw new Error('Simulando erro de PDF'); // Adicionar esta linha
```

**Como testar**:
1. Tente gerar uma fatura
2. Observe o comportamento

**Resultado esperado**:
- ✅ Mensagem de erro clara aparece
- ✅ Nenhuma fatura criada no banco
- ✅ Nenhum arquivo PDF criado
- ✅ Vagas extras permanecem como não faturadas

**Verificar rollback**:
```sql
-- Não deve haver faturas criadas recentemente
SELECT COUNT(*) 
FROM convenios_faturas 
WHERE created_at > NOW() - INTERVAL '5 minutes';
-- Deve retornar 0

-- Vagas extras ainda pendentes
SELECT COUNT(*)
FROM convenios_movimentacoes
WHERE tipo_vaga = 'extra' 
  AND faturado = false 
  AND data_saida IS NOT NULL;
-- Deve ser > 0 se havia vagas extras
```

**Restaurar após teste**:
```bash
chmod 755 /home/gab/appestacionamento/backend/storage/faturas
```
E reverter alterações no código.

---

### Teste 8: Validações

**Objetivo**: Verificar que validações funcionam.

**Como testar**:

**8.1 - Email vazio**:
1. Abra preview de fatura
2. Apague o campo de email
3. Tente gerar

**Resultado esperado**:
- ✅ Erro: "Email de destino é obrigatório"

**8.2 - Data de vencimento vazia**:
1. Abra preview
2. Apague a data de vencimento
3. Tente gerar

**Resultado esperado**:
- ✅ Erro: "Data de vencimento é obrigatória"

**8.3 - Convênio sem plano ativo**:
1. Desative o plano do convênio (via Supabase)
2. Tente gerar fatura

**Resultado esperado**:
- ✅ Erro: "Convênio ou plano ativo não encontrado"

---

## 📊 Checklist Final

Após executar todos os testes:

- [ ] ✅ Migração aplicada com sucesso
- [ ] ✅ Preview carrega dados corretamente
- [ ] ✅ Fatura gerada com número sequencial
- [ ] ✅ PDF criado no diretório correto
- [ ] ✅ PDF pode ser baixado
- [ ] ✅ Vagas extras integradas corretamente
- [ ] ✅ Rollback funciona em caso de erro
- [ ] ✅ Validações funcionam

## 🐛 Problemas Comuns

### PDF não é gerado
- Verificar permissões: `ls -ld /home/gab/appestacionamento/backend/storage/faturas`
- Deve mostrar `drwxr-xr-x` ou similar
- Verificar logs do backend para erro específico

### Numeração duplicada
- Executar manualmente: `SELECT get_next_invoice_number(2026);`
- Se retornar erro, recriar a função

### Preview vazio
- Verificar se convênio tem valor_mensal OU valor_por_vaga
- Verificar se plano está ativo
- Verificar console do backend para erros

---

**Data do teste**: __________  
**Testado por**: __________  
**Resultado**: ✅ APROVADO / ❌ REPROVADO
