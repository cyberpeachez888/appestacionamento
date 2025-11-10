import { supabase } from '../config/supabase.js';
import crypto from 'crypto';

// ===== WEBHOOK MANAGEMENT =====

export async function getActiveWebhooks(eventType) {
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('is_active', true)
    .contains('events', [eventType]);
  
  if (error) {
    console.error('Get webhooks error:', error);
    return [];
  }
  
  return data || [];
}

export async function triggerWebhook(eventType, payload) {
  const webhooks = await getActiveWebhooks(eventType);
  
  if (webhooks.length === 0) {
    return { triggered: 0, succeeded: 0, failed: 0 };
  }
  
  let succeeded = 0;
  let failed = 0;
  
  for (const webhook of webhooks) {
    try {
      await sendWebhookRequest(webhook, eventType, payload);
      succeeded++;
    } catch (error) {
      console.error(`Webhook ${webhook.id} failed:`, error);
      failed++;
      
      // Increment failure count
      await supabase
        .from('webhook_endpoints')
        .update({
          failure_count: webhook.failure_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', webhook.id);
    }
  }
  
  return { triggered: webhooks.length, succeeded, failed };
}

async function sendWebhookRequest(webhook, eventType, payload) {
  const startTime = Date.now();
  
  try {
    // Prepare payload
    const webhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload
    };
    
    // Generate signature if secret key is configured
    let signature;
    if (webhook.secret_key) {
      signature = generateSignature(webhook.secret_key, webhookPayload);
    }
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'AppEstacionamento-Webhook/1.0',
      'X-Webhook-Event': eventType,
      'X-Webhook-Timestamp': webhookPayload.timestamp,
      ...webhook.headers
    };
    
    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }
    
    // Send request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), webhook.timeout_seconds * 1000);
    
    const response = await fetch(webhook.url, {
      method: webhook.method,
      headers,
      body: JSON.stringify(webhookPayload),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    const duration = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');
    
    // Log delivery
    await logWebhookDelivery({
      webhook_id: webhook.id,
      event_type: eventType,
      payload: webhookPayload,
      request_headers: headers,
      response_status: response.status,
      response_body: responseBody.substring(0, 1000), // Limit storage
      success: response.ok,
      retry_count: 0,
      duration_ms: duration
    });
    
    // Update last triggered
    await supabase
      .from('webhook_endpoints')
      .update({
        last_triggered_at: new Date().toISOString(),
        failure_count: response.ok ? 0 : webhook.failure_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', webhook.id);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseBody}`);
    }
    
    return { success: true, status: response.status };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log failure
    await logWebhookDelivery({
      webhook_id: webhook.id,
      event_type: eventType,
      payload: { event: eventType, data: payload },
      request_headers: webhook.headers,
      response_status: null,
      response_body: null,
      success: false,
      retry_count: 0,
      error_message: error.message,
      duration_ms: duration
    });
    
    // Retry if configured
    if (webhook.retry_on_failure && webhook.max_retries > 0) {
      // Queue for retry (could be implemented with a job queue)
      console.log(`Webhook ${webhook.id} will be retried`);
    }
    
    throw error;
  }
}

function generateSignature(secretKey, payload) {
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

async function logWebhookDelivery(log) {
  await supabase
    .from('webhook_logs')
    .insert(log);
}

// ===== WEBHOOK EVENTS =====

// Vehicle entry event
export async function triggerVehicleEntry(vehicle) {
  return await triggerWebhook('vehicle.entry', {
    vehicle_id: vehicle.id,
    plate: vehicle.plate,
    vehicle_type: vehicle.vehicleType,
    entry_date: vehicle.entryDate,
    entry_time: vehicle.entryTime,
    rate_id: vehicle.rateId
  });
}

// Vehicle exit event
export async function triggerVehicleExit(vehicle, payment) {
  return await triggerWebhook('vehicle.exit', {
    vehicle_id: vehicle.id,
    plate: vehicle.plate,
    vehicle_type: vehicle.vehicleType,
    entry_date: vehicle.entryDate,
    entry_time: vehicle.entryTime,
    exit_date: vehicle.exitDate,
    exit_time: vehicle.exitTime,
    total_value: vehicle.totalValue,
    payment_method: vehicle.paymentMethod,
    duration_minutes: calculateDuration(vehicle)
  });
}

// Payment received event
export async function triggerPaymentReceived(payment, customer) {
  return await triggerWebhook('payment.received', {
    payment_id: payment.id,
    customer_id: customer?.id,
    customer_name: customer?.name,
    value: payment.value,
    method: payment.method,
    receipt_number: payment.receiptNumber,
    date: payment.date
  });
}

// Monthly customer created
export async function triggerMonthlyCustomerCreated(customer) {
  return await triggerWebhook('monthly_customer.created', {
    customer_id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    plates: customer.plates,
    value: customer.value,
    contract_date: customer.contractDate,
    due_date: customer.dueDate
  });
}

// Monthly payment due reminder
export async function triggerPaymentDueReminder(customer) {
  return await triggerWebhook('payment.due_reminder', {
    customer_id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    due_date: customer.dueDate,
    value: customer.value,
    days_overdue: Math.ceil((new Date() - new Date(customer.dueDate)) / (1000 * 60 * 60 * 24))
  });
}

// Cash register opened
export async function triggerCashRegisterOpened(data) {
  return await triggerWebhook('cash_register.opened', {
    user_id: data.userId,
    user_name: data.userName,
    opening_balance: data.openingBalance,
    opened_at: data.openedAt
  });
}

// Cash register closed
export async function triggerCashRegisterClosed(data) {
  return await triggerWebhook('cash_register.closed', {
    user_id: data.userId,
    user_name: data.userName,
    opening_balance: data.openingBalance,
    closing_balance: data.closingBalance,
    total_revenue: data.totalRevenue,
    opened_at: data.openedAt,
    closed_at: data.closedAt
  });
}

// Helper function
function calculateDuration(vehicle) {
  if (!vehicle.exitDate || !vehicle.exitTime) return null;
  
  const entry = new Date(`${vehicle.entryDate}T${vehicle.entryTime}`);
  const exit = new Date(`${vehicle.exitDate}T${vehicle.exitTime}`);
  
  return Math.round((exit - entry) / (1000 * 60)); // minutes
}

// ===== WEBHOOK CRUD OPERATIONS (for admin management) =====

export async function createWebhook(webhookData) {
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .insert(webhookData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateWebhook(webhookId, updates) {
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', webhookId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteWebhook(webhookId) {
  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', webhookId);
  
  if (error) throw error;
}

export async function listWebhooks() {
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getWebhookLogs(webhookId, limit = 50) {
  const query = supabase
    .from('webhook_logs')
    .select('*')
    .order('triggered_at', { ascending: false })
    .limit(limit);
  
  if (webhookId) {
    query.eq('webhook_id', webhookId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function testWebhook(webhookId) {
  const { data: webhook, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('id', webhookId)
    .single();
  
  if (error || !webhook) {
    throw new Error('Webhook not found');
  }
  
  const testPayload = {
    test: true,
    message: 'This is a test webhook delivery',
    timestamp: new Date().toISOString()
  };
  
  await sendWebhookRequest(webhook, 'test.webhook', testPayload);
  
  return { success: true, message: 'Test webhook sent' };
}
