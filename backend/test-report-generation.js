#!/usr/bin/env node

/**
 * Test Monthly Report Generation
 * Simulates clicking the "Gerar Relatório Mensal" button
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testReportGeneration() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║  Test Monthly Report Generation       ║');
  console.log('╚═══════════════════════════════════════╝\n');

  try {
    // Step 1: Check if table exists and is accessible
    console.log('📋 Step 1: Verifying monthly_reports table...');
    const { data: tableTest, error: tableError } = await supabase
      .from('monthly_reports')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ Table error:', tableError.message);
      console.log('\n🔧 SOLUTION: Run in Supabase SQL Editor:');
      console.log('   NOTIFY pgrst, \'reload schema\';\n');
      return false;
    }
    console.log('✅ Table is accessible\n');

    // Step 2: Try to insert a test report
    console.log('📋 Step 2: Testing INSERT operation...');
    
    const testReportId = '00000000-0000-0000-0000-000000000001';
    const now = new Date();
    const testMonth = 1; // January
    const testYear = 2000; // Use year 2000 to avoid conflicts
    
    const testReport = {
      id: testReportId,
      report_month: testMonth,
      report_year: testYear,
      company_name: 'Test Company',
      operator_name: 'Test Operator',
      total_revenue: 1000,
      avulsos_revenue: 600,
      mensalistas_revenue: 400,
      cash_total: 500,
      pix_total: 300,
      debit_card_total: 100,
      credit_card_total: 100,
      total_tickets: 10,
      tickets_closed: 8,
      monthly_customers_count: 5,
      monthly_payments_count: 5,
      tickets_data: [],
      payments_data: [],
      monthly_customers_data: [],
      report_json: { test: true },
      status: 'completed'
    };

    const { data: insertedReport, error: insertError } = await supabase
      .from('monthly_reports')
      .insert(testReport)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError.message);
      console.error('   Code:', insertError.code);
      console.error('   Details:', insertError.details);
      
      if (insertError.message.includes('schema cache') || insertError.code === '42P01') {
        console.log('\n🔧 SOLUTION: Schema cache needs reload!');
        console.log('   Run in Supabase SQL Editor:');
        console.log('   NOTIFY pgrst, \'reload schema\';\n');
      }
      return false;
    }
    
    console.log('✅ INSERT successful!\n');

    // Step 3: Test SELECT
    console.log('📋 Step 3: Testing SELECT operation...');
    const { data: selectedReport, error: selectError } = await supabase
      .from('monthly_reports')
      .select('*')
      .eq('id', testReportId)
      .single();

    if (selectError) {
      console.error('❌ Select error:', selectError.message);
      return false;
    }
    
    console.log('✅ SELECT successful!\n');

    // Step 4: Clean up test data
    console.log('📋 Step 4: Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('monthly_reports')
      .delete()
      .eq('id', testReportId);

    if (deleteError) {
      console.log('⚠️  Warning: Could not delete test data:', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up\n');
    }

    // Success!
    console.log('═══════════════════════════════════════');
    console.log('✨ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════\n');
    console.log('The monthly_reports table is working correctly!');
    console.log('');
    console.log('You can now:');
    console.log('1. Go to Financeiro page');
    console.log('2. Click "Gerar Relatório Mensal"');
    console.log('3. Generate a real report\n');

    return true;

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error('Stack:', err.stack);
    return false;
  }
}

// Run the test
testReportGeneration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
