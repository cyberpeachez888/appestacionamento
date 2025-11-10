#!/usr/bin/env node

/**
 * Create Test Report for Export Testing
 * Directly inserts a test report for November 2025
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuid } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function createTestReport() {
  console.log('\n📝 Creating test report for November 2025...\n');

  try {
    const testReport = {
      id: uuid(),
      report_month: 11,
      report_year: 2025,
      company_name: 'Estacionamento Teste',
      operator_name: 'Operador Teste',
      total_revenue: 885.00,
      avulsos_revenue: 85.00,
      mensalistas_revenue: 800.00,
      cash_total: 400.00,
      pix_total: 300.00,
      debit_card_total: 100.00,
      credit_card_total: 85.00,
      total_tickets: 3,
      tickets_closed: 3,
      monthly_customers_count: 4,
      monthly_payments_count: 4,
      tickets_data: [],
      payments_data: [],
      monthly_customers_data: [],
      report_json: { test: true },
      status: 'completed'
    };

    const { data, error } = await supabase
      .from('monthly_reports')
      .insert(testReport)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating report:', error.message);
      return;
    }

    console.log('✅ Test report created successfully!');
    console.log(`   ID: ${data.id}`);
    console.log(`   Period: ${data.report_month}/${data.report_year}`);
    console.log(`   Revenue: R$ ${data.total_revenue}\n`);

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

createTestReport();
