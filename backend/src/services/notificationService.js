import { supabase } from '../config/supabase.js';
import nodemailer from 'nodemailer';

// Template variable replacement
function renderTemplate(template, variables) {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, value || '');
  }
  return rendered;
}

// ===== EMAIL NOTIFICATIONS =====

async function getEmailConfig() {
  const { data, error } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('integration_type', 'smtp')
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    throw new Error('SMTP not configured or disabled');
  }

  return data;
}

async function getEmailTemplate(templateName) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_name', templateName)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error(`Email template '${templateName}' not found`);
  }

  return data;
}

export async function sendEmail({ to, subject, html, text, templateName, templateData }) {
  try {
    // Get SMTP configuration
    const config = await getEmailConfig();
    const smtpConfig = config?.config || {};
    const credentials = config?.credentials || {};
    const { host, port, secure, from_email, from_name } = smtpConfig;
    const { user, pass } = credentials;

    if (!host || !from_email) {
      throw new Error('Configuração SMTP incompleta');
    }

    if (!user || !pass) {
      throw new Error('SMTP credentials not configured');
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    // If template is specified, render it
    let finalSubject = subject;
    let finalHtml = html;
    let finalText = text;

    if (templateName && templateData) {
      const template = await getEmailTemplate(templateName);
      finalSubject = renderTemplate(template.subject, templateData);
      finalHtml = renderTemplate(template.html_body, templateData);
      finalText = template.text_body ? renderTemplate(template.text_body, templateData) : undefined;
    }

    // Send email
    const info = await transporter.sendMail({
      from: `"${from_name}" <${from_email}>`,
      to,
      subject: finalSubject,
      html: finalHtml,
      text: finalText,
    });

    // Log success
    await logNotification({
      notification_type: 'email',
      recipient: to,
      subject: finalSubject,
      message_preview: finalText?.substring(0, 100) || finalHtml?.substring(0, 100),
      status: 'sent',
      provider_response: { messageId: info.messageId },
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);

    // Log failure
    await logNotification({
      notification_type: 'email',
      recipient: to,
      subject,
      message_preview: text?.substring(0, 100) || html?.substring(0, 100),
      status: 'failed',
      provider_response: { error: error.message },
    });

    throw error;
  }
}

// ===== SMS NOTIFICATIONS =====

async function getSMSConfig() {
  const { data, error } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('integration_type', 'sms')
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    throw new Error('SMS not configured or disabled');
  }

  return data;
}

async function getSMSTemplate(templateName) {
  const { data, error } = await supabase
    .from('sms_templates')
    .select('*')
    .eq('template_name', templateName)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error(`SMS template '${templateName}' not found`);
  }

  return data;
}

export async function sendSMS({ to, message, templateName, templateData }) {
  try {
    const config = await getSMSConfig();
    const { provider } = config.config;
    const credentials = config.credentials || {};

    let finalMessage = message;

    // Render template if specified
    if (templateName && templateData) {
      const template = await getSMSTemplate(templateName);
      finalMessage = renderTemplate(template.message, templateData);
    }

    // Send via provider
    let result;
    if (provider === 'twilio') {
      result = await sendSMS_Twilio(to, finalMessage, credentials);
    } else {
      throw new Error(`Unsupported SMS provider: ${provider}`);
    }

    // Log success
    await logNotification({
      notification_type: 'sms',
      recipient: to,
      message_preview: finalMessage.substring(0, 100),
      status: 'sent',
      provider_response: result,
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('SMS send error:', error);

    // Log failure
    await logNotification({
      notification_type: 'sms',
      recipient: to,
      message_preview: message?.substring(0, 100),
      status: 'failed',
      provider_response: { error: error.message },
    });

    throw error;
  }
}

async function sendSMS_Twilio(to, message, credentials) {
  const { accountSid, authToken, fromNumber } = credentials;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials incomplete');
  }

  // Twilio API call (using fetch instead of SDK to avoid extra dependency)
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: message,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Twilio API error');
  }

  const data = await response.json();
  return { sid: data.sid, status: data.status };
}

// ===== WHATSAPP NOTIFICATIONS =====

async function getWhatsAppConfig() {
  const { data, error } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('integration_type', 'whatsapp')
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    throw new Error('WhatsApp not configured or disabled');
  }

  return data;
}

export async function sendWhatsApp({ to, message, templateName, templateData }) {
  try {
    const config = await getWhatsAppConfig();
    const { provider } = config.config;
    const credentials = config.credentials || {};

    let finalMessage = message;

    // Render SMS template for WhatsApp (can reuse SMS templates)
    if (templateName && templateData) {
      const template = await getSMSTemplate(templateName);
      finalMessage = renderTemplate(template.message, templateData);
    }

    // Send via provider
    let result;
    if (provider === 'twilio') {
      result = await sendWhatsApp_Twilio(to, finalMessage, credentials);
    } else {
      throw new Error(`Unsupported WhatsApp provider: ${provider}`);
    }

    // Log success
    await logNotification({
      notification_type: 'whatsapp',
      recipient: to,
      message_preview: finalMessage.substring(0, 100),
      status: 'sent',
      provider_response: result,
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('WhatsApp send error:', error);

    // Log failure
    await logNotification({
      notification_type: 'whatsapp',
      recipient: to,
      message_preview: message?.substring(0, 100),
      status: 'failed',
      provider_response: { error: error.message },
    });

    throw error;
  }
}

async function sendWhatsApp_Twilio(to, message, credentials) {
  const { accountSid, authToken, fromNumber } = credentials;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio WhatsApp credentials incomplete');
  }

  // Ensure WhatsApp format (whatsapp:+number)
  const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const whatsappFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: whatsappTo,
      From: whatsappFrom,
      Body: message,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Twilio WhatsApp API error');
  }

  const data = await response.json();
  return { sid: data.sid, status: data.status };
}

// ===== NOTIFICATION QUEUE =====

export async function queueNotification({
  type,
  recipient,
  message,
  subject,
  templateName,
  templateData,
  scheduledFor,
}) {
  const { data, error } = await supabase
    .from('notification_queue')
    .insert({
      notification_type: type,
      recipient,
      subject,
      message,
      template_name: templateName,
      template_data: templateData,
      scheduled_for: scheduledFor || new Date().toISOString(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Queue notification error:', error);
    throw error;
  }

  return data;
}

export async function processNotificationQueue() {
  // Get pending notifications scheduled for now or earlier
  const now = new Date().toISOString();
  const { data: notifications, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .limit(100);

  if (error) {
    console.error('Notification queue fetch error:', error);
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const queue = (notifications || []).filter((item) => {
    const maxRetries = Number(item.max_retries) || 3;
    const retryCount = Number(item.retry_count) || 0;
    return retryCount < maxRetries;
  });

  if (queue.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const notification of queue) {
    // Mark as processing
    await supabase
      .from('notification_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', notification.id);

    try {
      // Send notification based on type
      if (notification.notification_type === 'email') {
        await sendEmail({
          to: notification.recipient,
          subject: notification.subject,
          html: notification.message,
          templateName: notification.template_name,
          templateData: notification.template_data,
        });
      } else if (notification.notification_type === 'sms') {
        await sendSMS({
          to: notification.recipient,
          message: notification.message,
          templateName: notification.template_name,
          templateData: notification.template_data,
        });
      } else if (notification.notification_type === 'whatsapp') {
        await sendWhatsApp({
          to: notification.recipient,
          message: notification.message,
          templateName: notification.template_name,
          templateData: notification.template_data,
        });
      }

      // Mark as sent
      await supabase
        .from('notification_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', notification.id);

      succeeded++;
    } catch (error) {
      console.error(`Notification ${notification.id} failed:`, error);

      // Increment retry count or mark as failed
      const previousRetryCount = Number(notification.retry_count) || 0;
      const newRetryCount = previousRetryCount + 1;
      const maxRetries = Number(notification.max_retries) || 3;
      const newStatus = newRetryCount >= maxRetries ? 'failed' : 'pending';

      await supabase
        .from('notification_queue')
        .update({
          status: newStatus,
          retry_count: newRetryCount,
          error_message: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notification.id);

      failed++;
    }
  }

  return { processed: queue.length, succeeded, failed };
}

// ===== LOGGING =====

async function logNotification({
  notification_type,
  recipient,
  subject,
  message_preview,
  status,
  provider_response,
}) {
  await supabase.from('notification_logs').insert({
    notification_type,
    recipient,
    subject,
    message_preview,
    status,
    provider_response,
  });
}

// ===== HELPER FUNCTIONS =====

export async function sendReceipt({ email, phone, receiptData, companyData }) {
  const templateData = {
    receiptNumber: receiptData.receiptNumber,
    date: receiptData.date,
    plate: receiptData.plate,
    value: receiptData.value,
    paymentMethod: receiptData.paymentMethod,
    companyName: companyData.name,
    companyAddress: companyData.address,
  };

  const results = [];

  // Send email if configured and email provided
  if (email) {
    try {
      const emailConfig = await getEmailConfig();
      if (emailConfig?.is_enabled) {
        await sendEmail({
          to: email,
          templateName: 'receipt',
          templateData,
        });
        results.push({ type: 'email', success: true });
      }
    } catch (error) {
      results.push({ type: 'email', success: false, error: error.message });
    }
  }

  // Send WhatsApp if configured and phone provided
  if (phone) {
    try {
      const whatsappConfig = await getWhatsAppConfig();
      if (whatsappConfig?.is_enabled && whatsappConfig.config.send_receipts) {
        await sendWhatsApp({
          to: phone,
          templateName: 'payment_received',
          templateData,
        });
        results.push({ type: 'whatsapp', success: true });
      }
    } catch (error) {
      results.push({ type: 'whatsapp', success: false, error: error.message });
    }
  }

  return results;
}

export async function sendPaymentReminder({ email, phone, customerData, companyData }) {
  const templateData = {
    customerName: customerData.name,
    dueDate: customerData.dueDate,
    value: customerData.value,
    companyName: companyData.name,
    daysLeft: Math.ceil((new Date(customerData.dueDate) - new Date()) / (1000 * 60 * 60 * 24)),
  };

  const results = [];

  // Send email reminder
  if (email) {
    try {
      await sendEmail({
        to: email,
        templateName: 'monthly_reminder',
        templateData,
      });
      results.push({ type: 'email', success: true });
    } catch (error) {
      results.push({ type: 'email', success: false, error: error.message });
    }
  }

  // Send SMS reminder if configured
  if (phone) {
    try {
      const smsConfig = await getSMSConfig();
      if (smsConfig?.is_enabled && smsConfig.config.send_reminders) {
        await sendSMS({
          to: phone,
          templateName: 'monthly_due_reminder',
          templateData,
        });
        results.push({ type: 'sms', success: true });
      }
    } catch (error) {
      results.push({ type: 'sms', success: false, error: error.message });
    }
  }

  return results;
}
