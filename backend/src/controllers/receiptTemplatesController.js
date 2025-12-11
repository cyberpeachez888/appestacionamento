import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../services/auditLogger.js';

const table = 'receipt_templates';

// Transform snake_case to camelCase for frontend
function toFrontendFormat(template) {
  if (!template) return null;
  return {
    id: template.id,
    templateName: template.template_name,
    templateType: template.template_type,
    description: template.description,
    layout: template.layout,

    // Header
    showLogo: template.show_logo,
    showCompanyName: template.show_company_name,
    showCompanyDetails: template.show_company_details,
    headerText: template.header_text,

    // Body fields
    showReceiptNumber: template.show_receipt_number,
    showDate: template.show_date,
    showTime: template.show_time,
    showPlate: template.show_plate,
    showVehicleType: template.show_vehicle_type,
    showEntryTime: template.show_entry_time,
    showExitTime: template.show_exit_time,
    showDuration: template.show_duration,
    showRate: template.show_rate,
    showValue: template.show_value,
    showPaymentMethod: template.show_payment_method,
    showOperator: template.show_operator,

    // Custom fields
    customFields: template.custom_fields,

    // Footer
    showQrCode: template.show_qr_code,
    qrCodeData: template.qr_code_data,
    showBarcode: template.show_barcode,
    barcodeData: template.barcode_data,
    barcodeType: template.barcode_type,
    termsAndConditions: template.terms_and_conditions,
    footerText: template.footer_text,
    showSignatureLine: template.show_signature_line,

    // Styling
    primaryColor: template.primary_color,
    secondaryColor: template.secondary_color,
    fontFamily: template.font_family,

    // Email/WhatsApp
    emailSubject: template.email_subject,
    emailBodyHtml: template.email_body_html,
    emailBodyText: template.email_body_text,
    whatsappMessage: template.whatsapp_message,

    customTemplateText: template.custom_template_text,
    customTemplateTextEntry: template.custom_template_text_entry,
    customTemplateTextExit: template.custom_template_text_exit,

    availableVariables: template.available_variables,
    isDefault: template.is_default,
    isActive: template.is_active,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  };
}

// Transform camelCase to snake_case for database
function toDbFormat(template) {
  const db = {
    template_name: template.templateName,
    template_type: template.templateType,
    description: template.description,
    layout: template.layout,

    show_logo: template.showLogo,
    show_company_name: template.showCompanyName,
    show_company_details: template.showCompanyDetails,
    header_text: template.headerText,

    show_receipt_number: template.showReceiptNumber,
    show_date: template.showDate,
    show_time: template.showTime,
    show_plate: template.showPlate,
    show_vehicle_type: template.showVehicleType,
    show_entry_time: template.showEntryTime,
    show_exit_time: template.showExitTime,
    show_duration: template.showDuration,
    show_rate: template.showRate,
    show_value: template.showValue,
    show_payment_method: template.showPaymentMethod,
    show_operator: template.showOperator,

    custom_fields: template.customFields,

    show_qr_code: template.showQrCode,
    qr_code_data: template.qrCodeData,
    show_barcode: template.showBarcode,
    barcode_data: template.barcodeData,
    barcode_type: template.barcodeType,
    terms_and_conditions: template.termsAndConditions,
    footer_text: template.footerText,
    show_signature_line: template.showSignatureLine,

    primary_color: template.primaryColor,
    secondary_color: template.secondaryColor,
    font_family: template.fontFamily,

    email_subject: template.emailSubject,
    email_body_html: template.emailBodyHtml,
    email_body_text: template.emailBodyText,
    whatsapp_message: template.whatsappMessage,

    custom_template_text: template.customTemplateText,
    custom_template_text_entry: template.customTemplateTextEntry,
    custom_template_text_exit: template.customTemplateTextExit,

    available_variables: template.availableVariables,
    is_default: template.isDefault,
    is_active: template.isActive,
  };

  if (template.id) db.id = template.id;

  return db;
}

// Replace template variables with actual values
function renderTemplate(templateString, variables) {
  if (!templateString) return '';

  let result = templateString;
  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });

  return result;
}

export default {
  // List all templates or filter by type
  async list(req, res) {
    try {
      const { type, active } = req.query;
      let query = supabase.from(table).select('*');

      if (type) {
        query = query.eq('template_type', type);
      }

      if (active === 'true') {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('template_name');

      if (error) return res.status(500).json({ error });
      res.json(data.map(toFrontendFormat));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  // Get template by ID
  async getById(req, res) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (error) return res.status(404).json({ error: 'Template not found' });
      res.json(toFrontendFormat(data));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  // Get default template for a specific type
  async getDefault(req, res) {
    try {
      const { type } = req.params; // parking_ticket, monthly_payment, general_receipt

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('template_type', type)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (error) {
        // If no default found, return any active template of this type
        const { data: fallback, error: fbError } = await supabase
          .from(table)
          .select('*')
          .eq('template_type', type)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (fbError) return res.status(404).json({ error: 'No template found for this type' });
        return res.json(toFrontendFormat(fallback));
      }

      res.json(toFrontendFormat(data));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  // Create new template
  async create(req, res) {
    try {
      const payload = toDbFormat(req.body);

      // Validação básica
      if (!payload.template_name || !payload.template_type) {
        return res.status(400).json({ error: 'Nome e tipo do template são obrigatórios' });
      }

      if (!payload.template_name.trim() || !payload.template_type.trim()) {
        return res.status(400).json({ error: 'Nome e tipo do template não podem estar vazios' });
      }

      payload.id = uuid();

      // If setting as default, unset other defaults for this type
      if (payload.is_default) {
        await supabase
          .from(table)
          .update({ is_default: false })
          .eq('template_type', payload.template_type);
      }

      const { data, error } = await supabase.from(table).insert(payload).select().single();

      if (error) return res.status(500).json({ error });

      await logEvent({
        actor: req.user,
        action: 'receipt_template.create',
        targetType: 'receipt_template',
        targetId: data.id,
        details: { templateName: data.template_name, templateType: data.template_type },
      });

      res.status(201).json(toFrontendFormat(data));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  // Update template
  async update(req, res) {
    try {
      const { id } = req.params;
      const payload = toDbFormat(req.body);

      // Validação básica
      if (payload.template_name !== undefined && !payload.template_name.trim()) {
        return res.status(400).json({ error: 'Nome do template não pode estar vazio' });
      }

      if (payload.template_type !== undefined && !payload.template_type.trim()) {
        return res.status(400).json({ error: 'Tipo do template não pode estar vazio' });
      }

      delete payload.id; // Don't update ID
      payload.updated_at = new Date().toISOString();

      // If setting as default, unset other defaults for this type
      if (payload.is_default) {
        await supabase
          .from(table)
          .update({ is_default: false })
          .eq('template_type', payload.template_type)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ error });

      await logEvent({
        actor: req.user,
        action: 'receipt_template.update',
        targetType: 'receipt_template',
        targetId: id,
        details: { templateName: data.template_name },
      });

      res.json(toFrontendFormat(data));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  // Delete template
  async delete(req, res) {
    try {
      const { id } = req.params;

      // Check if it's the default template
      const { data: existing } = await supabase
        .from(table)
        .select('is_default, template_type, template_name')
        .eq('id', id)
        .single();

      if (existing?.is_default) {
        return res.status(400).json({
          error: 'Cannot delete default template. Set another template as default first.',
        });
      }

      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) return res.status(500).json({ error });

      await logEvent({
        actor: req.user,
        action: 'receipt_template.delete',
        targetType: 'receipt_template',
        targetId: id,
        details: { templateName: existing?.template_name },
      });

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  // Set template as default for its type
  async setDefault(req, res) {
    try {
      const { id } = req.params;

      // Get template type
      const { data: template } = await supabase
        .from(table)
        .select('template_type')
        .eq('id', id)
        .single();

      if (!template) return res.status(404).json({ error: 'Template not found' });

      // Unset all defaults for this type
      await supabase
        .from(table)
        .update({ is_default: false })
        .eq('template_type', template.template_type);

      // Set this as default
      const { data, error } = await supabase
        .from(table)
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ error });

      await logEvent({
        actor: req.user,
        action: 'receipt_template.set_default',
        targetType: 'receipt_template',
        targetId: id,
      });

      res.json(toFrontendFormat(data));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  // Render template with provided data (for preview)
  async preview(req, res) {
    try {
      const { id } = req.params;
      const variables = req.body; // Object with variable values

      const { data: template, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) return res.status(404).json({ error: 'Template not found' });

      const rendered = {
        emailSubject: renderTemplate(template.email_subject, variables),
        emailBodyHtml: renderTemplate(template.email_body_html, variables),
        emailBodyText: renderTemplate(template.email_body_text, variables),
        whatsappMessage: renderTemplate(template.whatsapp_message, variables),
        qrCodeData: renderTemplate(template.qr_code_data, variables),
        barcodeData: renderTemplate(template.barcode_data, variables),
      };

      res.json(rendered);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  // Clone/duplicate template
  async clone(req, res) {
    try {
      const { id } = req.params;

      const { data: original, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) return res.status(404).json({ error: 'Template not found' });

      // Create clone
      const clone = { ...original };
      delete clone.id;
      delete clone.created_at;
      delete clone.updated_at;
      clone.template_name = `${original.template_name} (Cópia)`;
      clone.is_default = false;
      clone.id = uuid();

      const { data: newTemplate, error: createError } = await supabase
        .from(table)
        .insert(clone)
        .select()
        .single();

      if (createError) return res.status(500).json({ error: createError });

      await logEvent({
        actor: req.user,
        action: 'receipt_template.clone',
        targetType: 'receipt_template',
        targetId: newTemplate.id,
        details: { originalId: id },
      });

      res.status(201).json(toFrontendFormat(newTemplate));
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },
};
