-- Receipt Templates System Migration
-- Creates comprehensive receipt template management with custom fields

-- 1. Receipt Templates Table
CREATE TABLE IF NOT EXISTS receipt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('parking_ticket', 'monthly_payment', 'general_receipt')),
  description TEXT,
  
  -- Template Configuration
  layout JSONB NOT NULL DEFAULT '{
    "headerPosition": "center",
    "logoSize": "medium",
    "fontSize": "normal",
    "spacing": "normal",
    "borderStyle": "solid",
    "paperSize": "80mm"
  }'::jsonb,
  
  -- Header Section
  show_logo BOOLEAN DEFAULT TRUE,
  show_company_name BOOLEAN DEFAULT TRUE,
  show_company_details BOOLEAN DEFAULT TRUE,
  header_text TEXT,
  
  -- Body Fields
  show_receipt_number BOOLEAN DEFAULT TRUE,
  show_date BOOLEAN DEFAULT TRUE,
  show_time BOOLEAN DEFAULT TRUE,
  show_plate BOOLEAN DEFAULT TRUE,
  show_vehicle_type BOOLEAN DEFAULT FALSE,
  show_entry_time BOOLEAN DEFAULT FALSE,
  show_exit_time BOOLEAN DEFAULT FALSE,
  show_duration BOOLEAN DEFAULT FALSE,
  show_rate BOOLEAN DEFAULT FALSE,
  show_value BOOLEAN DEFAULT TRUE,
  show_payment_method BOOLEAN DEFAULT TRUE,
  show_operator BOOLEAN DEFAULT FALSE,
  
  -- Custom Fields
  custom_fields JSONB DEFAULT '[]'::jsonb, -- Array of {name, label, type, required, defaultValue}
  
  -- Footer Section
  show_qr_code BOOLEAN DEFAULT FALSE,
  qr_code_data TEXT, -- Template string for QR code content, e.g., "{{receiptNumber}}|{{plate}}|{{value}}"
  show_barcode BOOLEAN DEFAULT FALSE,
  barcode_data TEXT, -- Template string for barcode content
  barcode_type VARCHAR(20) DEFAULT 'CODE128', -- CODE128, EAN13, etc.
  
  terms_and_conditions TEXT,
  footer_text TEXT,
  show_signature_line BOOLEAN DEFAULT TRUE,
  
  -- Styling
  primary_color VARCHAR(7) DEFAULT '#000000',
  secondary_color VARCHAR(7) DEFAULT '#666666',
  font_family VARCHAR(50) DEFAULT 'Arial',
  
  -- Email/WhatsApp template
  email_subject TEXT,
  email_body_html TEXT,
  email_body_text TEXT,
  whatsapp_message TEXT,
  
  -- Template variables available for this type
  available_variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Settings
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receipt_templates_type ON receipt_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_receipt_templates_active ON receipt_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_receipt_templates_default ON receipt_templates(is_default);

-- 2. Insert Default Templates

-- Default Parking Ticket Template
INSERT INTO receipt_templates (
  template_name,
  template_type,
  description,
  show_vehicle_type,
  show_entry_time,
  show_exit_time,
  show_duration,
  show_rate,
  show_operator,
  show_qr_code,
  qr_code_data,
  terms_and_conditions,
  footer_text,
  available_variables,
  is_default,
  email_subject,
  email_body_html,
  whatsapp_message
) VALUES (
  'Ticket de Estacionamento Padrão',
  'parking_ticket',
  'Template padrão para recibos de estacionamento por hora/período',
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  '{{receiptNumber}}|{{plate}}|{{value}}|{{date}}',
  'Este documento não possui validade fiscal. Emitido apenas para controle interno e comprovação de pagamento. O estabelecimento não se responsabiliza por objetos deixados no interior do veículo.',
  'Obrigado pela preferência! Volte sempre.',
  ARRAY[
    'receiptNumber', 'date', 'time', 'plate', 'vehicleType', 
    'entryDate', 'entryTime', 'exitDate', 'exitTime', 
    'duration', 'rate', 'value', 'paymentMethod', 'operator',
    'companyName', 'companyLegalName', 'companyCnpj', 
    'companyAddress', 'companyPhone'
  ],
  TRUE,
  'Recibo de Estacionamento #{{receiptNumber}} - {{companyName}}',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
      <h1 style="color: #333; margin: 0;">{{companyName}}</h1>
      <p style="color: #666; margin: 5px 0;">{{companyAddress}}</p>
      <p style="color: #666; margin: 5px 0;">CNPJ: {{companyCnpj}} | Tel: {{companyPhone}}</p>
    </div>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="text-align: center; margin: 0; color: #333;">RECIBO Nº {{receiptNumber}}</h2>
      <p style="text-align: center; margin: 5px 0; color: #666;">Estacionamento</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Data:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{date}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Placa:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{plate}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Entrada:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{entryDate}} {{entryTime}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Saída:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{exitDate}} {{exitTime}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Permanência:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{duration}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Valor Pago:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 18px; font-weight: bold; color: #28a745;">R$ {{value}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Forma de Pagamento:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{paymentMethod}}</td></tr>
    </table>
    <div style="background: #fffbcc; border: 1px solid #f0e68c; padding: 10px; border-radius: 5px; margin-top: 20px;">
      <p style="margin: 0; font-size: 12px; color: #666;"><strong>ATENÇÃO:</strong> Documento sem validade fiscal. Emitido apenas para controle interno.</p>
    </div>
  </body></html>',
  'RECIBO #{{receiptNumber}} - {{companyName}}\nPlaca: {{plate}}\nEntrada: {{entryDate}} {{entryTime}}\nSaída: {{exitDate}} {{exitTime}}\nValor: R$ {{value}}\nForma de Pagamento: {{paymentMethod}}\nObrigado pela preferência!'
);

-- Default Monthly Payment Template
INSERT INTO receipt_templates (
  template_name,
  template_type,
  description,
  show_vehicle_type,
  show_entry_time,
  show_exit_time,
  show_duration,
  show_rate,
  show_barcode,
  barcode_data,
  barcode_type,
  custom_fields,
  terms_and_conditions,
  footer_text,
  available_variables,
  is_default,
  email_subject,
  email_body_html,
  whatsapp_message
) VALUES (
  'Mensalista Padrão',
  'monthly_payment',
  'Template padrão para recibos de mensalistas',
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  TRUE,
  '{{receiptNumber}}',
  'CODE128',
  '[
    {"name": "referenceMonth", "label": "Mês de Referência", "type": "text", "required": true, "defaultValue": ""},
    {"name": "dueDate", "label": "Próximo Vencimento", "type": "date", "required": false, "defaultValue": ""},
    {"name": "additionalPlates", "label": "Placas Adicionais", "type": "text", "required": false, "defaultValue": ""}
  ]'::jsonb,
  'Documento sem validade fiscal. Este recibo é emitido apenas para fins administrativos e comprovação de pagamento mensal.',
  'Mantenha este recibo como comprovante de pagamento. Obrigado pela preferência!',
  ARRAY[
    'receiptNumber', 'date', 'time', 'customerName', 'plates',
    'value', 'paymentMethod', 'referenceMonth', 'dueDate',
    'companyName', 'companyLegalName', 'companyCnpj', 
    'companyAddress', 'companyPhone'
  ],
  TRUE,
  'Recibo Mensalista #{{receiptNumber}} - {{companyName}}',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
      <h1 style="color: #333; margin: 0;">{{companyName}}</h1>
      <p style="color: #666; margin: 5px 0;">{{companyLegalName}}</p>
      <p style="color: #666; margin: 5px 0;">CNPJ: {{companyCnpj}}</p>
      <p style="color: #666; margin: 5px 0;">{{companyAddress}} | Tel: {{companyPhone}}</p>
    </div>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="text-align: center; margin: 0; color: #333;">RECIBO Nº {{receiptNumber}}</h2>
      <p style="text-align: center; margin: 5px 0; color: #666;">Mensalista</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Cliente:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{customerName}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Placas:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{plates}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Data do Pagamento:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{date}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Mês de Referência:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{referenceMonth}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Valor Pago:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 18px; font-weight: bold; color: #28a745;">R$ {{value}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Forma de Pagamento:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{paymentMethod}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Próximo Vencimento:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{dueDate}}</td></tr>
    </table>
    <div style="background: #fffbcc; border: 1px solid #f0e68c; padding: 10px; border-radius: 5px; margin-top: 20px;">
      <p style="margin: 0; font-size: 12px; color: #666;"><strong>ATENÇÃO:</strong> Documento sem validade fiscal.</p>
    </div>
  </body></html>',
  'RECIBO #{{receiptNumber}} - {{companyName}}\nCliente: {{customerName}}\nPlacas: {{plates}}\nMês Ref.: {{referenceMonth}}\nValor: R$ {{value}}\nPgto: {{paymentMethod}}\nPróx. Venc.: {{dueDate}}'
);

-- Default General Receipt Template
INSERT INTO receipt_templates (
  template_name,
  template_type,
  description,
  show_plate,
  show_vehicle_type,
  show_entry_time,
  show_exit_time,
  show_duration,
  show_rate,
  show_operator,
  custom_fields,
  terms_and_conditions,
  footer_text,
  available_variables,
  is_default,
  email_subject,
  email_body_html,
  whatsapp_message
) VALUES (
  'Recibo Geral Padrão',
  'general_receipt',
  'Template padrão para recibos diversos (reembolsos, taxas extras, etc.)',
  TRUE,
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  TRUE,
  '[
    {"name": "recipientName", "label": "Nome do Recebedor", "type": "text", "required": false, "defaultValue": ""},
    {"name": "recipientCpf", "label": "CPF", "type": "text", "required": false, "defaultValue": ""},
    {"name": "description", "label": "Descrição/Motivo", "type": "textarea", "required": true, "defaultValue": ""},
    {"name": "issuedBy", "label": "Emitido por", "type": "text", "required": false, "defaultValue": ""}
  ]'::jsonb,
  'Recibo sem validade fiscal. Este documento é emitido apenas para fins administrativos e não substitui nota fiscal.',
  '',
  ARRAY[
    'receiptNumber', 'date', 'time', 'plate', 'recipientName', 
    'recipientCpf', 'description', 'value', 'paymentMethod', 
    'issuedBy', 'companyName', 'companyLegalName', 
    'companyCnpj', 'companyAddress', 'companyPhone'
  ],
  TRUE,
  'Recibo #{{receiptNumber}} - {{companyName}}',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
      <h1 style="color: #333; margin: 0;">{{companyName}}</h1>
      <p style="color: #666; margin: 5px 0;">{{companyAddress}}</p>
      <p style="color: #666; margin: 5px 0;">CNPJ: {{companyCnpj}} | Tel: {{companyPhone}}</p>
    </div>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="text-align: center; margin: 0; color: #333;">RECIBO Nº {{receiptNumber}}</h2>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Data:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{date}} {{time}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Valor Pago:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 18px; font-weight: bold; color: #28a745;">R$ {{value}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Forma de Pagamento:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{paymentMethod}}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Descrição:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{description}}</td></tr>
    </table>
    <div style="background: #fffbcc; border: 1px solid #f0e68c; padding: 10px; border-radius: 5px; margin-top: 20px;">
      <p style="margin: 0; font-size: 12px; color: #666;"><strong>ATENÇÃO:</strong> Recibo sem validade fiscal.</p>
    </div>
  </body></html>',
  'RECIBO #{{receiptNumber}} - {{companyName}}\nData: {{date}}\nValor: R$ {{value}}\nPgto: {{paymentMethod}}\nDescrição: {{description}}'
);

-- Comments
COMMENT ON TABLE receipt_templates IS 'Stores customizable receipt templates for different receipt types';
COMMENT ON COLUMN receipt_templates.template_type IS 'Type of receipt: parking_ticket, monthly_payment, general_receipt';
COMMENT ON COLUMN receipt_templates.layout IS 'JSON configuration for template layout and styling';
COMMENT ON COLUMN receipt_templates.custom_fields IS 'Array of custom field definitions specific to this template';
COMMENT ON COLUMN receipt_templates.qr_code_data IS 'Template string for QR code content using variables';
COMMENT ON COLUMN receipt_templates.barcode_data IS 'Template string for barcode content';
COMMENT ON COLUMN receipt_templates.available_variables IS 'List of variables that can be used in this template type';
