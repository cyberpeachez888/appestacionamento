# Código Não Utilizado - Arquivo

Este diretório contém código que foi desenvolvido mas nunca integrado ao sistema.

## 📁 Arquivos

### `dateUtils.ts`
**Data de arquivamento:** 2026-01-20  
**Motivo:** Desenvolvido para normalização de datas de vencimento (dias 1-31), mas nunca integrado.  
**Status:** ❌ Zero imports/uso no código ativo  
**Valor:** ✅ Contém lógica de negócio única e bem documentada

**Funções principais:**
- `normalizeDueDate()` - Ajusta dias inválidos para meses específicos
- `getNextDueDate()` - Calcula próximo vencimento
- `generateDueDateCalendar()` - Gera calendário de vencimentos
- `willBeAdjusted()` / `getAffectedMonths()` - Validações de ajuste

**Decisão:** Arquivado ao invés de deletado por conter lógica de negócio potencialmente útil no futuro.

---

## 🔄 Política de Arquivo

Código arquivado aqui pode ser:
- ✅ Reutilizado em features futuras
- ✅ Referenciado para implementações similares
- ❌ Não deve ser importado diretamente (copiar/adaptar se necessário)
