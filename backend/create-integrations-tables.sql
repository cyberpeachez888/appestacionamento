-- Integrations & Webhooks Migration
-- Run this in your Supabase SQL Editor

-- 1. Integration configurations table
CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL UNIQUE, -- 'smtp', 'sms', 'whatsapp', 'payment_gateway'
  is_enabled BOOLEAN DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  credentials JSONB DEFAULT '{}'::jsonb, -- Encrypted sensitive data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_integration_configs_type ON integration_configs(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_configs_enabled ON integration_configs(is_enabled);

-- 2. Notification queue table (for async processing)
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL, -- 'email', 'sms', 'whatsapp'
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  template_name TEXT,
  template_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for queue management
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON notification_queue(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created ON notification_queue(created_at DESC);

-- 3. Notification history/logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  message_preview TEXT, -- First 100 chars
  status TEXT NOT NULL, -- 'sent', 'failed', 'bounced'
  provider_response JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent ON notification_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient);

-- 4. Webhook endpoints configuration
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT DEFAULT 'POST', -- 'POST', 'GET', 'PUT'
  headers JSONB DEFAULT '{}'::jsonb,
  events TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['vehicle.entry', 'vehicle.exit', 'payment.received', etc]
  is_active BOOLEAN DEFAULT TRUE,
  secret_key TEXT, -- For signature verification
  retry_on_failure BOOLEAN DEFAULT TRUE,
  max_retries INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for active webhooks
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_endpoints(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_events ON webhook_endpoints USING GIN(events);

-- 5. Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  request_headers JSONB,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN NOT NULL,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for webhook monitoring
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_success ON webhook_logs(success);

-- 6. Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[], -- Available template variables
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for template lookup
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- 7. SMS templates
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for template lookup
CREATE INDEX IF NOT EXISTS idx_sms_templates_name ON sms_templates(template_name);

-- 8. Function to clean old notification logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM notification_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  DELETE FROM webhook_logs 
  WHERE triggered_at < NOW() - INTERVAL '90 days';
  
  DELETE FROM notification_queue 
  WHERE status IN ('sent', 'failed') 
  AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 9. Insert default integration configurations
INSERT INTO integration_configs (integration_type, is_enabled, config) VALUES
  ('smtp', FALSE, '{"host": "", "port": 587, "secure": false, "from_email": "", "from_name": ""}'::jsonb),
  ('sms', FALSE, '{"provider": "twilio", "send_reminders": true, "reminder_hours_before": 24}'::jsonb),
  ('whatsapp', FALSE, '{"provider": "twilio", "send_receipts": true, "send_reminders": false}'::jsonb),
  ('payment_gateway', FALSE, '{"provider": "", "environment": "sandbox", "auto_confirm": false}'::jsonb)
ON CONFLICT (integration_type) DO NOTHING;

-- 10. Insert default email templates
INSERT INTO email_templates (template_name, subject, html_body, text_body, variables) VALUES
  (
    'receipt',
    'Recibo #{{receiptNumber}} - {{companyName}}',
    '<html><body><h1>Recibo de Pagamento</h1><p>Número: {{receiptNumber}}</p><p>Data: {{date}}</p><p>Placa: {{plate}}</p><p>Valor: R$ {{value}}</p><p>Forma de Pagamento: {{paymentMethod}}</p><hr><p>{{companyName}}</p><p>{{companyAddress}}</p></body></html>',
    'Recibo de Pagamento\nNúmero: {{receiptNumber}}\nData: {{date}}\nPlaca: {{plate}}\nValor: R$ {{value}}\nForma de Pagamento: {{paymentMethod}}\n\n{{companyName}}\n{{companyAddress}}',
    ARRAY['receiptNumber', 'date', 'plate', 'value', 'paymentMethod', 'companyName', 'companyAddress']
  ),
  (
    'monthly_reminder',
    'Lembrete de Vencimento - {{companyName}}',
    '<html><body><h2>Olá {{customerName}},</h2><p>Seu plano mensal vence em <strong>{{dueDate}}</strong>.</p><p>Valor: R$ {{value}}</p><p>Por favor, realize o pagamento para continuar utilizando nossos serviços.</p><p>Atenciosamente,<br>{{companyName}}</p></body></html>',
    'Olá {{customerName}},\n\nSeu plano mensal vence em {{dueDate}}.\nValor: R$ {{value}}\n\nPor favor, realize o pagamento para continuar utilizando nossos serviços.\n\nAtenciosamente,\n{{companyName}}',
    ARRAY['customerName', 'dueDate', 'value', 'companyName']
  ),
  (
    'payment_confirmation',
    'Pagamento Confirmado - {{companyName}}',
    '<html><body><h2>Pagamento Recebido</h2><p>Olá {{customerName}},</p><p>Confirmamos o recebimento do seu pagamento no valor de <strong>R$ {{value}}</strong>.</p><p>Próximo vencimento: {{nextDueDate}}</p><p>Obrigado pela preferência!</p><p>{{companyName}}</p></body></html>',
    'Pagamento Recebido\n\nOlá {{customerName}},\n\nConfirmamos o recebimento do seu pagamento no valor de R$ {{value}}.\nPróximo vencimento: {{nextDueDate}}\n\nObrigado pela preferência!\n{{companyName}}',
    ARRAY['customerName', 'value', 'nextDueDate', 'companyName']
  )
ON CONFLICT (template_name) DO NOTHING;

-- 11. Insert default SMS templates
INSERT INTO sms_templates (template_name, message, variables) VALUES
  (
    'ticket_reminder',
    'Olá! Seu ticket de estacionamento expira em 1 hora. Placa: {{plate}}. {{companyName}}',
    ARRAY['plate', 'companyName']
  ),
  (
    'monthly_due_reminder',
    '{{customerName}}, seu plano mensal vence em {{daysLeft}} dias ({{dueDate}}). Valor: R$ {{value}}. {{companyName}}',
    ARRAY['customerName', 'daysLeft', 'dueDate', 'value', 'companyName']
  ),
  (
    'payment_received',
    'Pagamento confirmado! R$ {{value}}. Próximo vencimento: {{nextDueDate}}. Obrigado! {{companyName}}',
    ARRAY['value', 'nextDueDate', 'companyName']
  )
ON CONFLICT (template_name) DO NOTHING;

-- 12. Comments for documentation
COMMENT ON TABLE integration_configs IS 'Stores configuration for external integrations (SMTP, SMS, WhatsApp, Payment Gateways)';
COMMENT ON TABLE notification_queue IS 'Queue for async notification processing with retry logic';
COMMENT ON TABLE notification_logs IS 'Historical log of all sent notifications for analytics';
COMMENT ON TABLE webhook_endpoints IS 'Configuration for webhook endpoints to notify external systems';
COMMENT ON TABLE webhook_logs IS 'Delivery logs for webhook requests';
COMMENT ON TABLE email_templates IS 'Customizable email templates with variable substitution';
COMMENT ON TABLE sms_templates IS 'SMS message templates for automated notifications';
