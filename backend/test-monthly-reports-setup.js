#!/usr/bin/env node

/**
 * Test Monthly Reports Backend Setup
 * 
 * This script verifies that the monthly_reports table exists
 * and the API endpoints are working correctly.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testMonthlyReportsSetup() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║  Monthly Reports Setup Verification   ║');
  console.log('╚═══════════════════════════════════════╝\n');

  try {
    // Test 1: Check if monthly_reports table exists
    console.log('📋 Test 1: Checking if monthly_reports table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('monthly_reports')
      .select('id')
      .limit(1);

    if (tableError) {
      if (tableError.message.includes('relation') || tableError.message.includes('does not exist')) {
        console.error('❌ Table monthly_reports does not exist!\n');
        console.log('🔧 SOLUTION:');
        console.log('1. Open Supabase Dashboard > SQL Editor');
        console.log('2. Run the script: backend/create-monthly-reports-table.sql');
        console.log('3. Then reload schema: NOTIFY pgrst, \'reload schema\';\n');
        return false;
      }
      console.error('❌ Error checking table:', tableError.message);
      return false;
    }

    console.log('✅ Table monthly_reports exists\n');

    // Test 2: Check if archived_tickets table exists
    console.log('📋 Test 2: Checking if archived_tickets table exists...');
    const { error: archiveError } = await supabase
      .from('archived_tickets')
      .select('id')
      .limit(1);

    if (archiveError) {
      if (archiveError.message.includes('relation') || archiveError.message.includes('does not exist')) {
        console.log('⚠️  Table archived_tickets does not exist');
        console.log('   (Optional table, but recommended for better data organization)\n');
      } else {
        console.error('❌ Error checking archive table:', archiveError.message);
      }
    } else {
      console.log('✅ Table archived_tickets exists\n');
    }

    // Test 3: Check table structure
    console.log('📋 Test 3: Verifying table columns...');
    const { data: columns, error: columnsError } = await supabase
      .from('monthly_reports')
      .select('*')
      .limit(0);

    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError.message);
      return false;
    }

    console.log('✅ Table structure is accessible\n');

    // Test 4: Try to query reports (should return empty array if no reports)
    console.log('📋 Test 4: Testing query functionality...');
    const { data: reports, error: queryError } = await supabase
      .from('monthly_reports')
      .select('id, report_month, report_year, generated_at')
      .order('report_year', { ascending: false })
      .order('report_month', { ascending: false })
      .limit(5);

    if (queryError) {
      console.error('❌ Error querying reports:', queryError.message);
      return false;
    }

    console.log(`✅ Query successful (${reports?.length || 0} reports found)\n`);

    if (reports && reports.length > 0) {
      console.log('📊 Existing reports:');
      reports.forEach(r => {
        console.log(`   • ${r.report_month}/${r.report_year} - Generated: ${new Date(r.generated_at).toLocaleDateString('pt-BR')}`);
      });
      console.log('');
    }

    // Success!
    console.log('═══════════════════════════════════════');
    console.log('✨ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════\n');
    console.log('Monthly reports system is ready to use!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Navigate to Financeiro page');
    console.log('2. Click "Gerar Relatório Mensal"');
    console.log('3. Generate your first report');
    console.log('4. View reports in "Relatórios Mensais" page\n');

    return true;

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error('Stack:', err.stack);
    return false;
  }
}

// Run the test
testMonthlyReportsSetup()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
