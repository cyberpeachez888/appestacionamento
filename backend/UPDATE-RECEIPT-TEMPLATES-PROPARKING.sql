-- Atualização dos Templates de Recibo com Identidade Visual ProParking
-- Execute este script no Supabase SQL Editor para atualizar os templates padrão

-- ============================================
-- 1. ATUALIZAR TEMPLATE DE MENSALISTA (PDF/Email/WhatsApp)
-- ============================================
UPDATE receipt_templates
SET 
  email_body_html = $HTML$<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo Mensalista - ProParking App</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
  <div style="background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden;">
    <!-- Header com identidade ProParking -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: center; color: white;">
      <div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 10px;">
        <div style="background: rgba(255,255,255,0.2); border-radius: 10px; padding: 10px; backdrop-filter: blur(10px);">
          <span style="font-size: 24px;">🚗</span>
        </div>
        <div style="text-align: left;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">PROPARKING</h1>
          <p style="margin: 0; font-size: 14px; opacity: 0.9; font-weight: 500;">APP - 2025</p>
        </div>
      </div>
      <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.85;">Sistema de Gestão de Estacionamento</p>
    </div>

    <!-- Informações da Empresa -->
    <div style="padding: 20px; border-bottom: 2px solid #e5e7eb;">
      <div style="text-align: center;">
        <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px;">{{companyName}}</h2>
        <p style="margin: 4px 0; color: #6b7280; font-size: 13px;">{{companyLegalName}}</p>
        <p style="margin: 4px 0; color: #6b7280; font-size: 12px;">CNPJ: {{companyCnpj}}</p>
        <p style="margin: 4px 0; color: #6b7280; font-size: 12px;">{{companyAddress}}</p>
        <p style="margin: 4px 0; color: #6b7280; font-size: 12px;">Tel: {{companyPhone}}</p>
      </div>
    </div>

    <!-- Número do Recibo -->
    <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 20px; text-align: center; border-bottom: 2px solid #d1d5db;">
      <div style="display: inline-block; background: white; padding: 12px 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Recibo Nº</p>
        <h2 style="margin: 4px 0 0 0; font-size: 32px; font-weight: 700; color: #1e40af; letter-spacing: 2px;">{{receiptNumber}}</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280; font-weight: 500;">Mensalista</p>
      </div>
    </div>

    <!-- Dados do Pagamento -->
    <div style="padding: 24px;">
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 11px; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Valor Pago</p>
        <p style="margin: 0; font-size: 32px; font-weight: 700; color: #1e40af;">R$ {{value}}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500; width: 40%;">Cliente:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-weight: 600;">{{customerName}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500;">Placas:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-weight: 600; text-transform: uppercase;">{{plates}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500;">Data do Pagamento:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">{{date}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500;">Mês de Referência:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-weight: 600;">{{referenceMonth}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500;">Forma de Pagamento:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-weight: 600;">{{paymentMethod}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500;">Próximo Vencimento:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">{{dueDate}}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; border-top: 2px solid #e5e7eb;">
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 11px; color: #92400e; line-height: 1.5;">
          <strong>⚠️ ATENÇÃO:</strong> Documento sem validade fiscal. Este recibo é emitido apenas para fins administrativos e comprovação de pagamento mensal.
        </p>
      </div>
      <p style="margin: 0; text-align: center; font-size: 11px; color: #6b7280; line-height: 1.6;">
        Mantenha este recibo como comprovante de pagamento.<br>
        <strong style="color: #1e40af;">Obrigado pela preferência!</strong>
      </p>
      <p style="margin: 12px 0 0 0; text-align: center; font-size: 10px; color: #9ca3af;">
        © 2025 ProParking App - Todos os direitos reservados
      </p>
    </div>
  </div>
</body>
</html>$HTML$,
  email_subject = 'Recibo Mensalista #{{receiptNumber}} - ProParking App',
  whatsapp_message = '🚗 *PROPARKING APP - 2025*\n\n📄 *Recibo Mensalista #{{receiptNumber}}*\n\n👤 Cliente: {{customerName}}\n🚙 Placas: {{plates}}\n📅 Data: {{date}}\n📆 Mês Ref.: {{referenceMonth}}\n💰 Valor: R$ {{value}}\n💳 Pagamento: {{paymentMethod}}\n📅 Próx. Venc.: {{dueDate}}\n\n⚠️ Documento sem validade fiscal\n\nObrigado pela preferência! 🎉'
WHERE template_type = 'monthly_payment' AND is_default = TRUE;

-- ============================================
-- 2. ATUALIZAR TEMPLATE DE REEMBOLSO (PDF/Email/WhatsApp)
-- ============================================
UPDATE receipt_templates
SET 
  email_body_html = $HTML$<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo de Reembolso - ProParking App</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
  <div style="background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden;">
    <!-- Header com identidade ProParking -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: center; color: white;">
      <div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 10px;">
        <div style="background: rgba(255,255,255,0.2); border-radius: 10px; padding: 10px; backdrop-filter: blur(10px);">
          <span style="font-size: 24px;">🚗</span>
        </div>
        <div style="text-align: left;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">PROPARKING</h1>
          <p style="margin: 0; font-size: 14px; opacity: 0.9; font-weight: 500;">APP - 2025</p>
        </div>
      </div>
      <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.85;">Sistema de Gestão de Estacionamento</p>
    </div>

    <!-- Informações da Empresa -->
    <div style="padding: 20px; border-bottom: 2px solid #e5e7eb;">
      <div style="text-align: center;">
        <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px;">{{companyName}}</h2>
        <p style="margin: 4px 0; color: #6b7280; font-size: 13px;">{{companyLegalName}}</p>
        <p style="margin: 4px 0; color: #6b7280; font-size: 12px;">CNPJ: {{companyCnpj}}</p>
        <p style="margin: 4px 0; color: #6b7280; font-size: 12px;">{{companyAddress}}</p>
        <p style="margin: 4px 0; color: #6b7280; font-size: 12px;">Tel: {{companyPhone}}</p>
      </div>
    </div>

    <!-- Número do Recibo -->
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; text-align: center; border-bottom: 2px solid #fbbf24;">
      <div style="display: inline-block; background: white; padding: 12px 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="margin: 0; font-size: 11px; color: #92400e; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Recibo de Reembolso</p>
        <h2 style="margin: 4px 0 0 0; font-size: 32px; font-weight: 700; color: #d97706; letter-spacing: 2px;">{{receiptNumber}}</h2>
      </div>
    </div>

    <!-- Dados do Reembolso -->
    <div style="padding: 24px;">
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 11px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Valor Reembolsado</p>
        <p style="margin: 0; font-size: 32px; font-weight: 700; color: #d97706;">R$ {{value}}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500; width: 40%;">Solicitante:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-weight: 600;">{{recipientName}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500;">CPF:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">{{recipientCpf}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500;">Placa:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-weight: 600; text-transform: uppercase;">{{plate}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500;">Data:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">{{date}} {{time}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500;">Descrição:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">{{description}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500;">Forma de Pagamento:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-weight: 600;">{{paymentMethod}}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500;">Emitido por:</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">{{issuedBy}}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; border-top: 2px solid #e5e7eb;">
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 11px; color: #92400e; line-height: 1.5;">
          <strong>⚠️ ATENÇÃO:</strong> Recibo sem validade fiscal. Este documento é emitido apenas para fins administrativos e não substitui nota fiscal.
        </p>
      </div>
      <p style="margin: 0; text-align: center; font-size: 11px; color: #6b7280; line-height: 1.6;">
        Documento gerado para fins de reembolso corporativo.<br>
        <strong style="color: #1e40af;">Obrigado pela preferência!</strong>
      </p>
      <p style="margin: 12px 0 0 0; text-align: center; font-size: 10px; color: #9ca3af;">
        © 2025 ProParking App - Todos os direitos reservados
      </p>
    </div>
  </div>
</body>
</html>$HTML$,
  email_subject = 'Recibo de Reembolso #{{receiptNumber}} - ProParking App',
  whatsapp_message = '🚗 *PROPARKING APP - 2025*\n\n📄 *Recibo de Reembolso #{{receiptNumber}}*\n\n👤 Solicitante: {{recipientName}}\n🆔 CPF: {{recipientCpf}}\n🚙 Placa: {{plate}}\n📅 Data: {{date}} {{time}}\n💰 Valor: R$ {{value}}\n💳 Pagamento: {{paymentMethod}}\n📝 Descrição: {{description}}\n👨‍💼 Emitido por: {{issuedBy}}\n\n⚠️ Recibo sem validade fiscal\n\nObrigado pela preferência! 🎉'
WHERE template_type = 'general_receipt' AND is_default = TRUE;

-- Verificar atualizações
SELECT template_name, template_type, is_default, 
       LEFT(email_body_html, 100) as email_preview
FROM receipt_templates 
WHERE template_type IN ('monthly_payment', 'general_receipt') 
  AND is_default = TRUE;

