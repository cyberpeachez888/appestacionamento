#!/usr/bin/env node

const checklist = `
✅ Pós-deploy rápido
---------------------
1. Rodar verificação de variáveis:
   npm run verify-env --prefix backend

2. Conferir pipeline (Actions) e status do Render/Vercel.

3. Executar smoke-test no app:
   • Login com conta admin
   • Criar ticket avulso e finalizar pagamento
   • Gerar backup manual e baixar o arquivo
   • Enviar notificação (e-mail/SMS/WhatsApp)

4. Validar monitoramento:
   • Health check /health respondendo 200
   • Logs sem erros críticos

Checklist detalhado: veja OPERATIONS_CHECKLIST.md
`;

console.log(checklist);

