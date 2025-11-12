# ✅ Checklist Operacional Pós-Deploy

Use esta lista sempre que fizer um deploy em produção para garantir que o sistema está estável.

---

## 1. Smoke test geral
- [ ] Acesse o frontend em produção e faça login com conta admin.
- [ ] Verifique se o dashboard carrega sem erros e que os menus respondem.

## 2. Fluxos críticos
- [ ] Criar ticket de entrada (veículo avulso), registrar saída e gerar pagamento.
- [ ] Criar mensalista de teste e registrar um pagamento.
- [ ] Gerar um relatório mensal (se aplicável) e conferir os dados retornados.

## 3. Backups
- [ ] Executar um backup manual pelo painel.
- [ ] Baixar o arquivo gerado e confirmar que o conteúdo parece válido.
- [ ] (Opcional) Restaurar em ambiente de teste para garantir que o arquivo é recuperável.

## 4. Notificações
- [ ] Enviar e-mail de teste (via tela de integrações ou fluxo real).
- [ ] Se SMS/WhatsApp estiverem habilitados, disparar mensagens de teste.
- [ ] Conferir a tabela `notification_logs` no Supabase para status `sent`.

## 5. Monitoramento
- [ ] Verificar se o serviço de uptime está recebendo resposta `200` em `/health`.
- [ ] Conferir logs na Render (ou PM2) em busca de erros recentes.
- [ ] Validar o diretório de backups automáticos (se houver agendamento).

## 6. Rollback (simulação rápida)
- [ ] Identificar, no painel da Render/Vercel, qual é o deploy anterior considerado estável.
- [ ] Confirmar que sabe acionar o botão de rollback/promotion se necessário.

---

> **Dica:** mantenha uma cópia dessa lista impressa ou fixada na descrição do repositório. Realizar esses passos leva poucos minutos e evita que uma falha passe despercebida em produção.

