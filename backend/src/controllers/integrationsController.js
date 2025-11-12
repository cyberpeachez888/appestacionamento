import { supabase } from '../config/supabase.js';
import { 
  sendEmail, 
  sendSMS, 
  sendWhatsApp, 
  queueNotification, 
  processNotificationQueue 
} from '../services/notificationService.js';
import {
  createWebhook,
  updateWebhook,
  deleteWebhook,
  listWebhooks,
  getWebhookLogs,
  testWebhook
} from '../services/webhookService.js';

const INTEGRATIONS_TABLE = 'integration_configs';
const EMAIL_TEMPLATES_TABLE = 'email_templates';
const SMS_TEMPLATES_TABLE = 'sms_templates';

// ===== INTEGRATION CONFIG ENDPOINTS =====

export default {
  // Get all integration configurations
  async getConfigs(req, res) {
    try {
      const { data, error } = await supabase
        .from(INTEGRATIONS_TABLE)
        .select('id, integration_type, is_enabled, config, created_at, updated_at')
        .order('integration_type');
      
      if (error) throw error;
      
      // Don't send credentials to frontend
      res.json(data);
    } catch (err) {
      console.error('Get integration configs error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Get specific integration config
  async getConfig(req, res) {
    try {
      const { type } = req.params;
      
      const { data, error } = await supabase
        .from(INTEGRATIONS_TABLE)
        .select('id, integration_type, is_enabled, config, created_at, updated_at')
        .eq('integration_type', type)
        .single();
      
      if (error) throw error;
      
      res.json(data);
    } catch (err) {
      console.error('Get integration config error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Update integration configuration
  async updateConfig(req, res) {
    try {
      const { type } = req.params;
      const { is_enabled, config, credentials } = req.body;
      
      const updates = {
        updated_at: new Date().toISOString()
      };
      
      if (is_enabled !== undefined) updates.is_enabled = is_enabled;
      if (config) updates.config = config;
      if (credentials) updates.credentials = credentials;
      
      const { data, error } = await supabase
        .from(INTEGRATIONS_TABLE)
        .update(updates)
        .eq('integration_type', type)
        .select('id, integration_type, is_enabled, config, created_at, updated_at')
        .single();
      
      if (error) throw error;
      
      res.json(data);
    } catch (err) {
      console.error('Update integration config error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Test integration
  async testIntegration(req, res) {
    try {
      const { type } = req.params;
      const body = req.body || {};
      const recipient = body.recipient || body.to;
      
      if (!recipient) {
        return res.status(400).json({ error: 'Recipient is required for testing' });
      }
      
      let result;
      const normalizedType = (type || '').toLowerCase();
      const effectiveType = normalizedType === 'email' ? 'smtp' : normalizedType;
      
      if (effectiveType === 'smtp') {
        result = await sendEmail({
          to: recipient,
          subject: 'Test Email - AppEstacionamento',
          html: '<h1>Test Email</h1><p>This is a test email from AppEstacionamento.</p>',
          text: 'Test Email - This is a test email from AppEstacionamento.'
        });
      } else if (effectiveType === 'sms') {
        result = await sendSMS({
          to: recipient,
          message: 'Test SMS from AppEstacionamento'
        });
      } else if (effectiveType === 'whatsapp') {
        result = await sendWhatsApp({
          to: recipient,
          message: 'Test WhatsApp message from AppEstacionamento'
        });
      } else {
        return res.status(400).json({ error: 'Invalid integration type' });
      }
      
      res.json({ success: true, result });
    } catch (err) {
      console.error('Test integration error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== EMAIL TEMPLATES =====

  async getEmailTemplates(req, res) {
    try {
      const { data, error } = await supabase
        .from(EMAIL_TEMPLATES_TABLE)
        .select('*')
        .order('template_name');
      
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Get email templates error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async updateEmailTemplate(req, res) {
    try {
      const { id } = req.params;
      const { subject, html_body, text_body, is_active } = req.body;
      
      const { data, error } = await supabase
        .from(EMAIL_TEMPLATES_TABLE)
        .update({
          subject,
          html_body,
          text_body,
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Update email template error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== SMS TEMPLATES =====

  async getSMSTemplates(req, res) {
    try {
      const { data, error } = await supabase
        .from(SMS_TEMPLATES_TABLE)
        .select('*')
        .order('template_name');
      
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Get SMS templates error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async updateSMSTemplate(req, res) {
    try {
      const { id } = req.params;
      const { message, is_active } = req.body;
      
      const { data, error } = await supabase
        .from(SMS_TEMPLATES_TABLE)
        .update({
          message,
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Update SMS template error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== NOTIFICATION QUEUE =====

  async queueNotification(req, res) {
    try {
      const { type, recipient, message, subject, templateName, templateData, scheduledFor } = req.body;
      
      const result = await queueNotification({
        type,
        recipient,
        message,
        subject,
        templateName,
        templateData,
        scheduledFor
      });
      
      res.json(result);
    } catch (err) {
      console.error('Queue notification error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async processQueue(req, res) {
    try {
      const result = await processNotificationQueue();
      res.json(result);
    } catch (err) {
      console.error('Process queue error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async getNotificationLogs(req, res) {
    try {
      const { limit = 100, type } = req.query;
      
      let query = supabase
        .from('notification_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(parseInt(limit));
      
      if (type) {
        query = query.eq('notification_type', type);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Get notification logs error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // ===== WEBHOOKS =====

  async listWebhooks(req, res) {
    try {
      const webhooks = await listWebhooks();
      res.json(webhooks);
    } catch (err) {
      console.error('List webhooks error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async createWebhook(req, res) {
    try {
      const webhookData = req.body;
      const webhook = await createWebhook(webhookData);
      res.json(webhook);
    } catch (err) {
      console.error('Create webhook error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async updateWebhook(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const webhook = await updateWebhook(id, updates);
      res.json(webhook);
    } catch (err) {
      console.error('Update webhook error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async deleteWebhook(req, res) {
    try {
      const { id } = req.params;
      await deleteWebhook(id);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete webhook error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async getWebhookLogs(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;
      
      const logs = await getWebhookLogs(id, parseInt(limit));
      res.json(logs);
    } catch (err) {
      console.error('Get webhook logs error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  async testWebhook(req, res) {
    try {
      const { id } = req.params;
      const result = await testWebhook(id);
      res.json(result);
    } catch (err) {
      console.error('Test webhook error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};
